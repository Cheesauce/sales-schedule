// Business rules for scheduling supplier/client meetings with the sales
// department.
//
//  - Meetings can only be requested Tuesday - Friday.
//  - Monday is always blocked ("red") — no exceptions from this module.
//  - Meeting time must fall fully within 10:30 - 15:00 (10:30AM - 3:00PM).
//  - Admin can layer manual AvailabilityBlock rows on top:
//      isAvailable = false -> blackout (e.g. rep on leave) even within
//                              otherwise-valid hours
//      isAvailable = true  -> explicit open window (used for custom
//                              schedules the admin sets by hand)

export const MEETING_START_MINUTES = 10 * 60 + 30; // 10:30
export const MEETING_END_MINUTES = 15 * 60; // 15:00

// JS Date#getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
export const ALLOWED_WEEKDAYS = [2, 3, 4, 5]; // Tue-Fri
export const BLOCKED_WEEKDAY = 1; // Monday

export function isMonday(date: Date): boolean {
  // UTC getter — `date` is a UTC-anchored date-only value (see
  // parseDateOnly), so reading it with local getters would be wrong on
  // any server whose local timezone isn't UTC.
  return date.getUTCDay() === BLOCKED_WEEKDAY;
}

export function isAllowedWeekday(date: Date): boolean {
  return ALLOWED_WEEKDAYS.includes(date.getUTCDay());
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function isWithinBusinessHours(startTime: string, endTime: string): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end <= start) return false;
  return start >= MEETING_START_MINUTES && end <= MEETING_END_MINUTES;
}

export function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const s1 = timeToMinutes(aStart);
  const e1 = timeToMinutes(aEnd);
  const s2 = timeToMinutes(bStart);
  const e2 = timeToMinutes(bEnd);
  return s1 < e2 && s2 < e1;
}

export function isSameCalendarDate(a: Date, b: Date): boolean {
  // UTC getters — see parseDateOnly()'s note on why date-only values are
  // always anchored to UTC midnight, independent of server locale.
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Parses a "YYYY-MM-DD" date-only string as UTC midnight, regardless of
 * the server's local timezone. Every server-side write of a date-only
 * value MUST go through this — parsing without an explicit "Z" lets the
 * server's local timezone (e.g. Asia/Manila, UTC+8) shift the stored
 * instant to the previous day's evening in UTC, which then reads back as
 * the wrong calendar date anywhere UTC is used (e.g. Date#toISOString(),
 * which the Google Calendar event creation relies on).
 */
export function parseDateOnly(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

/** Formats a date-only Date (see parseDateOnly) back to "YYYY-MM-DD". */
export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates the day/time against the hard business rules only.
 * Does NOT check conflicts against existing bookings — see
 * `checkAvailability` in the API layer for that (needs DB access).
 */
export function validateRequestedSlot(date: Date, startTime: string, endTime: string): ValidationResult {
  if (isMonday(date)) {
    return { valid: false, reason: "Monday is not available for meetings." };
  }
  if (!isAllowedWeekday(date)) {
    return { valid: false, reason: "Meetings can only be scheduled Tuesday through Friday." };
  }
  if (!isWithinBusinessHours(startTime, endTime)) {
    return {
      valid: false,
      reason: "Meeting time must be between 10:30 AM and 3:00 PM.",
    };
  }
  return { valid: true };
}

export const DEFAULT_LOCATION = "The Glaston Tower, Pasig City @17th Floor";

// Shared sales-team alias — admin can invite this instead of (or in
// addition to) specific sales contacts when confirming a meeting.
export const SALES_TEAM_EMAIL = "sales@revlv.com";
