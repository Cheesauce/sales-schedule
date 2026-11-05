"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ConfirmMeetingModal } from "@/components/ConfirmMeetingModal";

interface MeetingRequest {
  id: string;
  topic: string;
  requesterName: string;
  requesterCompany: string | null;
  requesterEmail: string;
  requesterPhone: string | null;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  salesContact: { id: string; name: string; email: string };
  supplierSubmission: { id: string; companyName: string } | null;
  createdAt: string;
}

const TABS = ["PENDING", "CONFIRMED", "REJECTED"] as const;

export function AdminDashboard() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const [tab, setTab] = useState<(typeof TABS)[number]>("PENDING");
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<MeetingRequest | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/meeting-requests?status=${tab}`);
      setRequests(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function confirm(id: string, attendeeEmails: string[]) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/meeting-requests/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendeeEmails }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to confirm.");
    } else {
      setConfirmTarget(null);
      await load();
    }
    setBusyId(null);
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejecting (optional):") ?? undefined;
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/meeting-requests/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to reject.");
    } else {
      await load();
    }
    setBusyId(null);
  }

  async function revert(id: string, currentStatus: MeetingRequest["status"]) {
    const warning =
      currentStatus === "CONFIRMED"
        ? "This will cancel the Google Calendar event and move the request back to Pending. Continue?"
        : "Move this request back to Pending?";
    if (!window.confirm(warning)) return;
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/meeting-requests/${id}/revert`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to revert.");
    } else {
      await load();
    }
    setBusyId(null);
  }

  async function deleteRequest(id: string, currentStatus: MeetingRequest["status"]) {
    const warning =
      currentStatus === "CONFIRMED"
        ? "This permanently deletes the request and cancels its Google Calendar event. This cannot be undone. Continue?"
        : "Permanently delete this request? This cannot be undone.";
    if (!window.confirm(warning)) return;
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/meeting-requests/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete.");
    } else {
      await load();
    }
    setBusyId(null);
  }

  return (
    <div>
      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">No {tab.toLowerCase()} requests.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{r.topic}</p>
                  <p className="text-sm text-slate-600">
                    {new Date(r.date).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC", // dates are stored UTC-anchored (date-only) — see parseDateOnly()
                    })}{" "}
                    · {r.startTime}–{r.endTime}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {r.requesterName}
                    {r.requesterCompany ? ` (${r.requesterCompany})` : ""} · {r.requesterEmail}
                    {r.requesterPhone ? ` · ${r.requesterPhone}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Sales contact: {r.salesContact.name}</p>
                  {r.supplierSubmission && (
                    <Link
                      href={`/admin/suppliers/${r.supplierSubmission.id}`}
                      className="mt-1 inline-block text-xs font-medium text-slate-500 underline"
                    >
                      View Supplier Info ({r.supplierSubmission.companyName})
                    </Link>
                  )}
                  <p className="mt-1 text-xs text-slate-400">{r.location}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {tab === "PENDING" && (
                    <>
                      <button
                        onClick={() => setConfirmTarget(r)}
                        disabled={busyId === r.id}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => reject(r.id)}
                        disabled={busyId === r.id}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {(tab === "CONFIRMED" || tab === "REJECTED") && (
                    <button
                      onClick={() => revert(r.id, r.status)}
                      disabled={busyId === r.id}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      {busyId === r.id ? "Working..." : "Revert to Pending"}
                    </button>
                  )}
                  {isAdmin && <button
                    onClick={() => deleteRequest(r.id, r.status)}
                    disabled={busyId === r.id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                  >
                    Delete
                  </button>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmTarget && (
        <ConfirmMeetingModal
          meetingTopic={confirmTarget.topic}
          defaultSalesContact={confirmTarget.salesContact}
          submitting={busyId === confirmTarget.id}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={(attendeeEmails) => confirm(confirmTarget.id, attendeeEmails)}
        />
      )}
    </div>
  );
}
