import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFullyOccupiedDates } from "@/lib/availability";
import { parseDateOnly } from "@/lib/scheduling";

const schema = z.object({
  salesContactId: z.string().min(1),
  from: z.string(), // YYYY-MM-DD
  to: z.string(), // YYYY-MM-DD
});

// Public: which dates (in range) are fully booked for a sales contact —
// used to red those out in the request form's calendar, same as Monday
// and weekends.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = schema.safeParse({
    salesContactId: searchParams.get("salesContactId"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid parameters." }, { status: 400 });
  }

  const { salesContactId, from, to } = parsed.data;
  const dates = await getFullyOccupiedDates(salesContactId, parseDateOnly(from), parseDateOnly(to));
  return NextResponse.json({ dates });
}
