import { Suspense } from "react";
import { RequestMeetingGate } from "@/components/RequestMeetingGate";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Sales Department</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#191410]">Request a Meeting</h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-stone-500">
          Suppliers and clients can use this form to request a meeting with our sales department. Meetings are only
          available Tuesday through Friday, 10:30 AM – 3:00 PM. Your request will be reviewed by our admin team
          before it&apos;s confirmed.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-14px_rgba(25,20,16,0.12)] sm:p-8">
        <Suspense fallback={<p className="text-sm text-stone-400">Loading...</p>}>
          <RequestMeetingGate />
        </Suspense>
      </div>
    </div>
  );
}
