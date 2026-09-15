"use client";

import { useEffect, useState } from "react";

interface Contact {
  id: string;
  name: string;
}

interface Block {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  note: string | null;
  salesContact: { id: string; name: string } | null;
  createdBy: { name: string | null; email: string };
}

export function AvailabilityManager() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState({
    date: "",
    startTime: "10:30",
    endTime: "15:00",
    isAvailable: false,
    note: "",
  });
  // Multi-select: none checked = whole department (one block, no contact).
  // One or more checked = one block per selected contact.
  const [salesContactIds, setSalesContactIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [blocksRes, contactsRes] = await Promise.all([
      fetch("/api/availability-blocks"),
      fetch("/api/sales-contacts"),
    ]);
    setBlocks(await blocksRes.json());
    setContacts(await contactsRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function toggleSalesContact(id: string) {
    setSalesContactIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // No contacts checked → one whole-department block. One or more
    // checked → one block per selected contact (each POST independent, so
    // one bad contact doesn't silently drop the others).
    const idsToSubmit = salesContactIds.length > 0 ? salesContactIds : [undefined];
    const results = await Promise.all(
      idsToSubmit.map((salesContactId) =>
        fetch("/api/availability-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, salesContactId }),
        })
      )
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      const data = await failed[0].json().catch(() => ({}));
      const message = typeof data.error === "string" ? data.error : "Failed to add entry.";
      setError(
        failed.length < results.length
          ? `${message} (${results.length - failed.length}/${results.length} entries were added.)`
          : message
      );
    } else {
      setForm({ date: "", startTime: "10:30", endTime: "15:00", isAvailable: false, note: "" });
      setSalesContactIds([]);
    }
    await load();
    setSubmitting(false);
  }

  async function removeBlock(id: string) {
    await fetch(`/api/availability-blocks/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={addBlock} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">Add a custom schedule entry</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">Date</label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Sales contact (optional — leave all unchecked for whole dept, or check several)
            </label>
            <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-md border border-slate-300 px-3 py-2">
              {contacts.length === 0 ? (
                <p className="text-xs text-slate-400">No sales contacts yet.</p>
              ) : (
                contacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={salesContactIds.includes(c.id)}
                      onChange={() => toggleSalesContact(c.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                    {c.name}
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Start time</label>
            <input
              required
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">End time</label>
            <input
              required
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Type</label>
            <select
              value={form.isAvailable ? "open" : "block"}
              onChange={(e) => setForm({ ...form, isAvailable: e.target.value === "open" })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="block">Blackout (unavailable)</option>
              <option value="open">Open window (custom availability)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Note (optional)</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. On leave, Client visit day"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
        >
          {submitting ? "Adding..." : "Add entry"}
        </button>
      </form>

      <div className="space-y-2">
        {blocks.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {new Date(b.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}{" "}
                · {b.startTime}–{b.endTime}{" "}
                <span className={b.isAvailable ? "text-green-700" : "text-red-700"}>
                  ({b.isAvailable ? "open" : "blocked"})
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {b.salesContact ? b.salesContact.name : "Whole department"}
                {b.note ? ` · ${b.note}` : ""}
              </p>
            </div>
            <button
              onClick={() => removeBlock(b.id)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Remove
            </button>
          </div>
        ))}
        {blocks.length === 0 && <p className="text-sm text-slate-500">No custom schedule entries yet.</p>}
      </div>
    </div>
  );
}
