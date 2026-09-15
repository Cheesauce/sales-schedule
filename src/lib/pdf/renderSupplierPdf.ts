import { renderToBuffer } from "@react-pdf/renderer";
import type { SupplierSubmission } from "@prisma/client";
import { SupplierPdfDocument } from "@/lib/pdf/SupplierPdfDocument";

/** Shared with the admin/self-service download routes and the Drive auto-upload. */
export function supplierPdfFileName(companyName: string): string {
  return `Supplier Information Form - ${companyName}.pdf`.replace(/[/\\:*?"<>|]/g, "-");
}

export async function renderSupplierPdfBuffer(submission: SupplierSubmission): Promise<Buffer> {
  return renderToBuffer(SupplierPdfDocument({ submission }));
}
