import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminDashboard } from "@/components/AdminDashboard";
import { getConnectedAdmin } from "@/lib/googleAuth";

export default async function AdminPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN") redirect("/");

  const calendarOwner = await getConnectedAdmin();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Meeting Requests</h1>
      <p className="mt-1 text-sm text-slate-600">
        Confirm or reject supplier/client meeting requests. Confirming a
        request adds it to the sales Google Calendar automatically.
      </p>
      {!calendarOwner && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No admin has connected Google Calendar yet. Sign in with the Google
          account that should own the sales calendar, and grant calendar
          access when prompted, before confirming requests.
        </div>
      )}
      <div className="mt-8">
        <AdminDashboard />
      </div>
    </div>
  );
}
