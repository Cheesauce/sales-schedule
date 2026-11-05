import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AvailabilityManager } from "@/components/AvailabilityManager";

export default async function AvailabilityPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN" && role !== "SALES") redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Manual Schedule &amp; Availability</h1>
      <p className="mt-1 text-sm text-slate-600">
        Add custom blackout windows (e.g. a rep is on leave) or explicit open
        windows for the sales department. Meetings always stay Tuesday–Friday,
        10:30 AM–3:00 PM — Monday is never available.
      </p>
      <div className="mt-8">
        <AvailabilityManager />
      </div>
    </div>
  );
}
