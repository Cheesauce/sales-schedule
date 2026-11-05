import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Resolves the current session and asserts the caller is an ADMIN.
 * Returns either the session or a ready-to-return 401/403 NextResponse.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  const role = (session.user as typeof session.user & { role?: string }).role;
  if (role !== "ADMIN") {
    return { session: null, error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { session, error: null };
}

/**
 * Like requireAdmin, but also lets staff (SALES role) through. Used for
 * day-to-day work (requests, calendar, availability, viewing suppliers).
 * Destructive/management actions stay on requireAdmin.
 */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  const role = (session.user as typeof session.user & { role?: string }).role;
  if (role !== "ADMIN" && role !== "SALES") {
    return { session: null, error: NextResponse.json({ error: "Staff access required." }, { status: 403 }) };
  }
  return { session, error: null };
}
