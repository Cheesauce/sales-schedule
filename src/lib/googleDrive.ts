import { google } from "googleapis";
import { Readable } from "stream";
import { getConnectedAdmin, getAuthorizedClientForUser } from "@/lib/googleAuth";
import { requirementLabel } from "@/lib/supplierRequirements";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export class InvalidUploadError extends Error {}

/**
 * True when a Google API call failed because the connected admin's token
 * predates the Drive scope being added (e.g. they authenticated before
 * this feature existed, and only granted Calendar access). The fix is
 * always the same: that admin needs to sign out and sign back in so the
 * consent screen re-prompts for Drive access.
 */
export function isInsufficientScopeError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /insufficient.*(scope|permission)/i.test(message);
}

export const INSUFFICIENT_SCOPE_MESSAGE =
  "Google Drive access hasn't been granted yet. The connected admin needs to sign out and sign back in (Google will prompt for Drive permission the next time).";

export interface UploadableFile {
  requirementType: string;
  file: File;
}

export interface DriveFolderResult {
  folderId: string;
  folderUrl: string;
}

function validateFile(file: File) {
  if (file.size === 0) throw new InvalidUploadError(`"${file.name}" is empty.`);
  if (file.size > MAX_FILE_BYTES) throw new InvalidUploadError(`"${file.name}" is too large (max 15MB).`);
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new InvalidUploadError(`"${file.name}" has an unsupported file type: ${file.type || "unknown"}.`);
  }
}

async function getDriveClient() {
  const owner = await getConnectedAdmin();
  if (!owner) {
    throw new Error(
      "No admin has connected a Google account yet. Sign in as an admin and grant Drive access first."
    );
  }
  const authClient = await getAuthorizedClientForUser(owner);
  return google.drive({ version: "v3", auth: authClient });
}

async function uploadOne(drive: Awaited<ReturnType<typeof getDriveClient>>, folderId: string, item: UploadableFile) {
  validateFile(item.file);
  const buffer = Buffer.from(await item.file.arrayBuffer());
  await drive.files.create({
    requestBody: {
      name: `${requirementLabel(item.requirementType)} — ${item.file.name}`,
      parents: [folderId],
    },
    media: {
      mimeType: item.file.type || "application/octet-stream",
      body: Readable.from(buffer),
    },
    fields: "id",
  });
}

/**
 * Creates a new Drive folder for a supplier submission, uploads every
 * given file into it, and shares the folder with the given emails
 * (notifying them by email, same as a normal Drive share). Returns the
 * folder id (kept internally, to add more files later on edit) and its
 * shareable URL (shown to admin/supplier).
 */
export async function createSupplierDriveFolder(
  companyName: string,
  files: UploadableFile[],
  shareWithEmails: string[]
): Promise<DriveFolderResult> {
  const drive = await getDriveClient();

  const folder = await drive.files.create({
    requestBody: {
      name: `${companyName} — Supplier Documents`,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, webViewLink",
  });
  const folderId = folder.data.id;
  if (!folderId) throw new Error("Google Drive did not return a folder id.");

  for (const item of files) {
    await uploadOne(drive, folderId, item);
  }

  await shareSupplierDriveFolder(folderId, shareWithEmails, drive);

  const folderUrl = folder.data.webViewLink ?? `https://drive.google.com/drive/folders/${folderId}`;
  return { folderId, folderUrl };
}

/** Adds more files to an existing supplier folder (used when editing a submission). */
export async function addFilesToSupplierDriveFolder(folderId: string, files: UploadableFile[]): Promise<void> {
  if (files.length === 0) return;
  const drive = await getDriveClient();
  for (const item of files) {
    await uploadOne(drive, folderId, item);
  }
}

async function uploadOrReplace(
  drive: Awaited<ReturnType<typeof getDriveClient>>,
  folderId: string,
  name: string,
  mimeType: string,
  buffer: Buffer
) {
  const escapedName = name.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${folderId}' in parents and name = '${escapedName}' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });
  const fileId = existing.data.files?.[0]?.id;
  if (fileId) {
    await drive.files.update({
      fileId,
      media: { mimeType, body: Readable.from(buffer) },
    });
  } else {
    await drive.files.create({
      requestBody: { name, parents: [folderId] },
      media: { mimeType, body: Readable.from(buffer) },
      fields: "id",
    });
  }
}

/**
 * Uploads the submission's generated PDF into its Drive folder, replacing
 * any previous copy with the same name — so the folder always holds one
 * up-to-date "Supplier Information Form - <company>.pdf", not a pile of
 * stale ones from past edits. Best-effort: callers should not fail the
 * whole request if this throws (the submission itself already succeeded).
 */
export async function uploadSupplierPdfToDrive(folderId: string, fileName: string, pdfBuffer: Buffer): Promise<void> {
  const drive = await getDriveClient();
  await uploadOrReplace(drive, folderId, fileName, "application/pdf", pdfBuffer);
}

/** Shares the folder with each email (view access), notifying them by email. Safe to call repeatedly. */
export async function shareSupplierDriveFolder(
  folderId: string,
  emails: string[],
  drive?: Awaited<ReturnType<typeof getDriveClient>>
): Promise<void> {
  const client = drive ?? (await getDriveClient());
  const uniqueEmails = [...new Set(emails.filter(Boolean))];
  for (const email of uniqueEmails) {
    await client.permissions
      .create({
        fileId: folderId,
        sendNotificationEmail: true,
        requestBody: { type: "user", role: "reader", emailAddress: email },
      })
      .catch(() => {
        // e.g. already shared with this email — not fatal
      });
  }
}
