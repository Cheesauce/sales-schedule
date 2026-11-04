import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SupplierInformationForm } from "@/components/SupplierInformationForm";

export default async function NewSupplierPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Add existing supplier</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        For suppliers who filled out the form before this system existed. Enter what&apos;s on their old form and
        link their existing Drive folder. Saving creates their private edit link, which you can then send them.
        Consent and signature are saved exactly as entered, never auto-ticked.
      </p>
      <SupplierInformationForm mode="admin-create" />
    </div>
  );
}
