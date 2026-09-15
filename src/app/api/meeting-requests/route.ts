import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkAvailability } from "@/lib/availability";
import { DEFAULT_LOCATION, parseDateOnly } from "@/lib/scheduling";
import { requireAdmin } from "@/lib/requireAdmin";

const createSchema = z.object({
  topic: z.string().min(1, "Please describe what the meeting is about."),
  requesterName: z.string().min(1, "Your name is required."),
  requesterCompany: z.string().optional(),
  requesterEmail: z.string().email("A valid email is required."),
  requesterPhone: z.string().min(1, "Viber number is required."),
  date: z.string(), // YYYY-MM-DD
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  salesContactId: z.string().min(1, "Please choose a sales contact."),
  supplierSubmissionId: z.string().min(1, "Please complete the Supplier Information Form first."),
});

// Public: submit a new meeting request. No login required — this is the
// supplier/client-facing form.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const date = parseDateOnly(data.date);

  const availability = await checkAvailability(date, data.startTime, data.endTime, data.salesContactId);
  if (!availability.valid) {
    return NextResponse.json({ error: availability.reason }, { status: 409 });
  }

  const contact = await prisma.salesContact.findUnique({ where: { id: data.salesContactId } });
  if (!contact || !contact.active) {
    return NextResponse.json({ error: "That sales contact is not available." }, { status: 400 });
  }

  const submission = await prisma.supplierSubmission.findUnique({
    where: { id: data.supplierSubmissionId },
    select: { id: true },
  });
  if (!submission) {
    return NextResponse.json(
      { error: "Your Supplier Information Form submission wasn't found. Please complete it again." },
      { status: 400 }
    );
  }

  const meeting = await prisma.meetingRequest.create({
    data: {
      topic: data.topic,
      requesterName: data.requesterName,
      requesterCompany: data.requesterCompany,
      requesterEmail: data.requesterEmail,
      requesterPhone: data.requesterPhone,
      date,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location?.trim() || DEFAULT_LOCATION,
      salesContactId: data.salesContactId,
      supplierSubmissionId: data.supplierSubmissionId,
    },
  });

  return NextResponse.json(meeting, { status: 201 });
}

// Admin only: list meeting requests, optionally filtered by status.
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const meetings = await prisma.meetingRequest.findMany({
    where: status ? { status: status as "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" } : undefined,
    include: {
      salesContact: true,
      supplierSubmission: { select: { id: true, companyName: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(meetings);
}
