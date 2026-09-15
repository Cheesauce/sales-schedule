import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ContactsManager } from "@/components/ContactsManager";

export default async function ContactsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Sales Contacts</h1>
      <p className="mt-1 text-sm text-slate-600">
        Manage the roster of sales contacts suppliers/clients can choose from
        when requesting a meeting.
      </p>
      <div className="mt-8">
        <ContactsManager />
      </div>
    </div>
  );
}
