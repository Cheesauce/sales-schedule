import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

// Admin only: full read of one supplier submission by id (not token).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const submission = await prisma.supplierSubmission.findUnique({ where: { id } });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  return NextResponse.json(submission);
}

// Admin only: permanently delete a supplier submission. Does not touch its
// Google Drive folder — attachments stay in Drive, only the app's own
// record (and its link to any meeting requests) is removed.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.supplierSubmission.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  await prisma.supplierSubmission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
