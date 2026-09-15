import { NextRequest, NextResponse } from "next/server";
import { findSubmissionByToken } from "@/lib/supplierSubmissions";
import { renderSupplierPdfBuffer, supplierPdfFileName } from "@/lib/pdf/renderSupplierPdf";

// Public (by the supplier's own private edit token): download this
// submission as a PDF matching the printed Supplier Information Form.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const submission = await findSubmissionByToken(token);
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
