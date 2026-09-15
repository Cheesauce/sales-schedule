"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RequestMeetingForm } from "@/components/RequestMeetingForm";

// Extracts the token from either a full edit-link URL or a bare token.
function extractToken(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/supplier-form\/edit\/([^/?#]+)/);
  return match ? match[1] : trimmed;
}

export function RequestMeetingGate() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const submissionId = searchParams.get("submissionId");

  const [status, setStatus] = useState<"checking" | "ok" | "none">(submissionId ? "checking" : "none");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    if (!submissionId) {
      setStatus("none");
      return;
    }
    fetch(`/api/supplier-submissions/exists?id=${encodeURIComponent(submissionId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.exists) {
          setCompanyName(d.companyName ?? null);
          setStatus("ok");
        } else {
          setStatus("none");
        }
      })
      .catch(() => setStatus("none"));
  }, [submissionId]);

  async function continueWithLink() {
    setLookupError(null);
    const token = extractToken(tokenInput);
    if (!token) {
      setLookupError("Paste your edit link or token.");
      return;
    }
    setLookingUp(true);
    try {
      const res = await fetch(`/api/supplier-submissions/${encodeURIComponent(token)}`);
      if (!res.ok) {
        setLookupError("We couldn't find a submission for that link.");
        return;
      }
      const data = await res.json();
      router.push(`/?submissionId=${data.id}`);
    } catch {
      setLookupError("Network error — please try again.");
    } finally {
      setLookingUp(false);
    }
  }

  if (status === "checking") {
    return <p className="text-sm text-stone-400">Checking your submission...</p>;
  }

  if (status === "ok" && submissionId) {
    return (
      <div>
        {companyName && (
          <p className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            Supplier Information Form on file for <strong className="font-semibold">{companyName}</strong>.
          </p>
        )}
        <RequestMeetingForm supplierSubmissionId={submissionId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-900">
        Before requesting a meeting, please complete our Supplier Information Form.
      </div>
      <Link
        href="/supplier-form"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
      >
        Fill out the Supplier Information Form
        <span aria-hidden>→</span>
      </Link>

      <div className="border-t border-stone-200 pt-5">
        <p className="text-sm font-medium text-[#191410]">Already submitted?</p>
        <p className="mt-0.5 text-sm text-stone-500">
          Paste the private edit link you saved, or your Google Drive folder link, to continue.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Edit link or Google Drive folder link..."
            className="flex-1 rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm text-[#191410] outline-none transition-colors placeholder:text-stone-400 focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
          <button
            onClick={continueWithLink}
            disabled={lookingUp}
            className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50 disabled:opacity-40"
          >
            {lookingUp ? "Checking..." : "Continue"}
          </button>
        </div>
        {lookupError && <p className="mt-1.5 text-xs text-red-600">{lookupError}</p>}
        <p className="mt-3 text-xs text-stone-400">
          Lost your link? Email{" "}
          <a href="mailto:sales@revlv.com" className="font-medium text-stone-500 underline underline-offset-2">
            sales@revlv.com
          </a>{" "}
          and the Revlv sales admin can look it up for you.
        </p>
      </div>
    </div>
  );
}
