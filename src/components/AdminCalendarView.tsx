"use client";

import { useEffect, useMemo, useState } from "react";

interface SalesContact {
  id: string;
  name: string;
  title: string | null;
  email: string;
  active?: boolean;
}

interface MeetingRequestRow {
  id: string;
  topic: string;
  requesterName: string;
  requesterCompany: string | null;
  date: string; // ISO
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  salesContact: { id: string; name: string };
  supplierSubmission: { companyName: string } | null;
}

interface AvailabilityBlockRow {
  id: string;
  date: string; // ISO
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  note: string | null;
  salesContact: { id: string; name: string } | null;
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ymd(iso: string): string {
  return iso.slice(0, 10);
}

function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

function keyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const STATUS_STYLES: Record<MeetingRequestRow["status"], string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  REJECTED: "bg-stone-200 text-stone-500 line-through",
  CANCELLED: "bg-stone-200 text-stone-500 line-through",
};

export function AdminCalendarView({ googleCalendarId }: { googleCalendarId: string | null }) {
  const [tab, setTab] = useState<"occupancy" | "google">("occupancy");
  const [contacts, setContacts] = useState<SalesContact[]>([]);
  const [meetings, setMeetings] = useState<MeetingRequestRow[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactFilter, setContactFilter] = useState<string>("");
  const [occupiedDates, setOccupiedDates] = useState<Set<string>>(new Set());

  const today = useMemo(() => {
    const n = new Date();
    return utcDate(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  }, []);
  const [cursor, setCursor] = useState(() => utcDate(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/sales-contacts?all=true").then((r) => r.json()),
      fetch("/api/meeting-requests").then((r) => r.json()),
      fetch("/api/availability-blocks").then((r) => r.json()),
    ])
      .then(([c, m, b]) => {
        setContacts(c);
        setMeetings(m);
        setBlocks(b);
      })
      .finally(() => setLoading(false));
  }, []);

  // Grid bounds (includes the leading/trailing days from adjacent months
  // that fill out the first/last week).
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const firstOfMonth = utcDate(year, month, 1);
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(utcDate(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const gridDates = cells.filter((d): d is Date => d !== null);
  const gridFrom = gridDates[0];
  const gridTo = gridDates[gridDates.length - 1];

  // Authoritative occupied-day set for the selected contact, straight
  // from the same business rules the public request form's DatePicker
  // uses — not re-derived client-side, so it can never drift from it.
  useEffect(() => {
    if (!contactFilter) {
      setOccupiedDates(new Set());
      return;
    }
    const params = new URLSearchParams({
      salesContactId: contactFilter,
      from: keyOf(gridFrom),
      to: keyOf(gridTo),
    });
    fetch(`/api/occupied-dates?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setOccupiedDates(new Set(data.dates ?? [])))
      .catch(() => setOccupiedDates(new Set()));
    // gridFrom/gridTo are derived from cursor each render; re-fetch on
    // month or contact change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactFilter, month, year]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, MeetingRequestRow[]>();
    for (const m of meetings) {
      if (contactFilter && m.salesContact?.id !== contactFilter) continue;
      const key = ymd(m.date);
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [meetings, contactFilter]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, AvailabilityBlockRow[]>();
    for (const b of blocks) {
      if (contactFilter && b.salesContact && b.salesContact.id !== contactFilter) continue;
      const key = ymd(b.date);
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return map;
  }, [blocks, contactFilter]);

  function dayInfo(date: Date) {
    const key = keyOf(date);
    const dow = date.getUTCDay();
    const isBlockedWeekday = dow === 0 || dow === 1 || dow === 6;
    const isPast = date.getTime() < today.getTime();
    const dayMeetings = (meetingsByDay.get(key) ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
    const activeMeetings = dayMeetings.filter((m) => m.status === "CONFIRMED" || m.status === "PENDING");
    const dayBlocks = blocksByDay.get(key) ?? [];
    const blackout = dayBlocks.filter((b) => !b.isAvailable);
    const openWindow = dayBlocks.filter((b) => b.isAvailable);
    const isOccupied = contactFilter ? occupiedDates.has(key) : false;
    return { key, isBlockedWeekday, isPast, dayMeetings, activeMeetings, blackout, openWindow, isOccupied };
  }

  const selected = selectedDayKey ? gridDates.find((d) => keyOf(d) === selectedDayKey) : undefined;
  const selectedInfo = selected ? dayInfo(selected) : null;

  return (
    <div>
      <div className="flex gap-1 border-b border-stone-200">
        <button
          onClick={() => setTab("occupancy")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab === "occupancy" ? "border-brand text-brand" : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          Occupancy
        </button>
        <button
          onClick={() => setTab("google")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab === "google" ? "border-brand text-brand" : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          Google Calendar
        </button>
      </div>

      {tab === "occupancy" ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCursor(utcDate(year, month - 1, 1))}
                className="rounded-md border border-stone-300 px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
                aria-label="Previous month"
              >
                ←
              </button>
              <p className="w-40 text-center text-sm font-semibold text-[#191410]">
                {MONTH_LABELS[month]} {year}
              </p>
              <button
                onClick={() => setCursor(utcDate(year, month + 1, 1))}
                className="rounded-md border border-stone-300 px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
                aria-label="Next month"
              >
                →
              </button>
            </div>
            <select
              value={contactFilter}
              onChange={(e) => {
                setContactFilter(e.target.value);
                setSelectedDayKey(null);
              }}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-[#191410] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            >
              <option value="">All contacts</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.active === false ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </div>

          {contactFilter && (
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-50 ring-1 ring-red-300" /> Occupied /
                blocked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-50 ring-1 ring-emerald-300" /> Custom
                open window
              </span>
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
            <div className="grid grid-cols-7 bg-stone-50 text-center text-xs font-semibold text-stone-500">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="py-2">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((date, i) => {
                if (!date) return <div key={i} className="min-h-[86px] border-t border-l border-stone-100 bg-stone-50/40" />;
                const info = dayInfo(date);
                const isToday = date.getTime() === today.getTime();
                const isSelected = selectedDayKey === info.key;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDayKey(info.key)}
                    className={`min-h-[86px] border-t border-l border-stone-100 p-1.5 text-left align-top transition-colors ${
                      isSelected ? "ring-2 ring-inset ring-brand" : ""
                    } ${
                      info.isBlockedWeekday
                        ? "bg-stone-50 text-stone-400"
                        : info.isOccupied
                          ? "bg-red-50 hover:bg-red-100/70"
                          : info.openWindow.length > 0
                            ? "bg-emerald-50 hover:bg-emerald-100/70"
                            : "bg-white hover:bg-stone-50"
                    } ${info.isPast && !isToday ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                        isToday ? "bg-brand font-semibold text-white" : "text-stone-600"
                      }`}
                    >
                      {date.getUTCDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {info.activeMeetings.slice(0, 2).map((m) => (
                        <div
                          key={m.id}
                          className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${STATUS_STYLES[m.status]}`}
                          title={`${m.startTime}–${m.endTime} · ${m.salesContact.name} · ${m.topic}`}
                        >
                          {m.startTime} {contactFilter ? m.topic : m.salesContact.name}
                        </div>
                      ))}
                      {info.activeMeetings.length > 2 && (
                        <p className="text-[10px] text-stone-500">+{info.activeMeetings.length - 2} more</p>
                      )}
                      {info.blackout.length > 0 && (
                        <p className="truncate text-[10px] text-red-600">
                          {info.blackout[0].note || "Blocked"}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {loading && <p className="mt-3 text-xs text-stone-400">Loading calendar data...</p>}

          {selectedInfo && (
            <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-semibold text-[#191410]">
                {new Date(`${selectedInfo.key}T00:00:00Z`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </p>
              {selectedInfo.dayMeetings.length === 0 &&
                selectedInfo.blackout.length === 0 &&
                selectedInfo.openWindow.length === 0 && (
                  <p className="mt-1 text-sm text-stone-500">Nothing scheduled.</p>
                )}
              <div className="mt-2 space-y-2">
                {selectedInfo.dayMeetings.map((m) => (
                  <div key={m.id} className="flex items-start justify-between gap-3 rounded-lg border border-stone-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-[#191410]">{m.topic}</p>
                      <p className="text-xs text-stone-500">
                        {m.startTime}–{m.endTime} · {m.salesContact.name} · {m.requesterName}
                        {m.requesterCompany ? ` (${m.requesterCompany})` : ""}
                        {m.supplierSubmission?.companyName ? ` — ${m.supplierSubmission.companyName}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[m.status]}`}>
                      {m.status}
                    </span>
                  </div>
                ))}
                {selectedInfo.blackout.map((b) => (
                  <div key={b.id} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Blocked {b.startTime}–{b.endTime}
                    {b.salesContact ? ` · ${b.salesContact.name}` : " · Whole department"}
                    {b.note ? ` — ${b.note}` : ""}
                  </div>
                ))}
                {selectedInfo.openWindow.map((b) => (
                  <div key={b.id} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Open window {b.startTime}–{b.endTime}
                    {b.salesContact ? ` · ${b.salesContact.name}` : " · Whole department"}
                    {b.note ? ` — ${b.note}` : ""}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 mb-6">
          {googleCalendarId ? (
            <iframe
              src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(googleCalendarId)}&ctz=Asia%2FManila`}
              style={{ border: 0 }}
              width="100%"
              height="650"
              className="rounded-xl border border-stone-200"
            />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
              <p className="font-semibold">The Google Calendar isn&apos;t wired up yet.</p>
              <p className="mt-2">To embed it here:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Open <span className="font-medium">calendar.google.com</span>, signed in as the account that owns
                  the &quot;REVLV SALES CALENDAR&quot;.
                </li>
                <li>
                  In the left sidebar under &quot;My calendars&quot;, hover the calendar, click the ⋮ menu, then
                  &quot;Settings and sharing&quot;.
                </li>
                <li>
                  Under <span className="font-medium">Access permissions for events</span>, check &quot;Make available
                  to public&quot; (so it shows here without every admin needing their own Google login).
                </li>
                <li>
                  Scroll to <span className="font-medium">Integrate calendar</span> and copy the{" "}
                  <span className="font-medium">Calendar ID</span> — a string ending in{" "}
                  <span className="font-mono">@group.calendar.google.com</span> (or an email address).
                </li>
                <li>
                  Set it as <span className="font-mono">GOOGLE_SALES_CALENDAR_ID</span> in the app&apos;s environment
                  and restart the server.
                </li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
