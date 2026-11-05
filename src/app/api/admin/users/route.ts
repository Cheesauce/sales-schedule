import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { isEnvAdmin } from "@/lib/roles";

// Admin only: everyone who has signed in, with their role.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json(users.map((u) => ({ ...u, locked: isEnvAdmin(u.email) })));
}
