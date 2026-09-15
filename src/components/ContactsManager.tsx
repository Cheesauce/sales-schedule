"use client";

import { useEffect, useState } from "react";

interface Contact {
  id: string;
  name: string;
  email: string;
  title: string | null;
  active: boolean;
}

export function ContactsManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState({ name: "", email: "", title: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/sales-contacts?all=true");
      setContacts(await res.json());
    } catch {
      // leave existing list as-is; the add/remove actions will surface their own errors
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sales-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data.error === "string"
            ? data.error
            : data.error
              ? JSON.stringify(data.error)
              : `Failed to add contact (${res.status}).`
        );
      } else {
        setForm({ name: "", email: "", title: "" });
        await load();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeContact(id: string) {
    if (!window.confirm("Remove this sales contact? They'll no longer be selectable for new requests.")) return;
    setBusyId(id);
    try {
      await fetch(`/api/sales-contacts/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reactivateContact(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/sales-contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function deletePermanently(id: string) {
    setBusyId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/sales-contacts/${id}?permanent=true`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(typeof data.error === "string" ? data.error : "Failed to delete.");
        return;
      }
      setConfirmDeleteId(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={addContact} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">Add a sales contact</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Title (optional)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">
            {error}
            {error.includes("already exists") && (
              <> — if you removed it before, scroll down to reactivate it instead.</>
            )}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
        >
          {submitting ? "Adding..." : "Add contact"}
        </button>
      </form>

      <div className="space-y-2">
        {contacts.map((c) => (
          <div
            key={c.id}
            className={`rounded-lg border p-3 shadow-sm ${c.active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className={`font-medium ${c.active ? "text-slate-900" : "text-slate-500"}`}>
                  {c.name}
                  {c.title ? ` — ${c.title}` : ""}
                  {!c.active && <span className="ml-2 text-xs font-normal text-slate-400">(removed)</span>}
                </p>
                <p className="truncate text-sm text-slate-500">{c.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                {c.active ? (
                  <button
                    onClick={() => removeContact(c.id)}
                    disabled={busyId === c.id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => reactivateContact(c.id)}
                    disabled={busyId === c.id}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {busyId === c.id ? "Working..." : "Reactivate"}
                  </button>
                )}
                {confirmDeleteId !== c.id && (
                  <button
                    onClick={() => {
                      setConfirmDeleteId(c.id);
                      setDeleteError(null);
                    }}
                    disabled={busyId === c.id}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-400 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                    title="Permanently delete this contact"
                  >
                    Delete permanently
                  </button>
                )}
              </div>
            </div>

            {confirmDeleteId === c.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
                <span className="text-sm text-red-600">Delete {c.name} permanently? This can't be undone.</span>
                <button
                  onClick={() => deletePermanently(c.id)}
                  disabled={busyId === c.id}
                  className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busyId === c.id ? "Deleting..." : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            )}
            {confirmDeleteId === c.id && deleteError && (
              <p className="mt-1.5 text-xs text-red-600">{deleteError}</p>
            )}
          </div>
        ))}
        {contacts.length === 0 && <p className="text-sm text-slate-500">No sales contacts yet.</p>}
      </div>
    </div>
  );
}
