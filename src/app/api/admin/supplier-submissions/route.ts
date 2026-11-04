import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminImportSchema, toPrismaData } from "@/lib/supplierSubmissions";

// Admin only: record a supplier who already filled out the form before this
// system existed. Links their existing Drive folder (stored as an external
// link — the app only has access to folders it created itself) and returns
// the new submission, whose editToken is their private edit link.
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = adminImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const submission = await prisma.supplierSubmission.create({
    data: {
      ...toPrismaData(data),
      attachmentsDriveLink: data.existingDriveLink,
      driveFolderId: null,
    },
  });
  return NextResponse.json(submission, { status: 201 });
}
