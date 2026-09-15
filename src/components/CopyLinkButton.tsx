"use client";

import { useState } from "react";

export function CopyLinkButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      // Resolves a relative path (e.g. "/supplier-form/edit/xyz") against
      // whatever origin this page is actually served from, so the copied
      // link is a real absolute URL wherever the admin is running this.
      const resolved = new URL(text, window.location.origin).toString();
      await navigator.clipboard.writeText(resolved);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable (e.g. insecure context) — nothing else to do
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
