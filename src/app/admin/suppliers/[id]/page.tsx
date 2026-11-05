import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirementLabel } from "@/lib/supplierRequirements";
import { DeleteSupplierSubmissionButton } from "@/components/DeleteSupplierSubmissionButton";
import { CopyLinkButton } from "@/components/CopyLinkButton";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-slate-100 py-1.5 text-sm last:border-0 sm:grid-cols-3 sm:gap-2 sm:py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="break-words text-slate-900 sm:col-span-2">{value}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <h2 className="rounded-t-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white">{title}</h2>
      <div className="p-3">{children}</div>
    </div>
  );
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN" && role !== "SALES") redirect("/");

  const { id } = await params;
  const s = await prisma.supplierSubmission.findUnique({
    where: { id },
    include: { meetingRequests: { select: { id: true, topic: true, status: true, date: true } } },
  });
  if (!s) notFound();

  const ownersOfficers: { name: string; designation: string }[] = JSON.parse(s.ownersOfficersJson || "[]");
  const productsServices: { product: string; brand: string }[] = JSON.parse(s.productsServicesJson || "[]");
  const complianceCerts: string[] = JSON.parse(s.complianceCertsJson || "[]");
  const requirementTypes: string[] = JSON.parse(s.requirementTypesJson || "[]");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{s.companyName}</h1>
          <p className="mt-1 text-sm text-slate-500">Submitted {new Date(s.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/supplier-submissions/${s.id}/pdf`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Download PDF
          </a>
          {role === "ADMIN" && <DeleteSupplierSubmissionButton id={s.id} companyName={s.companyName} redirectTo="/admin/suppliers" />}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="font-medium text-slate-500">Private edit link</span>
        <code className="min-w-0 flex-1 truncate">{`/supplier-form/edit/${s.editToken}`}</code>
        <CopyLinkButton text={`/supplier-form/edit/${s.editToken}`} label="Copy link" />
        <span className="basis-full text-slate-400 sm:basis-auto">
          — if a requester lost theirs, this is what to send them.
        </span>
      </div>

      <div className="mt-6 space-y-4">
        <SectionCard title="I. Company Information">
          <Row label="Company Name" value={s.companyName} />
          <Row label="Registered Address" value={s.registeredAddress} />
          <Row label="TIN" value={s.tin} />
          <Row label="Business Type" value={s.businessType} />
          <Row label="Business Registration No." value={s.businessRegistrationNo} />
          <Row label="Company Website" value={s.companyWebsite} />
          <Row label="Year Established" value={s.yearEstablished} />
          <Row label="Branch(es)" value={s.branches} />
        </SectionCard>

        <SectionCard title="II. Contact Details">
          <Row label="Contact Person" value={s.contactPerson} />
          <Row label="Designation" value={s.contactDesignation} />
          <Row label="Email Address" value={s.contactEmail} />
          <Row label="Mobile No." value={s.contactMobile} />
        </SectionCard>

        <SectionCard title="III. Owners / Officers (C-Level)">
          {ownersOfficers.length === 0 ? (
            <p className="text-sm text-slate-400">None listed.</p>
          ) : (
            ownersOfficers.map((o, i) => (
              <Row key={i} label={o.name} value={o.designation || "—"} />
            ))
          )}
        </SectionCard>

        <SectionCard title="IV. Products and Services">
          {productsServices.length === 0 ? (
            <p className="text-sm text-slate-400">None listed.</p>
          ) : (
            productsServices.map((p, i) => <Row key={i} label={p.product} value={p.brand || "—"} />)
          )}
        </SectionCard>

        <SectionCard title="V. Financial Information">
          <Row label="Contact Person" value={s.finContactPerson} />
          <Row label="Designation" value={s.finDesignation} />
          <Row label="Contact Number" value={s.finContactNumber} />
          <Row label="Email" value={s.finEmail} />
          <Row
            label="Primary Bank"
            value={
              [s.primaryBankName, s.primaryAccountName, s.primaryAccountNo, s.primaryAccountType]
                .filter(Boolean)
                .join(" · ") || null
            }
          />
          <Row
            label="Secondary Bank"
            value={
              [s.secondaryBankName, s.secondaryAccountName, s.secondaryAccountNo, s.secondaryAccountType]
                .filter(Boolean)
                .join(" · ") || null
            }
          />
          <Row
            label="Other Bank"
            value={
              [s.otherBankName, s.otherAccountName, s.otherAccountNo, s.otherAccountType]
                .filter(Boolean)
                .join(" · ") || null
            }
          />
        </SectionCard>

        <SectionCard title="VI. Declarations">
          <p className="text-sm text-slate-700">
            {s.declTrueAndAccurate && s.declAuthorizeVerify && s.declGoodFaith
              ? "All three declarations confirmed."
              : "Not all declarations were confirmed — check the record."}
          </p>
        </SectionCard>

        <SectionCard title="VII. Compliance and Certifications">
          {complianceCerts.length === 0 ? (
            <p className="text-sm text-slate-400">None listed.</p>
          ) : (
            <ul className="list-inside list-disc text-sm text-slate-700">
              {complianceCerts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="VIII. Attachments">
          {s.attachmentsDriveLink ? (
            <>
              <a
                href={s.attachmentsDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm font-medium text-blue-600 underline"
              >
                {s.attachmentsDriveLink}
              </a>
              {requirementTypes.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
                  {requirementTypes.map((t) => (
                    <li key={t}>{requirementLabel(t)}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">No Drive link provided.</p>
          )}
        </SectionCard>

        <SectionCard title="IX. Authorized Representative">
          <Row label="Name" value={s.repName} />
          <Row label="Department" value={s.repDepartment} />
          <Row label="Designation" value={s.repDesignation} />
          <Row label="Email" value={s.repEmail} />
        </SectionCard>

        <SectionCard title="X. Declaration and Authorization">
          <Row label="Consent" value={s.finalConsent ? "Accepted" : "Not accepted"} />
          <Row label="Signature Over Printed Name" value={s.signatureName} />
          <Row label="Designation" value={s.signatureDesignation} />
          <Row label="Date" value={s.signatureDate ? s.signatureDate.toISOString().slice(0, 10) : null} />
        </SectionCard>

        <SectionCard title="Meeting Requests from this Submission">
          {s.meetingRequests.length === 0 ? (
            <p className="text-sm text-slate-400">None yet.</p>
          ) : (
            s.meetingRequests.map((m) => (
              <Row
                key={m.id}
                label={m.topic}
                value={`${m.status} · ${new Date(m.date).toLocaleDateString(undefined, { timeZone: "UTC" })}`}
              />
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}
