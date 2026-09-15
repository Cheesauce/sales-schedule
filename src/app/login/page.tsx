"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="text-sm text-slate-600">
        Admin and sales team sign in with their Revlv Google account. The admin
        account also grants calendar access so confirmed meetings can be added
        to the sales Google Calendar automatically.
      </p>
      <button
        onClick={() => signIn("google", { callbackUrl: "/admin" })}
        className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
      >
        Continue with Google
      </button>
    </div>
  );
}
