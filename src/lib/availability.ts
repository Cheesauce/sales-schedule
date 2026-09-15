import { prisma } from "@/lib/prisma";
import {
  formatDateOnly,
  isSameCalendarDate,
  MEETING_END_MINUTES,
  MEETING_START_MINUTES,
  timesOverlap,
  timeToMinutes,
  validateRequestedSlot,
  type ValidationResult,
} from "@/lib/scheduling";

/**
 * Full availability check for a proposed slot: business-hour rules +
 * admin blackout blocks + only one confirmed meeting per sales contact
 * per day. Pending (unconfirmed) requests do NOT block a slot — only
 * confirmed ones do, so admin can compare overlapping requests.
 */
export async function checkAvailability(
  date: Date,
  startTime: string,
  endTime: string,
  salesContactId: string
): Promise<ValidationResult> {
  const base = validateRequestedSlot(date, startTime, endTime);
  if (!base.valid) return base;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Admin blackout / open-window overrides for this date (global or
  // scoped to this specific sales contact).
  const blocks = await prisma.availabilityBlock.findMany({
    where: {
      date: { gte: dayStart, lte: dayEnd },
      OR: [{ salesContactId: null }, { salesContactId }],
    },
  });

  for (const block of blocks) {
    if (!isSameCalendarDate(block.date, date)) continue;
    if (!timesOverlap(startTime, endTime, block.startTime, block.endTime)) continue;
    if (!block.isAvailable) {
      return { valid: false, reason: block.note ?? "That time has been blocked by the admin." };
    }
  }

  // Only one confirmed meeting per sales contact per day — any existing
  // confirmed meeting that date blocks the whole day, regardless of time.
  const confirmed = await prisma.meetingRequest.findFirst({
    where: {
      salesContactId,
      status: "CONFIRMED",
      date: { gte: dayStart, lte: dayEnd },
    },
  });

  if (confirmed && isSameCalendarDate(confirmed.date, date)) {
    return {
      valid: false,
      reason: "That sales contact already has a confirmed meeting that day. Only one meeting per day is allowed.",
    };
  }

  return { valid: true };
}

/** Does `intervals` (in minutes) leave zero gap across [rangeStart, rangeEnd]? */
function isFullyCovered(intervals: [number, number][], rangeStart: number, rangeEnd: number): boolean {
  const clipped = intervals
    .map(([s, e]): [number, number] => [Math.max(s, rangeStart), Math.min(e, rangeEnd)])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);

  let cursor = rangeStart;
  for (const [s, e] of clipped) {
    if (s > cursor) return false; // gap before this interval
    cursor = Math.max(cursor, e);
  }
  return cursor >= rangeEnd;
}

/**
 * Dates (within [from, to]) that are unavailable for a given sales
 * contact: any date with an existing confirmed meeting (only one per day
 * is allowed, regardless of time), plus any date where admin blackout
 * blocks fully cover the 10:30–15:00 business-hours window. Used to red
 * out those days in the public request form's calendar, the same way
 * Monday/weekends are red.
 */
export async function getFullyOccupiedDates(
  salesContactId: string,
  from: Date,
  to: Date
): Promise<string[]> {
  const rangeStart = new Date(from);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(to);
  rangeEnd.setHours(23, 59, 59, 999);

  const [confirmedMeetings, blocks] = await Promise.all([
    prisma.meetingRequest.findMany({
      where: { salesContactId, status: "CONFIRMED", date: { gte: rangeStart, lte: rangeEnd } },
      select: { date: true },
    }),
    prisma.availabilityBlock.findMany({
      where: {
        date: { gte: rangeStart, lte: rangeEnd },
        isAvailable: false, // only blackouts remove availability; open windows don't extend past business hours here
        OR: [{ salesContactId: null }, { salesContactId }],
      },
      select: { date: true, startTime: true, endTime: true },
    }),
  ]);

  // Any confirmed meeting occupies its whole day — one meeting per day.
  const occupied = new Set(confirmedMeetings.map((m) => formatDateOnly(m.date)));

  // Blackout blocks only occupy a day if, combined, they cover the whole
  // business-hours window with no gap.
  const blackoutsByDate = new Map<string, [number, number][]>();
  for (const block of blocks) {
    const key = formatDateOnly(block.date);
    const intervals = blackoutsByDate.get(key) ?? [];
    intervals.push([timeToMinutes(block.startTime), timeToMinutes(block.endTime)]);
    blackoutsByDate.set(key, intervals);
  }
  for (const [dateKey, intervals] of blackoutsByDate) {
    if (isFullyCovered(intervals, MEETING_START_MINUTES, MEETING_END_MINUTES)) {
      occupied.add(dateKey);
    }
  }

  return [...occupied];
}
