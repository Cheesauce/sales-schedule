import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: lightweight check used to gate the meeting-request form —
// confirms a supplierSubmissionId is real without exposing its contents.
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ exists: false }, { status: 400 });
  }
  const submission = await prisma.supplierSubmission.findUnique({
    where: { id },
    select: { companyName: true },
  });
  if (!submission) {
    return NextResponse.json({ exists: false });
  }
  return NextResponse.json({ exists: true, companyName: submission.companyName });
}
