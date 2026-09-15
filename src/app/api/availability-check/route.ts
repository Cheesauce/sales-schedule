import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAvailability } from "@/lib/availability";
import { parseDateOnly } from "@/lib/scheduling";

const schema = z.object({
  date: z.string(), // YYYY-MM-DD
  startTime: z.string(),
  endTime: z.string(),
  salesContactId: z.string(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = schema.safeParse({
    date: searchParams.get("date"),
    startTime: searchParams.get("startTime"),
    endTime: searchParams.get("endTime"),
    salesContactId: searchParams.get("salesContactId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ valid: false, reason: "Missing or invalid parameters." }, { status: 400 });
  }

  const { date, startTime, endTime, salesContactId } = parsed.data;
  const result = await checkAvailability(parseDateOnly(date), startTime, endTime, salesContactId);
  return NextResponse.json(result);
}
