"use client";

import { useEffect, useState } from "react";
import { SALES_TEAM_EMAIL } from "@/lib/scheduling";

interface SalesContact {
  id: string;
  name: string;
  email: string;
  title: string | null;
}

interface ConfirmMeetingModalProps {
  meetingTopic: string;
  defaultSalesContact: { id: string; name: string; email: string };
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (attendeeEmails: string[]) => void;
}

export function ConfirmMeetingModal({
  meetingTopic,
  defaultSalesContact,
  submitting,
  onCancel,
  onConfirm,
}: ConfirmMeetingModalProps) {
  const [mode, setMode] = useState<"all" | "specific">("specific");
  const [contacts, setContacts] = useState<SalesContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set([defaultSalesContact.email]));

  useEffect(() => {
    fetch("/api/sales-contacts")
      .then((r) => r.json())
      .then(setContacts)
      .catch(() => setContacts([]));
  }, []);

  function toggle(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  const attendeeEmails = mode === "all" ? [SALES_TEAM_EMAIL] : [...selected];
  const canSubmit = attendeeEmails.length > 0 && !submitting;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <h3 className="font-medium text-slate-900">Who should attend?</h3>
        <p className="mt-1 text-sm text-slate-500">
          Confirming &ldquo;{meetingTopic}&rdquo; — choose who on the sales side gets invited.
          The requester is always invited too.
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-2 rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50">
            <input
              type="radio"
              name="attendee-mode"
              checked={mode === "all"}
              onChange={() => setMode("all")}
              className="mt-0.5"
            />
            <span>
              <span className="block font-medium text-slate-900">Whole sales team</span>
              <span className="block text-slate-500">Invite {SALES_TEAM_EMAIL}</span>
            </span>
          </label>

          <label className="flex items-start gap-2 rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50">
            <input
              type="radio"
              name="attendee-mode"
              checked={mode === "specific"}
              onChange={() => setMode("specific")}
              className="mt-0.5"
            />
            <span className="block font-medium text-slate-900">Specific people</span>
          </label>

          {mode === "specific" && (
            <div className="ml-6 space-y-1.5 rounded-md border border-slate-200 p-3">
              {contacts.length === 0 ? (
                <p className="text-sm text-slate-500">Loading sales contacts...</p>
              ) : (
                contacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(c.email)}
                      onChange={() => toggle(c.email)}
                    />
                    <span>
                      {c.name}
                      {c.id === defaultSalesContact.id ? " (originally requested)" : ""}
                      <span className="text-slate-400"> · {c.email}</span>
                    </span>
                  </label>
                ))
              )}
              {mode === "specific" && attendeeEmails.length === 0 && (
                <p className="text-xs text-red-600">Select at least one attendee.</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(attendeeEmails)}
            disabled={!canSubmit}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Confirming..." : "Confirm & Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
