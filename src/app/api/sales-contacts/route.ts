import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

// Public: list active sales contacts (needed by the public request form).
// Admin-only: pass ?all=true to also see removed (inactive) contacts, so
// they can be reactivated or their email freed up isn't a mystery.
export async function GET(req: NextRequest) {
  const wantsAll = new URL(req.url).searchParams.get("all") === "true";

  if (wantsAll) {
    const { error } = await requireAdmin();
    if (error) return error;
    const contacts = await prisma.salesContact.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, title: true, email: true, active: true },
    });
    return NextResponse.json(contacts);
  }

  const contacts = await prisma.salesContact.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, title: true, email: true },
  });
  return NextResponse.json(contacts);
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  title: z.string().optional(),
});

// Admin only: add a sales contact to the roster. If a removed (inactive)
// contact already has this email, that row is revived instead of erroring
// — the email is only ever reserved by one row at a time either way.
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.salesContact.findUnique({ where: { email: parsed.data.email } });

  if (existing) {
    if (existing.active) {
      return NextResponse.json({ error: "A sales contact with that email already exists." }, { status: 409 });
    }
    const revived = await prisma.salesContact.update({
      where: { id: existing.id },
      data: { ...parsed.data, active: true },
    });
    return NextResponse.json(revived, { status: 200 });
  }

  const contact = await prisma.salesContact.create({ data: parsed.data });
  return NextResponse.json(contact, { status: 201 });
}
