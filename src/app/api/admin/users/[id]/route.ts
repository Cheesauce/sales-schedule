import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { isEnvAdmin } from "@/lib/roles";

const schema = z.object({ role: z.enum(["ADMIN", "SALES"]) });

// Admin only: change a user's role. Takes effect on their next request
// (sessions read the role from the database).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  if (id === (session!.user as { id?: string }).id) {
    return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (isEnvAdmin(target.email) && parsed.data.role !== "ADMIN") {
    return NextResponse.json(
      { error: "This account is a permanent admin (set in ADMIN_EMAILS) and can't be demoted here." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, email: true, name: true, role: true },
  });
  return NextResponse.json(updated);
}
