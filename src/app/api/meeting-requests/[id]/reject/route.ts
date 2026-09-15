import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { deleteMeetingEvent } from "@/lib/googleCalendar";

const schema = z.object({ reason: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : undefined;

  const meeting = await prisma.meetingRequest.findUnique({ where: { id } });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting request not found." }, { status: 404 });
  }
  if (meeting.status === "CONFIRMED" && meeting.googleEventId) {
    await deleteMeetingEvent(meeting.googleEventId);
  }

  const updated = await prisma.meetingRequest.update({
    where: { id },
    data: { status: "REJECTED", rejectedReason: reason },
  });

  return NextResponse.json(updated);
}
