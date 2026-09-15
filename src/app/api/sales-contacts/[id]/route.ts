import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  title: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const contact = await prisma.salesContact.update({ where: { id }, data: parsed.data });
  return NextResponse.json(contact);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const permanent = new URL(req.url).searchParams.get("permanent") === "true";

  if (!permanent) {
    // Soft delete (default): keep history on past meetings intact.
    const contact = await prisma.salesContact.update({ where: { id }, data: { active: false } });
    return NextResponse.json(contact);
  }

  const existing = await prisma.salesContact.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  // MeetingRequest.salesContactId is a required relation, so a contact
  // with meeting history can't be hard-deleted without orphaning those
  // rows — deactivate instead to preserve the record. Availability
  // blocks (optional relation) are fine either way: they'll just lose
  // their contact and read as "whole department" going forward.
  const meetingCount = await prisma.meetingRequest.count({ where: { salesContactId: id } });
  if (meetingCount > 0) {
    return NextResponse.json(
      {
        error: `Can't permanently delete — this contact has ${meetingCount} meeting request${
          meetingCount === 1 ? "" : "s"
        } on record. Deactivate it instead to keep that history intact.`,
      },
      { status: 409 }
    );
  }

  await prisma.salesContact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
