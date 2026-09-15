import { SupplierInformationForm } from "@/components/SupplierInformationForm";

export default function SupplierFormPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="mb-4 font-sans text-sm text-slate-600">
        Please complete this form before requesting a meeting with our sales department. You&apos;ll get a
        private link afterward to come back and edit your submission.
      </p>
      <SupplierInformationForm mode="create" />
    </div>
  );
}
