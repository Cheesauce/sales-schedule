"use client";

import { useEffect, useState } from "react";
import { minutesToTime, timeToMinutes, MEETING_START_MINUTES, MEETING_END_MINUTES, DEFAULT_LOCATION } from "@/lib/scheduling";
import { DatePicker } from "@/components/DatePicker";

interface SalesContact {
  id: string;
  name: string;
  title: string | null;
  email: string;
}

const START_TIME_OPTIONS = (() => {
  const opts: string[] = [];
  for (let m = MEETING_START_MINUTES; m < MEETING_END_MINUTES; m += 30) {
    opts.push(minutesToTime(m));
  }
  return opts;
})();

const END_TIME_OPTIONS = (() => {
  const opts: string[] = [];
  for (let m = MEETING_START_MINUTES + 30; m <= MEETING_END_MINUTES; m += 30) {
    opts.push(minutesToTime(m));
  }
  return opts;
})();

function isDisallowedWeekday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  return day === 0 || day === 1 || day === 6; // Sun, Mon, Sat blocked
}

interface RequestMeetingFormProps {
  supplierSubmissionId: string;
}

export function RequestMeetingForm({ supplierSubmissionId }: RequestMeetingFormProps) {
  const [contacts, setContacts] = useState<SalesContact[]>([]);
  const [form, setForm] = useState({
    topic: "",
    requesterName: "",
    requesterCompany: "",
    requesterEmail: "",
    requesterPhone: "",
    date: "",
    startTime: START_TIME_OPTIONS[0],
    endTime: END_TIME_OPTIONS[1] ?? END_TIME_OPTIONS[0],
    location: DEFAULT_LOCATION,
    salesContactId: "",
  });
  const [availability, setAvailability] = useState<{ valid: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | string | null>(null);

  useEffect(() => {
    fetch("/api/sales-contacts")
      .then((r) => r.json())
      .then(setContacts)
      .catch(() => setContacts([]));
  }, []);

  const dateIsBlocked = isDisallowedWeekday(form.date);
  const endTimeIsAfterStart = timeToMinutes(form.endTime) > timeToMinutes(form.startTime);

  useEffect(() => {
    setAvailability(null);
    if (!form.date || !form.salesContactId || dateIsBlocked || !endTimeIsAfterStart) return;
    setChecking(true);
    const params = new URLSearchParams({
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      salesContactId: form.salesContactId,
    });
    const timer = setTimeout(() => {
      fetch(`/api/availability-check?${params.toString()}`)
        .then((r) => r.json())
        .then(setAvailability)
        .catch(() => setAvailability({ valid: false, reason: "Could not check availability." }))
        .finally(() => setChecking(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [form.date, form.startTime, form.endTime, form.salesContactId, dateIsBlocked, endTimeIsAfterStart]);

  const canSubmit =
    form.topic && form.requesterName && form.requesterEmail && form.requesterPhone &&
    form.date && form.salesContactId &&
    !dateIsBlocked && endTimeIsAfterStart && availability?.valid && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/meeting-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, supplierSubmissionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error ?? "Something went wrong.");
      } else {
        setResult("success");
        setForm((f) => ({
          ...f,
          topic: "",
          requesterName: "",
          requesterCompany: "",
          requesterEmail: "",
          requesterPhone: "",
          date: "",
        }));
      }
    } catch {
      setResult("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result === "success") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <p className="font-semibold">Request submitted!</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-800">
          Our admin team will review your request and confirm it shortly.
          You&apos;ll receive a calendar invite once it&apos;s confirmed.
        </p>
        <button
          onClick={() => setResult(null)}
          className="mt-3 text-sm font-medium text-emerald-900 underline underline-offset-2"
        >
          Submit another request
        </button>
      </div>
    );
  }

  const label = "block text-sm font-medium text-[#191410]";
  const field =
    "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-[#191410] outline-none transition-colors placeholder:text-stone-400 focus:border-brand focus:ring-2 focus:ring-brand/10";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className={label}>What is the meeting about?</label>
        <textarea
          required
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          rows={3}
          className={`${field} resize-none`}
          placeholder="e.g. Q3 pricing discussion, new product line proposal..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Your name</label>
          <input
            required
            value={form.requesterName}
            onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Company</label>
          <input
            value={form.requesterCompany}
            onChange={(e) => setForm({ ...form, requesterCompany: e.target.value })}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Email</label>
          <input
            type="email"
            required
            value={form.requesterEmail}
            onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Viber</label>
          <input
            required
            value={form.requesterPhone}
            onChange={(e) => setForm({ ...form, requesterPhone: e.target.value })}
            placeholder="e.g. 09171234567"
            className={field}
          />
        </div>
      </div>

      <div className="border-t border-stone-200 pt-6">
        <label className={label}>Sales contact</label>
        <select
          required
          value={form.salesContactId}
          onChange={(e) => setForm({ ...form, salesContactId: e.target.value })}
          className={field}
        >
          <option value="">Select a sales contact...</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.title ? ` — ${c.title}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>Date</label>
        <div className="mt-1.5">
          <DatePicker
            value={form.date}
            onChange={(date) => setForm({ ...form, date })}
            salesContactId={form.salesContactId}
          />
        </div>
        {dateIsBlocked && (
          <p className="mt-1.5 text-xs text-red-600">
            Meetings are only available Tuesday–Friday. Monday and weekends are not available.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Start time</label>
          <select
            value={form.startTime}
            onChange={(e) => {
              const startTime = e.target.value;
              setForm((f) => ({
                ...f,
                startTime,
                // keep end time valid if the new start is at/after it
                endTime: timeToMinutes(f.endTime) > timeToMinutes(startTime) ? f.endTime : minutesToTime(timeToMinutes(startTime) + 30),
              }));
            }}
            className={field}
          >
            {START_TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Expected end time</label>
          <select
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            className={field}
          >
            {END_TIME_OPTIONS.filter((t) => timeToMinutes(t) > timeToMinutes(form.startTime)).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="-mt-3 text-xs text-stone-400">
        Meeting hours are 10:30 AM – 3:00 PM, Tuesday–Friday.
      </p>

      <div>
        <label className={label}>Location</label>
        <input
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className={field}
        />
      </div>

      {form.date && form.salesContactId && !dateIsBlocked && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm ${
            checking
              ? "border-stone-200 bg-stone-50 text-stone-500"
              : availability?.valid
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
              checking ? "bg-stone-400" : availability?.valid ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          {checking
            ? "Checking availability..."
            : availability?.valid
              ? "This time slot is available."
              : availability?.reason ?? "Select a date, time, and contact to check availability."}
        </div>
      )}

      {typeof result === "string" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{result}</div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-full bg-brand px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}
