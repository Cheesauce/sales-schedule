import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminCalendarView } from "@/components/AdminCalendarView";

export default async function AdminCalendarPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN" && role !== "SALES") redirect("/");

  // Set once the real Google Calendar's id is known — see the "Google
  // Calendar" tab for where to find it. Never exposed to the client
  // beyond this one string; read server-side so nothing else about the
  // admin's Google account leaks to the browser.
  const googleCalendarId = process.env.GOOGLE_SALES_CALENDAR_ID ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-20">
      <h1 className="text-2xl font-semibold text-slate-900">Sales Calendar</h1>
      <p className="mt-1 text-sm text-slate-600">
        See occupied and available days per sales contact — the same rules the public request form uses — plus a
        live view of the connected Google Calendar.
      </p>
      <div className="mt-8">
        <AdminCalendarView googleCalendarId={googleCalendarId} />
      </div>
    </div>
  );
}
