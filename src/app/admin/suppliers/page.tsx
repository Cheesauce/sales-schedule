import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteSupplierSubmissionButton } from "@/components/DeleteSupplierSubmissionButton";

export default async function SuppliersPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN") redirect("/");

  const submissions = await prisma.supplierSubmission.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyName: true,
      contactPerson: true,
      contactEmail: true,
      attachmentsDriveLink: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { meetingRequests: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Supplier Information Forms</h1>
        <Link
          href="/admin/suppliers/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Add existing supplier
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Every supplier/client who submitted the Supplier Information Form before requesting a meeting.
      </p>

      <div className="mt-8 space-y-2">
        {submissions.length === 0 ? (
          <p className="text-sm text-slate-500">No submissions yet.</p>
        ) : (
          submissions.map((s) => (
            <Link
              key={s.id}
              href={`/admin/suppliers/${s.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{s.companyName}</p>
                  <p className="text-sm text-slate-600">
                    {s.contactPerson} · {s.contactEmail}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right text-xs text-slate-400">
                    <p>{s.attachmentsDriveLink ? "Drive link attached" : "No Drive link"}</p>
                    <p>{s._count.meetingRequests} meeting request{s._count.meetingRequests === 1 ? "" : "s"}</p>
                    <p>Submitted {new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  <DeleteSupplierSubmissionButton id={s.id} companyName={s.companyName} />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
