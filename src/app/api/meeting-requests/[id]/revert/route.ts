import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/requireAdmin";
import { deleteMeetingEvent } from "@/lib/googleCalendar";

// Admin only: revert a CONFIRMED or REJECTED request back to PENDING.
// If it was confirmed, the Google Calendar event is deleted first — a
// PENDING request has no business owning a live calendar event, and it
// may end up re-confirmed to a different slot or rejected outright.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireStaff();
  if (error) return error;

  const { id } = await params;
  const meeting = await prisma.meetingRequest.findUnique({ where: { id } });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting request not found." }, { status: 404 });
  }
  if (meeting.status === "PENDING") {
    return NextResponse.json({ error: "Request is already pending." }, { status: 409 });
  }

  if (meeting.status === "CONFIRMED" && meeting.googleEventId) {
    await deleteMeetingEvent(meeting.googleEventId);
  }

  const updated = await prisma.meetingRequest.update({
    where: { id },
    data: {
      status: "PENDING",
      confirmedAt: null,
      googleEventId: null,
      rejectedReason: null,
    },
  });

  return NextResponse.json(updated);
}
