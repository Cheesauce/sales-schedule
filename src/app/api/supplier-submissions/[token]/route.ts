import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findSubmissionByTokenOrDriveLink,
  supplierSubmissionSchema,
  toPrismaData,
} from "@/lib/supplierSubmissions";
import { isValidRequirementType } from "@/lib/supplierRequirements";
import {
  addFilesToSupplierDriveFolder,
  createSupplierDriveFolder,
  shareSupplierDriveFolder,
  uploadSupplierPdfToDrive,
  InvalidUploadError,
  isInsufficientScopeError,
  INSUFFICIENT_SCOPE_MESSAGE,
  type UploadableFile,
} from "@/lib/googleDrive";
import { encodeSignatureImage, InvalidSignatureImageError } from "@/lib/signatureImage";
import { renderSupplierPdfBuffer, supplierPdfFileName } from "@/lib/pdf/renderSupplierPdf";

// Public: fetch a submission by its private edit token, OR by the Google
// Drive folder link it was shared to (used by the "already submitted?
// continue with a saved link" flow — either link works there).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const submission = await findSubmissionByTokenOrDriveLink(decodeURIComponent(token));
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  return NextResponse.json(submission);
}

// Public: update a submission (by token). New "file:<TYPE>" entries are
// uploaded into the existing Drive folder (or a fresh one, if the
// original creation somehow never got one); the folder is re-shared with
// the current contact/rep email in case either changed.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const existing = await prisma.supplierSubmission.findUnique({ where: { editToken: token } });
  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const form = await req.formData();
  const rawData = form.get("data");
  if (typeof rawData !== "string") {
    return NextResponse.json({ error: "Missing form data." }, { status: 400 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawData);
  } catch {
    return NextResponse.json({ error: "Malformed form data." }, { status: 400 });
  }

  const parsed = supplierSubmissionSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const newFiles: UploadableFile[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("file:") || !(value instanceof File)) continue;
    const requirementType = key.slice("file:".length);
    if (!isValidRequirementType(requirementType)) continue;
    newFiles.push({ requirementType, file: value });
  }

  const signatureImageFile = form.get("signatureImage");
  let signatureImageDataUrl: string | null | undefined = existing.signatureImageDataUrl;
  let signatureImageX: number | null | undefined = existing.signatureImageX;
  let signatureImageY: number | null | undefined = existing.signatureImageY;
  let signatureImageWidth: number | null | undefined = existing.signatureImageWidth;
  let signatureImageHeight: number | null | undefined = existing.signatureImageHeight;

  if (parsed.data.removeSignatureImage) {
    signatureImageDataUrl = null;
    signatureImageX = null;
    signatureImageY = null;
    signatureImageWidth = null;
    signatureImageHeight = null;
  } else if (signatureImageFile instanceof File) {
    try {
      signatureImageDataUrl = await encodeSignatureImage(signatureImageFile);
    } catch (err) {
      if (err instanceof InvalidSignatureImageError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
    signatureImageX = parsed.data.signatureImageX ?? 0.03;
    signatureImageY = parsed.data.signatureImageY ?? 0.55;
    signatureImageWidth = parsed.data.signatureImageWidth ?? 0.2;
    signatureImageHeight = parsed.data.signatureImageHeight ?? 0.15;
  } else if (signatureImageDataUrl) {
    // No new file, keeping the existing image — but the requestor may
    // have dragged/resized it in place this edit, so pick up any updated
    // position they sent.
    signatureImageX = parsed.data.signatureImageX ?? signatureImageX;
    signatureImageY = parsed.data.signatureImageY ?? signatureImageY;
    signatureImageWidth = parsed.data.signatureImageWidth ?? signatureImageWidth;
    signatureImageHeight = parsed.data.signatureImageHeight ?? signatureImageHeight;
  }

  const shareWithEmails = [parsed.data.contactEmail, parsed.data.repEmail].filter(
    (e): e is string => !!e && e.trim().length > 0
  );

  let attachmentsDriveLink = existing.attachmentsDriveLink;
  let driveFolderId = existing.driveFolderId;

  try {
    if (driveFolderId) {
      await addFilesToSupplierDriveFolder(driveFolderId, newFiles);
      await shareSupplierDriveFolder(driveFolderId, shareWithEmails);
    } else if (newFiles.length > 0) {
      // original submission never got a folder (e.g. legacy row) — create one now
      const result = await createSupplierDriveFolder(parsed.data.companyName, newFiles, shareWithEmails);
      attachmentsDriveLink = result.folderUrl;
      driveFolderId = result.folderId;
    }
  } catch (err) {
    if (err instanceof InvalidUploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (isInsufficientScopeError(err)) {
      return NextResponse.json({ error: INSUFFICIENT_SCOPE_MESSAGE }, { status: 502 });
    }
    console.error("Failed to update supplier Drive folder:", err);
    return NextResponse.json({ error: "Failed to upload attachments to Google Drive." }, { status: 502 });
  }

  const updated = await prisma.supplierSubmission.update({
    where: { id: existing.id },
    data: {
      ...toPrismaData(parsed.data),
      attachmentsDriveLink,
      driveFolderId,
      signatureImageDataUrl,
      signatureImageX,
      signatureImageY,
      signatureImageWidth,
      signatureImageHeight,
    },
  });

  // Re-generate the PDF with the edited data and replace the copy in
  // Drive — best-effort, same as on create.
  if (driveFolderId) {
    try {
      const pdfBuffer = await renderSupplierPdfBuffer(updated);
      await uploadSupplierPdfToDrive(driveFolderId, supplierPdfFileName(updated.companyName), pdfBuffer);
    } catch (err) {
      console.error("Failed to upload generated PDF to Drive:", err);
    }
  }

  return NextResponse.json(updated);
}
