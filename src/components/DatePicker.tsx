"use client";

import { useEffect, useRef, useState } from "react";
import "react-day-picker/style.css";
import { DayPicker } from "react-day-picker";

// Sun=0, Mon=1, Sat=6 — everything that isn't Tue-Fri.
const BLOCKED_WEEKDAYS = [0, 1, 6];

// How far ahead we fetch/allow browsing — keeps the "fully booked" data
// bounded instead of silently going stale for dates far in the future.
const LOOKAHEAD_DAYS = 120;

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  /** When set, dates fully booked for this sales contact are shown red and disabled. */
  salesContactId?: string;
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDisplay(value: string): string {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Roughly how tall the calendar popover renders — used to decide whether
// it fits below the field or should flip above it instead.
const POPOVER_HEIGHT_ESTIMATE = 380;

export function DatePicker({ value, onChange, salesContactId }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [occupiedDates, setOccupiedDates] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const today = toDateOnly(new Date());
  const lastBookableDay = addDays(today, LOOKAHEAD_DAYS);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  useEffect(() => {
    if (!salesContactId) {
      setOccupiedDates(new Set());
      return;
    }
    const params = new URLSearchParams({
      salesContactId,
      from: formatYmd(today),
      to: formatYmd(lastBookableDay),
    });
    fetch(`/api/occupied-dates?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setOccupiedDates(new Set(data.dates ?? [])))
      .catch(() => setOccupiedDates(new Set()));
    // today/lastBookableDay are stable within a render of this component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesContactId]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const isOccupied = (date: Date) => occupiedDates.has(formatYmd(date));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            setOpenUpward(spaceBelow < POPOVER_HEIGHT_ESTIMATE && spaceAbove > spaceBelow);
          }
          setOpen((o) => !o);
        }}
        className="flex w-full items-center justify-between rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-left text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
      >
        <span className={value ? "text-[#191410]" : "text-stone-400"}>
          {value ? formatDisplay(value) : "Select a date..."}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-stone-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm10 6H4v8h12V8Z" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute z-20 rounded-xl border border-stone-200 bg-white p-2 shadow-lg shadow-black/[0.06] ${
            openUpward ? "bottom-full mb-1.5" : "mt-1.5"
          }`}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(formatYmd(date));
              setOpen(false);
            }}
            startMonth={today}
            endMonth={lastBookableDay}
            disabled={[{ before: today }, { dayOfWeek: BLOCKED_WEEKDAYS }, isOccupied]}
            modifiers={{
              blocked: { dayOfWeek: BLOCKED_WEEKDAYS },
              past: { before: today },
              occupied: isOccupied,
            }}
            modifiersClassNames={{
              blocked: "!text-red-500 !bg-red-50 line-through",
              occupied: "!text-red-500 !bg-red-50 line-through",
              past: "!text-stone-300",
              selected: "!bg-brand !text-white",
              today: "font-bold underline decoration-brand",
            }}
            classNames={{
              disabled: "cursor-not-allowed",
              day_button: "rounded-md",
            }}
          />
          <div className="mt-1 flex items-center gap-2 px-1 text-xs text-stone-500">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-50 ring-1 ring-red-300" />
            Monday, weekends &amp; fully booked dates are not available
          </div>
        </div>
      )}
    </div>
  );
}
