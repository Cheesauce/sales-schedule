"use client";

import { useEffect, useState } from "react";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "SALES";
  locked: boolean;
}

export function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(u: UserRow, role: "ADMIN" | "SALES") {
    if (role === u.role) return;
    const label = role === "ADMIN" ? "an admin" : "staff";
    if (!window.confirm(`Make ${u.email} ${label}?`)) return;
    setBusyId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Failed to change role.");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {users.map((u) => (
        <div
          key={u.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{u.name || u.email}</p>
            <p className="truncate text-sm text-slate-500">
              {u.email}
              {u.locked && <span className="ml-2 text-xs text-slate-400">(permanent admin)</span>}
            </p>
          </div>
          <select
            value={u.role}
            disabled={busyId === u.id || u.locked}
            onChange={(e) => changeRole(u, e.target.value as "ADMIN" | "SALES")}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="SALES">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      ))}
      {!loading && users.length === 0 && <p className="text-sm text-slate-500">No users yet.</p>}
    </div>
  );
}
