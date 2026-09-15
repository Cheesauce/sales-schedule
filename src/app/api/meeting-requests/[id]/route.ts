import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { deleteMeetingEvent } from "@/lib/googleCalendar";

// Admin only: permanently delete a meeting request, from any status
// (Pending, Confirmed, or Rejected). If it was Confirmed, its Google
// Calendar event is cancelled first so it doesn't linger on the calendar.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const meeting = await prisma.meetingRequest.findUnique({ where: { id } });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting request not found." }, { status: 404 });
  }

  if (meeting.status === "CONFIRMED" && meeting.googleEventId) {
    await deleteMeetingEvent(meeting.googleEventId);
  }

  await prisma.meetingRequest.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
