import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/requireAdmin";
import { parseDateOnly } from "@/lib/scheduling";

const createSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  startTime: z.string(),
  endTime: z.string(),
  isAvailable: z.boolean(),
  note: z.string().optional(),
  salesContactId: z.string().optional(),
});

// Admin only: list all availability blocks (blackouts / custom open
// windows) for the sales department.
export async function GET() {
  const { error } = await requireStaff();
  if (error) return error;

  const blocks = await prisma.availabilityBlock.findMany({
    include: { salesContact: true, createdBy: { select: { name: true, email: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(blocks);
}

// Admin only: manually add a custom availability block for the sales dept.
export async function POST(req: NextRequest) {
  const { session, error } = await requireStaff();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const block = await prisma.availabilityBlock.create({
    data: {
      date: parseDateOnly(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      isAvailable: data.isAvailable,
      note: data.note,
      salesContactId: data.salesContactId,
      createdById: session!.user!.id as string,
    },
  });

  return NextResponse.json(block, { status: 201 });
}
