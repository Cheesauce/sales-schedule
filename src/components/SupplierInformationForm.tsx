"use client";

import { Fragment, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPLIER_REQUIREMENT_TYPES } from "@/lib/supplierRequirements";

interface OwnerOfficer {
  name: string;
  designation: string;
}
interface ProductService {
  product: string;
  brand: string;
}

export interface SupplierFormData {
  companyName: string;
  registeredAddress: string;
  tin: string;
  businessType: string;
  businessRegistrationNo: string;
  companyWebsite: string;
  yearEstablished: string;
  branches: string;

  contactPerson: string;
  contactDesignation: string;
  contactEmail: string;
  contactMobile: string;

  ownersOfficers: OwnerOfficer[];
  productsServices: ProductService[];

  finContactPerson: string;
  finDesignation: string;
  finContactNumber: string;
  finEmail: string;
  primaryBankName: string;
  primaryAccountName: string;
  primaryAccountNo: string;
  primaryAccountType: string;
  secondaryBankName: string;
  secondaryAccountName: string;
  secondaryAccountNo: string;
  secondaryAccountType: string;
  otherBankName: string;
  otherAccountName: string;
  otherAccountNo: string;
  otherAccountType: string;

  declTrueAndAccurate: boolean;
  declAuthorizeVerify: boolean;
  declGoodFaith: boolean;

  complianceCerts: string[];

  attachmentsDriveLink: string;
  requirementTypes: string[];

  repName: string;
  repDepartment: string;
  repDesignation: string;
  repEmail: string;

  finalConsent: boolean;
  signatureName: string;
  signatureDesignation: string;
  signatureDate: string;
  // Existing signature image on file (edit mode only, read-only display —
  // a fresh upload replaces it, see the `signatureImageFile` component state).
  signatureImageDataUrl?: string;
  // Placement of that image over Section X, as fractions (0-1) of the
  // section's own box — drag/resize state, round-tripped to the server.
  signatureImageX?: number;
  signatureImageY?: number;
  signatureImageWidth?: number;
  signatureImageHeight?: number;
}

const EMPTY: SupplierFormData = {
  companyName: "",
  registeredAddress: "",
  tin: "",
  businessType: "",
  businessRegistrationNo: "",
  companyWebsite: "",
  yearEstablished: "",
  branches: "",
  contactPerson: "",
  contactDesignation: "",
  contactEmail: "",
  contactMobile: "",
  ownersOfficers: [
    { name: "", designation: "" },
    { name: "", designation: "" },
    { name: "", designation: "" },
  ],
  productsServices: Array.from({ length: 5 }, () => ({ product: "", brand: "" })),
  finContactPerson: "",
  finDesignation: "",
  finContactNumber: "",
  finEmail: "",
  primaryBankName: "",
  primaryAccountName: "",
  primaryAccountNo: "",
  primaryAccountType: "",
  secondaryBankName: "",
  secondaryAccountName: "",
  secondaryAccountNo: "",
  secondaryAccountType: "",
  otherBankName: "",
  otherAccountName: "",
  otherAccountNo: "",
  otherAccountType: "",
  declTrueAndAccurate: false,
  declAuthorizeVerify: false,
  declGoodFaith: false,
  complianceCerts: ["", "", ""],
  attachmentsDriveLink: "",
  requirementTypes: [],
  repName: "",
  repDepartment: "",
  repDesignation: "",
  repEmail: "",
  finalConsent: false,
  signatureName: "",
  signatureDesignation: "",
  signatureDate: "",
  signatureImageDataUrl: "",
};

// --- Printed-form styling primitives -------------------------------------
// Mirrors the company's printed "Supplier Information Form": red section
// bars (#BF0000, sampled from the source PDF), serif type, table-row
// layout with a label cell and a fill-in cell.

const RED = "#BF0000";

function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: RED }}
    >
      {children}
    </div>
  );
}

function SectionTable({ children, invalid }: { children: React.ReactNode; invalid?: boolean }) {
  return (
    <div className={`mb-5 border ${invalid ? "border-red-400" : "border-slate-400"}`}>
      <div>{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  onChange,
  invalid,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className={`flex flex-col border-t border-slate-400 first:border-t-0 sm:flex-row ${invalid ? "bg-red-50" : ""}`}>
      <div
        className={`w-full shrink-0 border-b px-2 py-1.5 text-xs sm:w-40 sm:border-b-0 sm:border-r ${
          invalid ? "border-red-300 font-semibold text-red-600" : "border-slate-400 text-slate-700"
        }`}
      >
        {label}
      </div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs focus:outline-none ${
          invalid ? "text-red-700 placeholder-red-300" : "text-slate-900"
        }`}
      />
    </div>
  );
}

function Row2({
  labelA,
  valueA,
  onChangeA,
  labelB,
  valueB,
  onChangeB,
}: {
  labelA: string;
  valueA: string;
  onChangeA: (v: string) => void;
  labelB: string;
  valueB: string;
  onChangeB: (v: string) => void;
}) {
  return (
    <div className="flex flex-col border-t border-slate-400 first:border-t-0 sm:flex-row">
      <div className="flex border-b border-slate-400 sm:border-b-0 sm:border-r">
        <div className="w-32 shrink-0 border-r border-slate-400 px-2 py-1.5 text-xs text-slate-700">{labelA}</div>
        <input
          value={valueA}
          onChange={(e) => onChangeA(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none"
        />
      </div>
      <div className="flex">
        <div className="w-44 shrink-0 border-r border-slate-400 px-2 py-1.5 text-xs text-slate-700">{labelB}</div>
        <input
          value={valueB}
          onChange={(e) => onChangeB(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none"
        />
      </div>
    </div>
  );
}

function ItalicNote({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-slate-400 px-2 py-1.5 text-[11px] italic text-slate-500">{children}</div>;
}

// Custom checkbox matching the printed form's look (a bordered square with
// an SVG tick) instead of the browser's native checkbox rendering, so the
// web form and the downloaded PDF read as the same document.
function PrintCheckbox({
  checked,
  onChange,
  invalid,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <span className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        className={`pointer-events-none flex h-3.5 w-3.5 items-center justify-center border ${
          invalid ? "border-red-500 bg-red-50" : "border-slate-800 bg-white"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 9 9" className="h-2.5 w-2.5">
            <path d="M1.5 4.8 L3.5 7 L7.5 2" stroke="#111827" strokeWidth={1.4} fill="none" />
          </svg>
        )}
      </span>
    </span>
  );
}

function DeclarationRow({
  text,
  checked,
  onChange,
  invalid,
}: {
  text: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  invalid?: boolean;
}) {
  return (
    <div className={`flex border-t border-slate-400 first:border-t-0 ${invalid ? "bg-red-50" : ""}`}>
      <div className={`flex-1 px-2 py-2 text-xs ${invalid ? "text-red-700" : "text-slate-700"}`}>{text}</div>
      <label className="flex w-16 shrink-0 items-center justify-center gap-1 border-l border-slate-400 text-xs">
        <PrintCheckbox checked={checked} onChange={onChange} invalid={invalid} />
        YES
      </label>
    </div>
  );
}

interface SupplierInformationFormProps {
  mode: "create" | "edit";
  token?: string;
  initial?: SupplierFormData;
}

export function SupplierInformationForm({ mode, token, initial }: SupplierInformationFormProps) {
  const router = useRouter();
  const [data, setData] = useState<SupplierFormData>(initial ?? EMPTY);
  // Types already uploaded server-side (edit mode only) — shown as fixed,
  // no re-upload needed. Everything else is a fresh pick + file this session.
  const [alreadyCoveredTypes, setAlreadyCoveredTypes] = useState<Set<string>>(
    new Set(initial?.requirementTypes ?? [])
  );
  const [newFiles, setNewFiles] = useState<Record<string, File | null>>({});
  const [signatureImageFile, setSignatureImageFile] = useState<File | null>(null);
  const [signatureImagePreview, setSignatureImagePreview] = useState<string | null>(null);
  const [signatureImageError, setSignatureImageError] = useState<string | null>(null);
  const [removeSignatureImage, setRemoveSignatureImage] = useState(false);
  const sectionXBoxRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    mode: "move" | "resize";
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [successState, setSuccessState] = useState<{ id: string; editToken: string; driveLink: string } | null>(
    null
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  function set<K extends keyof SupplierFormData>(key: K, value: SupplierFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  const DEFAULT_SIGNATURE_POS = { x: 0.03, y: 0.55, width: 0.2, height: 0.15 };

  function handleSignatureImagePick(file: File | null) {
    setSignatureImageError(null);
    if (!file) {
      setSignatureImageFile(null);
      setSignatureImagePreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setSignatureImageError(`Signature must be an image file (got ${file.type || "unknown type"}).`);
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setSignatureImageError("Signature image is too large (max 3MB).");
      return;
    }
    setSignatureImageFile(file);
    setSignatureImagePreview(URL.createObjectURL(file));
    setRemoveSignatureImage(false);
    setData((d) => ({
      ...d,
      signatureImageX: d.signatureImageX ?? DEFAULT_SIGNATURE_POS.x,
      signatureImageY: d.signatureImageY ?? DEFAULT_SIGNATURE_POS.y,
      signatureImageWidth: d.signatureImageWidth ?? DEFAULT_SIGNATURE_POS.width,
      signatureImageHeight: d.signatureImageHeight ?? DEFAULT_SIGNATURE_POS.height,
    }));
    setSaved(false);
  }

  function handleSignatureImageRemove() {
    setSignatureImageFile(null);
    setSignatureImagePreview(null);
    setSignatureImageError(null);
    setRemoveSignatureImage(true);
    setData((d) => ({
      ...d,
      signatureImageDataUrl: "",
      signatureImageX: undefined,
      signatureImageY: undefined,
      signatureImageWidth: undefined,
      signatureImageHeight: undefined,
    }));
    setSaved(false);
  }

  const sigPos = {
    x: data.signatureImageX ?? DEFAULT_SIGNATURE_POS.x,
    y: data.signatureImageY ?? DEFAULT_SIGNATURE_POS.y,
    width: data.signatureImageWidth ?? DEFAULT_SIGNATURE_POS.width,
    height: data.signatureImageHeight ?? DEFAULT_SIGNATURE_POS.height,
  };
  const hasSignatureImage = !!(signatureImagePreview || data.signatureImageDataUrl);

  function startSignatureDrag(e: React.PointerEvent, mode: "move" | "resize") {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = {
      mode,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: sigPos.x,
      startY: sigPos.y,
      startWidth: sigPos.width,
      startHeight: sigPos.height,
    };
  }

  function onSignaturePointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    const box = sectionXBoxRef.current;
    if (!drag || !box || drag.pointerId !== e.pointerId) return;
    const rect = box.getBoundingClientRect();
    const dxFrac = (e.clientX - drag.startClientX) / rect.width;
    const dyFrac = (e.clientY - drag.startClientY) / rect.height;

    if (drag.mode === "move") {
      const width = drag.startWidth;
      const height = drag.startHeight;
      const x = Math.min(Math.max(drag.startX + dxFrac, 0), 1 - width);
      const y = Math.min(Math.max(drag.startY + dyFrac, 0), 1 - height);
      setData((d) => ({ ...d, signatureImageX: x, signatureImageY: y }));
    } else {
      const minSize = 0.04;
      const width = Math.min(Math.max(drag.startWidth + dxFrac, minSize), 1 - drag.startX);
      const height = Math.min(Math.max(drag.startHeight + dyFrac, minSize), 1 - drag.startY);
      setData((d) => ({ ...d, signatureImageWidth: width, signatureImageHeight: height }));
    }
  }

  function endSignatureDrag(e: React.PointerEvent) {
    if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
  }

  function updateRow<T>(list: T[], index: number, patch: Partial<T>): T[] {
    return list.map((row, i) => (i === index ? { ...row, ...patch } : row));
  }

  function toggleRequirementType(key: string) {
    if (alreadyCoveredTypes.has(key)) return; // fixed, can't uncheck
    set(
      "requirementTypes",
      data.requirementTypes.includes(key)
        ? data.requirementTypes.filter((k) => k !== key)
        : [...data.requirementTypes, key]
    );
  }

  // A requirement type is "pending a file" if it's newly checked this
  // session (not already covered) and has no file picked yet.
  const newlyCheckedTypes = data.requirementTypes.filter((k) => !alreadyCoveredTypes.has(k));
  const pendingFileTypes = newlyCheckedTypes.filter((k) => !newFiles[k]);

  // Required-field checks — computed fresh each render, cheap enough for
  // a form this size. Drives the red-highlighting on submit attempts.
  const missing = {
    companyName: !data.companyName.trim(),
    registeredAddress: !data.registeredAddress.trim(),
    contactPerson: !data.contactPerson.trim(),
    contactEmail: !data.contactEmail.trim(),
    ownersOfficers: !data.ownersOfficers.some((o) => o.name.trim()),
    productsServices: !data.productsServices.some((p) => p.product.trim()),
    declTrueAndAccurate: !data.declTrueAndAccurate,
    declAuthorizeVerify: !data.declAuthorizeVerify,
    declGoodFaith: !data.declGoodFaith,
    requirementTypes: data.requirementTypes.length === 0,
    requirementFiles: pendingFileTypes.length > 0,
    repName: !data.repName.trim(),
    finalConsent: !data.finalConsent,
    signatureName: !data.signatureName.trim(),
  };
  const hasMissing = Object.values(missing).some(Boolean);
  const invalid = (key: keyof typeof missing) => attemptedSubmit && missing[key];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAttemptedSubmit(true);

    if (hasMissing) {
      setError("Please fill in the required fields highlighted in red below.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const ownersOfficers = data.ownersOfficers.filter((o) => o.name.trim());
    const productsServices = data.productsServices.filter((p) => p.product.trim());
    const complianceCerts = data.complianceCerts.filter((c) => c.trim());

    const payload = { ...data, ownersOfficers, productsServices, complianceCerts, removeSignatureImage };

    const fd = new FormData();
    fd.set("data", JSON.stringify(payload));
    for (const [key, file] of Object.entries(newFiles)) {
      if (file) fd.set(`file:${key}`, file);
    }
    if (signatureImageFile) fd.set("signatureImage", signatureImageFile);

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/supplier-submissions" : `/api/supplier-submissions/${token}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, { method, body: fd });
      const resData = await res.json();
      if (!res.ok) {
        setError(typeof resData.error === "string" ? resData.error : "Please check the form for errors.");
      } else if (mode === "create") {
        setSuccessState({ id: resData.id, editToken: resData.editToken, driveLink: resData.attachmentsDriveLink });
      } else {
        setSaved(true);
        setNewFiles({});
        setData((d) => ({
          ...d,
          signatureImageDataUrl: resData.signatureImageDataUrl ?? "",
          signatureImageX: resData.signatureImageX ?? undefined,
          signatureImageY: resData.signatureImageY ?? undefined,
          signatureImageWidth: resData.signatureImageWidth ?? undefined,
          signatureImageHeight: resData.signatureImageHeight ?? undefined,
        }));
        setSignatureImageFile(null);
        setSignatureImagePreview(null);
        setRemoveSignatureImage(false);
        setAlreadyCoveredTypes(new Set(data.requirementTypes));
        setAttemptedSubmit(false);
        setError(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successState) {
    const editUrl = `/supplier-form/edit/${successState.editToken}`;
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-5 text-green-800">
        <p className="font-medium">Supplier Information Form submitted!</p>
        <p className="mt-2 text-sm">
          Save this link — it&apos;s the only way to come back and edit your submission later:
        </p>
        <p className="mt-1 break-all rounded-md bg-white px-3 py-2 text-sm font-mono text-slate-800">
          {typeof window !== "undefined" ? window.location.origin : ""}
          {editUrl}
        </p>
        <p className="mt-3 text-sm">
          Your documents were uploaded to a Google Drive folder, and we&apos;ve shared it with your contact
          email so you can view it too:
        </p>
        <a
          href={successState.driveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block break-all text-sm font-medium text-blue-700 underline"
        >
          {successState.driveLink}
        </a>
        <br />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => router.push(`/?submissionId=${successState.id}`)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Continue to Request a Meeting
          </button>
          <a
            href={`/api/supplier-submissions/${successState.editToken}/pdf`}
            className="rounded-md border border-slate-400 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Download PDF
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border border-slate-400 bg-white p-6 shadow-sm sm:p-8"
      style={{ fontFamily: '"Times New Roman", Times, "Liberation Serif", serif' }}
    >
      {/* Header — logo + company address block, matching the printed form */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-800 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> avoids Next's image-optimizer cache */}
        <img src="/revlv-logo.png" alt="Revlv Solutions Incorporated" className="h-9 w-auto" />
        <div className="text-right text-[11px] leading-snug text-slate-800">
          <p>Unit 26N Burgundy Corporate Tower,</p>
          <p>252 Senator Gil Puyat Avenue Makati City</p>
          <p>
            <span className="font-bold">P:</span> +632 5310 6069 | +632 7001 4416
          </p>
          <p>
            <span className="font-bold">M:</span> 0906-455-8559 / 09951319962
          </p>
          <p>
            <span className="font-bold">E:</span> sales@revlv.com <span className="font-bold">W:</span> www.revlv.com
          </p>
          <p>
            <span className="font-bold">TIN:</span> 008-745-077-000
          </p>
        </div>
      </div>
      <h1 className="mt-4 mb-6 text-center text-xl font-bold uppercase tracking-wide text-slate-900">
        Supplier Information Form
      </h1>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            {error}
          </div>
        )}
        {saved && !error && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 font-sans text-sm text-green-700">
            Changes saved.
          </div>
        )}

        <SectionBar>I. Company Information</SectionBar>
        <SectionTable invalid={invalid("companyName") || invalid("registeredAddress")}>
          <Row label="Company Name *" value={data.companyName} onChange={(v) => set("companyName", v)} invalid={invalid("companyName")} />
          <Row
            label="Registered Address *"
            value={data.registeredAddress}
            onChange={(v) => set("registeredAddress", v)}
            invalid={invalid("registeredAddress")}
          />
          <Row label="TIN" value={data.tin} onChange={(v) => set("tin", v)} />
          <Row2
            labelA="Business Type"
            valueA={data.businessType}
            onChangeA={(v) => set("businessType", v)}
            labelB="Business Registration No."
            valueB={data.businessRegistrationNo}
            onChangeB={(v) => set("businessRegistrationNo", v)}
          />
          <Row2
            labelA="Company Website"
            valueA={data.companyWebsite}
            onChangeA={(v) => set("companyWebsite", v)}
            labelB="Year Established"
            valueB={data.yearEstablished}
            onChangeB={(v) => set("yearEstablished", v)}
          />
          <div className="flex border-t border-slate-400">
            <div className="w-40 shrink-0 border-r border-slate-400 px-2 py-1.5 text-xs text-slate-700">
              Branch (if any)
            </div>
            <textarea
              value={data.branches}
              onChange={(e) => set("branches", e.target.value)}
              rows={3}
              placeholder="One branch per line"
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none"
            />
          </div>
        </SectionTable>

        <SectionBar>II. Contact Details</SectionBar>
        <SectionTable invalid={invalid("contactPerson") || invalid("contactEmail")}>
          <Row
            label="Contact Person *"
            value={data.contactPerson}
            onChange={(v) => set("contactPerson", v)}
            invalid={invalid("contactPerson")}
          />
          <Row label="Designation" value={data.contactDesignation} onChange={(v) => set("contactDesignation", v)} />
          <Row
            label="Email Address *"
            type="email"
            value={data.contactEmail}
            onChange={(v) => set("contactEmail", v)}
            invalid={invalid("contactEmail")}
          />
          <Row label="Mobile No." value={data.contactMobile} onChange={(v) => set("contactMobile", v)} />
          <ItalicNote>Attach separate list for other contact person per account/product</ItalicNote>
        </SectionTable>

        <SectionBar>III. Owners / Officers (C-Level) *</SectionBar>
        <SectionTable invalid={invalid("ownersOfficers")}>
          {invalid("ownersOfficers") && (
            <div className="border-b border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-600">
              At least one owner/officer name is required.
            </div>
          )}
          {data.ownersOfficers.map((row, i) => (
            <Fragment key={i}>
              <Row
                label="Name"
                value={row.name}
                onChange={(v) => set("ownersOfficers", updateRow(data.ownersOfficers, i, { name: v }))}
                invalid={invalid("ownersOfficers") && i === 0}
              />
              <Row
                label="Designation"
                value={row.designation}
                onChange={(v) => set("ownersOfficers", updateRow(data.ownersOfficers, i, { designation: v }))}
              />
            </Fragment>
          ))}
          <div className="border-t border-slate-400 px-2 py-1.5">
            <button
              type="button"
              onClick={() => set("ownersOfficers", [...data.ownersOfficers, { name: "", designation: "" }])}
              className="font-sans text-xs font-medium text-slate-600 underline"
            >
              + Add another owner/officer
            </button>
          </div>
        </SectionTable>

        <SectionBar>IV. Products and Services Details *</SectionBar>
        <SectionTable invalid={invalid("productsServices")}>
          {invalid("productsServices") && (
            <div className="border-b border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-600">
              At least one product or service is required.
            </div>
          )}
          <div className="hidden border-t border-slate-400 first:border-t-0 sm:flex">
            <div className="flex-1 border-r border-slate-400 px-2 py-1.5 text-center text-xs font-bold text-slate-800">
              List of Products and Services
            </div>
            <div className="flex-1 px-2 py-1.5 text-center text-xs font-bold text-slate-800">
              Brands of Products and Services
            </div>
          </div>
          {data.productsServices.map((row, i) => (
            <div key={i} className="flex flex-col border-t border-slate-400 sm:flex-row">
              <div
                className={`flex items-center border-b border-slate-400 sm:flex-1 sm:border-b-0 sm:border-r ${
                  invalid("productsServices") && i === 0 ? "bg-red-50" : ""
                }`}
              >
                <span className="pl-2 text-[10px] text-slate-400 sm:hidden">Product/Service</span>
                <span className="hidden pl-2 text-xs text-slate-500 sm:inline">{i + 1}.</span>
                <input
                  value={row.product}
                  onChange={(e) => set("productsServices", updateRow(data.productsServices, i, { product: e.target.value }))}
                  className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>
              <div className="flex items-center sm:flex-1">
                <span className="pl-2 text-[10px] text-slate-400 sm:hidden">Brand</span>
                <span className="hidden pl-2 text-xs text-slate-500 sm:inline">{i + 1}.</span>
                <input
                  value={row.brand}
                  onChange={(e) => set("productsServices", updateRow(data.productsServices, i, { brand: e.target.value }))}
                  className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>
          ))}
          <div className="border-t border-slate-400 px-2 py-1.5">
            <button
              type="button"
              onClick={() => set("productsServices", [...data.productsServices, { product: "", brand: "" }])}
              className="font-sans text-xs font-medium text-slate-600 underline"
            >
              + Add another product/service
            </button>
          </div>
        </SectionTable>

        <SectionBar>V. Financial Information</SectionBar>
        <SectionTable>
          <Row label="Contact Person" value={data.finContactPerson} onChange={(v) => set("finContactPerson", v)} />
          <Row label="Designation" value={data.finDesignation} onChange={(v) => set("finDesignation", v)} />
          <Row label="Contact Number" value={data.finContactNumber} onChange={(v) => set("finContactNumber", v)} />
          <Row label="Email Address" value={data.finEmail} onChange={(v) => set("finEmail", v)} />
          {(
            [
              ["Primary Bank Details", "primaryBankName", "primaryAccountName", "primaryAccountNo", "primaryAccountType"],
              ["Secondary Bank Details", "secondaryBankName", "secondaryAccountName", "secondaryAccountNo", "secondaryAccountType"],
              ["Other Bank Details", "otherBankName", "otherAccountName", "otherAccountNo", "otherAccountType"],
            ] as const
          ).map(([label, bankKey, nameKey, noKey, typeKey]) => (
            <div key={label} className="flex flex-col border-t border-slate-400 sm:flex-row">
              <div className="w-full shrink-0 border-b border-slate-400 px-2 py-1.5 text-xs text-slate-700 sm:w-40 sm:border-r sm:border-b-0">
                <p>{label}</p>
                <input
                  value={data[bankKey]}
                  onChange={(e) => set(bankKey, e.target.value)}
                  placeholder="Bank name"
                  className="mt-1 w-full border-t border-slate-400 bg-transparent pt-1 text-xs text-slate-900 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <div className="flex">
                  <div className="w-32 shrink-0 border-r border-slate-400 px-2 py-1.5 text-xs text-slate-700">Account Name</div>
                  <input value={data[nameKey]} onChange={(e) => set(nameKey, e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none" />
                </div>
                <div className="flex border-t border-slate-400">
                  <div className="w-32 shrink-0 border-r border-slate-400 px-2 py-1.5 text-xs text-slate-700">Account No.</div>
                  <input value={data[noKey]} onChange={(e) => set(noKey, e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none" />
                </div>
                <div className="flex border-t border-slate-400">
                  <div className="w-32 shrink-0 border-r border-slate-400 px-2 py-1.5 text-xs text-slate-700">Type of Account</div>
                  <input value={data[typeKey]} onChange={(e) => set(typeKey, e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none" />
                </div>
              </div>
            </div>
          ))}
        </SectionTable>

        <SectionBar>VI. Declarations *</SectionBar>
        <SectionTable
          invalid={invalid("declTrueAndAccurate") || invalid("declAuthorizeVerify") || invalid("declGoodFaith")}
        >
          <DeclarationRow
            text="We hereby confirm that all the information provided in this Supplier Information Form is true, accurate, and complete to the best of our knowledge."
            checked={data.declTrueAndAccurate}
            onChange={(v) => set("declTrueAndAccurate", v)}
            invalid={invalid("declTrueAndAccurate")}
          />
          <DeclarationRow
            text="We authorize the requesting company to verify any of the details submitted for the purpose of due diligence, compliance, and vendor onboarding."
            checked={data.declAuthorizeVerify}
            onChange={(v) => set("declAuthorizeVerify", v)}
            invalid={invalid("declAuthorizeVerify")}
          />
          <DeclarationRow
            text="This declaration is made in good faith and in compliance with your requirements for supplier verification and corporate responsibility."
            checked={data.declGoodFaith}
            onChange={(v) => set("declGoodFaith", v)}
            invalid={invalid("declGoodFaith")}
          />
        </SectionTable>

        <SectionBar>VII. Compliance and Certifications</SectionBar>
        <SectionTable>
          <div className="border-t border-slate-400 px-2 py-1.5 text-[11px] text-slate-600 first:border-t-0">
            Information regarding your company&apos;s adherence to industry standards, regulations, and any relevant
            certifications (If any, e.g. ISO Certificate).
          </div>
          {data.complianceCerts.map((c, i) => (
            <div key={i} className="flex border-t border-slate-400">
              <div className="w-8 shrink-0 border-r border-slate-400 px-2 py-1.5 text-xs text-slate-500">{i + 1}.</div>
              <input
                value={c}
                onChange={(e) => set("complianceCerts", data.complianceCerts.map((v, idx) => (idx === i ? e.target.value : v)))}
                className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          ))}
          <div className="border-t border-slate-400 px-2 py-1.5">
            <button
              type="button"
              onClick={() => set("complianceCerts", [...data.complianceCerts, ""])}
              className="font-sans text-xs font-medium text-slate-600 underline"
            >
              + Add another
            </button>
          </div>
        </SectionTable>

        <SectionBar>VIII. Attachment of the Requirements *</SectionBar>
        <SectionTable invalid={invalid("requirementTypes") || invalid("requirementFiles")}>
          <div className="px-2 py-2 text-[11px] text-slate-600">
            Check off and upload at least one of the following. We&apos;ll create a Google Drive folder with your
            files and share it with your contact email automatically.
          </div>
          {mode === "edit" && data.attachmentsDriveLink && (
            <div className="border-t border-slate-400 px-2 py-1.5">
              <a
                href={data.attachmentsDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-xs font-medium text-blue-700 underline"
              >
                View your current Drive folder
              </a>
            </div>
          )}
          {(invalid("requirementTypes") || invalid("requirementFiles")) && (
            <div className="border-t border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-600">
              {invalid("requirementTypes")
                ? "Select at least one requirement type."
                : "Choose a file for every requirement type you checked."}
            </div>
          )}
          <div className="border-t border-slate-400 px-2 py-2">
            {SUPPLIER_REQUIREMENT_TYPES.map((t) => {
              const covered = alreadyCoveredTypes.has(t.key);
              const checked = covered || data.requirementTypes.includes(t.key);
              const filePending = !covered && checked && !newFiles[t.key];
              return (
                <div key={t.key} className="flex flex-col gap-1.5 py-1.5 sm:flex-row sm:items-center sm:gap-2 sm:py-1">
                  <label className="flex items-center gap-2">
                    <PrintCheckbox
                      checked={checked}
                      disabled={covered}
                      onChange={() => toggleRequirementType(t.key)}
                      invalid={filePending}
                    />
                    <span className="w-full text-xs text-slate-700 sm:w-64 sm:shrink-0">
                      {t.label}
                      {covered ? " (already provided)" : ""}
                    </span>
                  </label>
                  {checked && !covered && (
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => setNewFiles((f) => ({ ...f, [t.key]: e.target.files?.[0] ?? null }))}
                      className={`block w-full min-w-0 font-sans text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs sm:flex-1 ${
                        filePending ? "rounded border border-red-400 bg-red-50" : ""
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </SectionTable>

        <SectionBar>IX. Authorized Representative</SectionBar>
        <SectionTable invalid={invalid("repName")}>
          <Row label="Name *" value={data.repName} onChange={(v) => set("repName", v)} invalid={invalid("repName")} />
          <Row label="Department" value={data.repDepartment} onChange={(v) => set("repDepartment", v)} />
          <Row label="Designation" value={data.repDesignation} onChange={(v) => set("repDesignation", v)} />
          <Row label="Email Address" value={data.repEmail} onChange={(v) => set("repEmail", v)} />
        </SectionTable>

        <SectionBar>X. Declaration and Authorization Statement</SectionBar>
        <SectionTable invalid={invalid("finalConsent") || invalid("signatureName")}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-400 bg-slate-50 px-3 py-2">
            <p className="text-[10px] text-slate-600">
              {hasSignatureImage
                ? "Drag the signature image anywhere below, or drag its bottom-right corner to resize."
                : "Optionally attach a signature image — any image file — then drag it into place."}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-400 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50">
                {hasSignatureImage ? "Replace image" : "Upload signature image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleSignatureImagePick(e.target.files?.[0] ?? null)}
                />
              </label>
              {hasSignatureImage && (
                <button
                  type="button"
                  onClick={handleSignatureImageRemove}
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          {signatureImageError && (
            <p className="border-b border-slate-400 bg-red-50 px-3 py-1 text-[10px] text-red-600">
              {signatureImageError}
            </p>
          )}

          <div
            ref={sectionXBoxRef}
            className="relative"
            onPointerMove={onSignaturePointerMove}
            onPointerUp={endSignatureDrag}
            onPointerCancel={endSignatureDrag}
          >
            <div className="space-y-2 px-3 py-3 text-[11px] leading-relaxed text-slate-700">
              <p>
                By completing and submitting this form, we affirm and certify that the information furnished herein
                is, to the best of our knowledge and belief, true, accurate, and complete in all respects. We
                recognize and agree that any omission, misstatement, or falsification of material facts may lead to
                the rejection of our application, the rescission of any agreement entered into on the basis of this
                information, or such other actions by Revlv Solutions Inc. as may be appropriate under the
                circumstances.
              </p>
              <p>
                We grant Revlv Solutions Inc. the authority to collect, retain, use, and process the data and
                documentation provided in this form for client communication, verification, risk assessment,
                regulatory compliance, and other legitimate business functions, handled in accordance with
                applicable data protection and privacy laws.
              </p>
            </div>
            <label
              className={`flex items-start gap-2 border-t border-slate-400 px-3 py-2 text-xs font-bold ${
                invalid("finalConsent") ? "bg-red-50 text-red-700" : "text-slate-800"
              }`}
            >
              <PrintCheckbox
                checked={data.finalConsent}
                onChange={(v) => set("finalConsent", v)}
                invalid={invalid("finalConsent")}
              />
              I have read, understood, and agree to this declaration and authorization statement.
            </label>
            <div className="flex flex-col gap-4 border-t border-slate-400 px-3 py-4 sm:flex-row sm:gap-6">
              <div className="flex-1">
                <input
                  value={data.signatureName}
                  onChange={(e) => set("signatureName", e.target.value)}
                  className={`w-full border-b bg-transparent pb-1 text-xs focus:outline-none ${
                    invalid("signatureName")
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-slate-800 text-slate-900"
                  }`}
                />
                <p className={`mt-1 text-[10px] ${invalid("signatureName") ? "text-red-600" : "text-slate-500"}`}>
                  Signature Over Printed Name *
                </p>
              </div>
              <div className="flex-1">
                <input
                  value={data.signatureDesignation}
                  onChange={(e) => set("signatureDesignation", e.target.value)}
                  className="w-full border-b border-slate-800 bg-transparent pb-1 text-xs text-slate-900 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-slate-500">Designation</p>
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={data.signatureDate}
                  onChange={(e) => set("signatureDate", e.target.value)}
                  className="w-full border-b border-slate-800 bg-transparent pb-1 text-xs text-slate-900 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-slate-500">Date</p>
              </div>
            </div>

            {hasSignatureImage && (
              <div
                className="group absolute z-10 touch-none"
                style={{
                  left: `${sigPos.x * 100}%`,
                  top: `${sigPos.y * 100}%`,
                  width: `${sigPos.width * 100}%`,
                  height: `${sigPos.height * 100}%`,
                }}
              >
                <div
                  onPointerDown={(e) => startSignatureDrag(e, "move")}
                  className="h-full w-full cursor-move border border-dashed border-blue-400/70 bg-white/40 hover:border-blue-500"
                >
                  <img
                    src={signatureImagePreview || data.signatureImageDataUrl}
                    alt="Signature"
                    draggable={false}
                    className="h-full w-full select-none object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSignatureImageRemove}
                  title="Remove signature image"
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-red-300 bg-white text-[10px] font-bold text-red-600 opacity-0 shadow group-hover:opacity-100"
                >
                  ×
                </button>
                <div
                  onPointerDown={(e) => startSignatureDrag(e, "resize")}
                  title="Drag to resize"
                  className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-blue-500 bg-white"
                />
              </div>
            )}
          </div>
        </SectionTable>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 font-sans text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
        >
          {submitting ? "Submitting..." : mode === "create" ? "Submit Supplier Information Form" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
