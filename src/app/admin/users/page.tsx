import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UsersManager } from "@/components/UsersManager";

export default async function UsersPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Users &amp; Roles</h1>
      <p className="mt-1 text-sm text-slate-600">
        Everyone who has signed in with Google. <strong>Staff</strong> can work meeting requests, the calendar,
        availability and view suppliers. <strong>Admins</strong> can also delete records, manage sales contacts and
        change roles. New sign-ins start as staff — ask someone to sign in once, then promote them here.
      </p>
      <div className="mt-8">
        <UsersManager />
      </div>
    </div>
  );
}
