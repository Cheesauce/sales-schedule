import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { checkAvailability } from "@/lib/availability";
import { timeToMinutes, formatDateOnly } from "@/lib/scheduling";
import { createMeetingEvent } from "@/lib/googleCalendar";

const bodySchema = z.object({
  // Who on the sales side gets invited — admin picks this when confirming.
  // Falls back to the request's own sales contact if omitted.
  attendeeEmails: z.array(z.string().email()).min(1).optional(),
});

// Admin only: confirm a pending meeting request. Re-validates the slot is
// still free, then creates the event on the sales Google Calendar and
// invites the chosen sales-side attendee(s) + requester.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsedBody = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid attendee list." }, { status: 400 });
  }

  const { id } = await params;
  const meeting = await prisma.meetingRequest.findUnique({
    where: { id },
    include: { salesContact: true },
  });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting request not found." }, { status: 404 });
  }
  if (meeting.status !== "PENDING") {
    return NextResponse.json({ error: `Request is already ${meeting.status.toLowerCase()}.` }, { status: 409 });
  }

  const availability = await checkAvailability(
    meeting.date,
    meeting.startTime,
    meeting.endTime,
    meeting.salesContactId
  );
  if (!availability.valid) {
    return NextResponse.json({ error: availability.reason }, { status: 409 });
  }

  const dateStr = formatDateOnly(meeting.date);
  const startDateTime = toManilaIso(dateStr, meeting.startTime);
  const endDateTime = toManilaIso(dateStr, meeting.endTime);

  const salesAttendees = parsedBody.data.attendeeEmails ?? [meeting.salesContact.email];
  // requester always gets invited regardless of who on the sales side does
  const attendeeEmails = [...new Set([...salesAttendees, meeting.requesterEmail])];

  let googleEventId: string;
  try {
    googleEventId = await createMeetingEvent({
      summary: `Meeting: ${meeting.topic} — ${meeting.requesterName}`,
      description: [
        `Topic: ${meeting.topic}`,
        `Requested by: ${meeting.requesterName}${meeting.requesterCompany ? ` (${meeting.requesterCompany})` : ""}`,
        `Contact email: ${meeting.requesterEmail}`,
        meeting.requesterPhone ? `Contact phone: ${meeting.requesterPhone}` : null,
        `Sales contact: ${meeting.salesContact.name}`,
      ]
        .filter(Boolean)
        .join("\n"),
      location: meeting.location,
      startDateTime,
      endDateTime,
      attendeeEmails,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create Google Calendar event." },
      { status: 502 }
    );
  }

  const updated = await prisma.meetingRequest.update({
    where: { id },
    data: { status: "CONFIRMED", confirmedAt: new Date(), googleEventId },
  });

  return NextResponse.json(updated);
}

function toManilaIso(dateStr: string, hhmm: string): string {
  // Asia/Manila is a fixed UTC+8 offset (no DST).
  timeToMinutes(hhmm); // validates format
  return `${dateStr}T${hhmm}:00+08:00`;
}
