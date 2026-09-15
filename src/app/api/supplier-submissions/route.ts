import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { supplierSubmissionSchema, toPrismaData } from "@/lib/supplierSubmissions";
import { isValidRequirementType } from "@/lib/supplierRequirements";
import {
  createSupplierDriveFolder,
  uploadSupplierPdfToDrive,
  InvalidUploadError,
  isInsufficientScopeError,
  INSUFFICIENT_SCOPE_MESSAGE,
  type UploadableFile,
} from "@/lib/googleDrive";
import { encodeSignatureImage, InvalidSignatureImageError } from "@/lib/signatureImage";
import { renderSupplierPdfBuffer, supplierPdfFileName } from "@/lib/pdf/renderSupplierPdf";

// Admin only: list all supplier submissions (most recent first).
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const submissions = await prisma.supplierSubmission.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyName: true,
      contactPerson: true,
      contactEmail: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { meetingRequests: true } },
    },
  });
  return NextResponse.json(submissions);
}

// Public: submit a new Supplier Information Form. multipart/form-data:
// - "data": JSON string matching supplierSubmissionSchema
// - "file:<REQUIREMENT_TYPE>": one File per checked requirement type
export async function POST(req: NextRequest) {
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

  const files: UploadableFile[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("file:") || !(value instanceof File)) continue;
    const requirementType = key.slice("file:".length);
    if (!isValidRequirementType(requirementType)) continue;
    files.push({ requirementType, file: value });
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Please attach at least one file for a requirement type (Section VIII)." },
      { status: 400 }
    );
  }

  const signatureImageFile = form.get("signatureImage");
  let signatureImageDataUrl: string | undefined;
  if (signatureImageFile instanceof File) {
    try {
      signatureImageDataUrl = await encodeSignatureImage(signatureImageFile);
    } catch (err) {
      if (err instanceof InvalidSignatureImageError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  const shareWithEmails = [parsed.data.contactEmail, parsed.data.repEmail].filter(
    (e): e is string => !!e && e.trim().length > 0
  );

  let driveResult;
  try {
    driveResult = await createSupplierDriveFolder(parsed.data.companyName, files, shareWithEmails);
  } catch (err) {
    if (err instanceof InvalidUploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (isInsufficientScopeError(err)) {
      return NextResponse.json({ error: INSUFFICIENT_SCOPE_MESSAGE }, { status: 502 });
    }
    console.error("Failed to create supplier Drive folder:", err);
    return NextResponse.json({ error: "Failed to upload attachments to Google Drive." }, { status: 502 });
  }

  const submission = await prisma.supplierSubmission.create({
    data: {
      ...toPrismaData(parsed.data),
      attachmentsDriveLink: driveResult.folderUrl,
      driveFolderId: driveResult.folderId,
      ...(signatureImageDataUrl
        ? {
            signatureImageDataUrl,
            signatureImageX: parsed.data.signatureImageX ?? 0.03,
            signatureImageY: parsed.data.signatureImageY ?? 0.55,
            signatureImageWidth: parsed.data.signatureImageWidth ?? 0.2,
            signatureImageHeight: parsed.data.signatureImageHeight ?? 0.15,
          }
        : {}),
    },
  });

  // Auto-generate the filled PDF and drop it into the same Drive folder,
  // right alongside the requirement attachments. Best-effort — the
  // submission itself already succeeded, so a Drive/PDF hiccup here
  // shouldn't fail the request.
  try {
    const pdfBuffer = await renderSupplierPdfBuffer(submission);
    await uploadSupplierPdfToDrive(driveResult.folderId, supplierPdfFileName(submission.companyName), pdfBuffer);
  } catch (err) {
    console.error("Failed to upload generated PDF to Drive:", err);
  }

  return NextResponse.json(submission, { status: 201 });
}
