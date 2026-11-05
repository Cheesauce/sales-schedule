import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/requireAdmin";
import { renderSupplierPdfBuffer, supplierPdfFileName } from "@/lib/pdf/renderSupplierPdf";

// Admin only: render a submission as a PDF matching the printed Supplier
// Information Form's layout.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireStaff();
  if (error) return error;

  const { id } = await params;
  const submission = await prisma.supplierSubmission.findUnique({ where: { id } });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const buffer = await renderSupplierPdfBuffer(submission);

  const fileName = supplierPdfFileName(submission.companyName);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
