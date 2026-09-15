"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

export function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const role = (session?.user as { role?: string } | undefined)?.role;

  // Suppliers/clients land on the public pages unauthenticated — a bold
  // "Sign in" button there reads as if it's required to submit a
  // request. Keep it low-key and clearly staff-scoped there; the admin
  // area can stay a normal, prominent control.
  const inStaffArea = pathname?.startsWith("/admin") ?? false;

  return (
    <header className="border-b border-black/[0.06] bg-white/90 backdrop-blur-sm">
      <div className="h-[3px] bg-gradient-to-r from-brand via-brand to-brand-dark" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/revlv-icon.svg" alt="" width={26} height={26} className="shrink-0" />
          <span className="font-semibold tracking-tight text-[#191410]">
            Revlv <span className="text-brand">Sales Scheduler</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm">
          {pathname !== "/" && (
            <Link href="/" className="text-stone-500 transition-colors hover:text-[#191410]">
              Request a Meeting
            </Link>
          )}
          {role === "ADMIN" && (
            <>
              <span className="hidden h-4 w-px bg-stone-200 sm:inline-block" aria-hidden />
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <Link href="/admin" className="text-stone-500 transition-colors hover:text-[#191410]">
                  Admin
                </Link>
                <Link href="/admin/calendar" className="text-stone-500 transition-colors hover:text-[#191410]">
                  Calendar
                </Link>
                <Link href="/admin/contacts" className="text-stone-500 transition-colors hover:text-[#191410]">
                  Sales Contacts
                </Link>
                <Link href="/admin/availability" className="text-stone-500 transition-colors hover:text-[#191410]">
                  Availability
                </Link>
                <Link href="/admin/suppliers" className="text-stone-500 transition-colors hover:text-[#191410]">
                  Suppliers
                </Link>
              </div>
              <span className="hidden h-4 w-px bg-stone-200 sm:inline-block" aria-hidden />
            </>
          )}
          {status === "authenticated" ? (
            <button
              onClick={() => signOut()}
              title={session?.user?.email ?? undefined}
              className="rounded-full border border-stone-200 px-3.5 py-1.5 text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              Sign out
            </button>
          ) : status === "unauthenticated" ? (
            inStaffArea ? (
              <button
                onClick={() => signIn("google")}
                className="rounded-full bg-brand px-4 py-1.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
              >
                Sign in
              </button>
            ) : (
              <button
                onClick={() => signIn("google", { callbackUrl: "/admin" })}
                className="text-stone-400 underline-offset-2 transition-colors hover:text-stone-600 hover:underline"
                title="For Revlv admin/sales staff only"
              >
                Staff login
              </button>
            )
          ) : null}
        </nav>
      </div>
    </header>
  );
}
