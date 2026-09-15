import { notFound } from "next/navigation";
import { SupplierInformationForm } from "@/components/SupplierInformationForm";
import { findSubmissionByToken, toFormData } from "@/lib/supplierSubmissions";

export default async function EditSupplierFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const submission = await findSubmissionByToken(token);
  if (!submission) notFound();

  const initial = toFormData(submission);
  if (!initial) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-sm text-slate-600">
          Editing the submission for <span className="font-medium">{submission.companyName}</span>.
        </p>
        <a
          href={`/api/supplier-submissions/${token}/pdf`}
          className="rounded-md bg-slate-900 px-4 py-2 font-sans text-sm font-medium text-white hover:bg-slate-700"
        >
          Download PDF
        </a>
      </div>
      <SupplierInformationForm mode="edit" token={token} initial={initial} />
    </div>
  );
}
