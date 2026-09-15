import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isValidRequirementType } from "@/lib/supplierRequirements";

export const ownerOfficerSchema = z.object({
  name: z.string().min(1),
  designation: z.string().optional().default(""),
});

export const productServiceSchema = z.object({
  product: z.string().min(1),
  brand: z.string().optional().default(""),
});

// Shape of the JSON "data" field sent alongside file uploads on
// create/update. Everything not explicitly required mirrors the source
// PDF, where most sections are informational rather than mandatory.
export const supplierSubmissionSchema = z.object({
  // I. Company Information
  companyName: z.string().min(1, "Company name is required."),
  registeredAddress: z.string().min(1, "Registered address is required."),
  tin: z.string().optional(),
  businessType: z.string().optional(),
  businessRegistrationNo: z.string().optional(),
  companyWebsite: z.string().optional(),
  yearEstablished: z.string().optional(),
  branches: z.string().optional(),

  // II. Contact Details
  contactPerson: z.string().min(1, "Contact person is required."),
  contactDesignation: z.string().optional(),
  contactEmail: z.string().email("A valid contact email is required."),
  contactMobile: z.string().optional(),

  // III. Owners / Officers
  ownersOfficers: z.array(ownerOfficerSchema).min(1, "At least one owner/officer is required."),

  // IV. Products and Services
  productsServices: z.array(productServiceSchema).min(1, "At least one product or service is required."),

  // V. Financial Information
  finContactPerson: z.string().optional(),
  finDesignation: z.string().optional(),
  finContactNumber: z.string().optional(),
  finEmail: z.string().optional(),
  primaryBankName: z.string().optional(),
  primaryAccountName: z.string().optional(),
  primaryAccountNo: z.string().optional(),
  primaryAccountType: z.string().optional(),
  secondaryBankName: z.string().optional(),
  secondaryAccountName: z.string().optional(),
  secondaryAccountNo: z.string().optional(),
  secondaryAccountType: z.string().optional(),
  otherBankName: z.string().optional(),
  otherAccountName: z.string().optional(),
  otherAccountNo: z.string().optional(),
  otherAccountType: z.string().optional(),

  // VI. Declarations — all required true
  declTrueAndAccurate: z.literal(true, { message: "You must confirm this declaration." }),
  declAuthorizeVerify: z.literal(true, { message: "You must confirm this declaration." }),
  declGoodFaith: z.literal(true, { message: "You must confirm this declaration." }),

  // VII. Compliance and Certifications
  complianceCerts: z.array(z.string().min(1)).optional().default([]),

  // VIII. Attachment of the Requirements — the requestor picks which
  // document types they're providing and uploads a file for each new one;
  // the server creates/updates a Google Drive folder from those files
  // (see the "file:<TYPE>" multipart entries) and sets the resulting link
  // itself — attachmentsDriveLink is never client-supplied.
  requirementTypes: z
    .array(z.string().refine(isValidRequirementType))
    .min(1, "Select at least one requirement type."),

  // IX. Authorized Representative
  repName: z.string().min(1, "Authorized representative name is required."),
  repDepartment: z.string().optional(),
  repDesignation: z.string().optional(),
  repEmail: z.string().optional(),

  // X. Declaration and Authorization Statement
  finalConsent: z.literal(true, { message: "You must accept the declaration and authorization statement." }),
  signatureName: z.string().min(1, "Signature over printed name is required."),
  signatureDesignation: z.string().optional(),
  signatureDate: z.string().optional(), // YYYY-MM-DD

  // Signature image placement — fractions (0-1) of the Section X box the
  // requestor dragged/resized it to. Only meaningful alongside an actual
  // image (new upload or one already on file).
  signatureImageX: z.number().min(0).max(1).optional(),
  signatureImageY: z.number().min(0).max(1).optional(),
  signatureImageWidth: z.number().min(0).max(1).optional(),
  signatureImageHeight: z.number().min(0).max(1).optional(),
  // Explicit "delete the signature image" action, distinct from simply not
  // sending a new file (which means "leave it as-is").
  removeSignatureImage: z.boolean().optional().default(false),
});

export type SupplierSubmissionInput = z.infer<typeof supplierSubmissionSchema>;

/**
 * Fields derived from the JSON payload alone — does NOT include
 * attachmentsDriveLink/driveFolderId, which the route sets after the
 * Drive API call completes.
 */
export function toPrismaData(input: SupplierSubmissionInput) {
  return {
    companyName: input.companyName,
    registeredAddress: input.registeredAddress,
    tin: input.tin || null,
    businessType: input.businessType || null,
    businessRegistrationNo: input.businessRegistrationNo || null,
    companyWebsite: input.companyWebsite || null,
    yearEstablished: input.yearEstablished || null,
    branches: input.branches || null,

    contactPerson: input.contactPerson,
    contactDesignation: input.contactDesignation || null,
    contactEmail: input.contactEmail,
    contactMobile: input.contactMobile || null,

    ownersOfficersJson: JSON.stringify(input.ownersOfficers),
    productsServicesJson: JSON.stringify(input.productsServices),

    finContactPerson: input.finContactPerson || null,
    finDesignation: input.finDesignation || null,
    finContactNumber: input.finContactNumber || null,
    finEmail: input.finEmail || null,
    primaryBankName: input.primaryBankName || null,
    primaryAccountName: input.primaryAccountName || null,
    primaryAccountNo: input.primaryAccountNo || null,
    primaryAccountType: input.primaryAccountType || null,
    secondaryBankName: input.secondaryBankName || null,
    secondaryAccountName: input.secondaryAccountName || null,
    secondaryAccountNo: input.secondaryAccountNo || null,
    secondaryAccountType: input.secondaryAccountType || null,
    otherBankName: input.otherBankName || null,
    otherAccountName: input.otherAccountName || null,
    otherAccountNo: input.otherAccountNo || null,
    otherAccountType: input.otherAccountType || null,

    declTrueAndAccurate: input.declTrueAndAccurate,
    declAuthorizeVerify: input.declAuthorizeVerify,
    declGoodFaith: input.declGoodFaith,

    complianceCertsJson: JSON.stringify(input.complianceCerts ?? []),

    requirementTypesJson: JSON.stringify(input.requirementTypes),

    repName: input.repName,
    repDepartment: input.repDepartment || null,
    repDesignation: input.repDesignation || null,
    repEmail: input.repEmail || null,

    finalConsent: input.finalConsent,
    signatureName: input.signatureName,
    signatureDesignation: input.signatureDesignation || null,
    signatureDate: input.signatureDate ? new Date(`${input.signatureDate}T00:00:00Z`) : null,
  };
}

/** Public lookup by the supplier's private edit token. */
export async function findSubmissionByToken(token: string) {
  return prisma.supplierSubmission.findUnique({
    where: { editToken: token },
  });
}

function extractDriveFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Public lookup that also accepts a pasted Google Drive folder link —
 * used only for "continue with an existing submission" (read access), not
 * for editing. A submission's Drive folder is only known to the requestor
 * and whoever they shared it with, so it's a reasonable proof of
 * ownership, same as the edit token.
 */
export async function findSubmissionByTokenOrDriveLink(input: string) {
  const trimmed = input.trim();
  const byToken = await findSubmissionByToken(trimmed);
  if (byToken) return byToken;

  const folderId = extractDriveFolderId(trimmed);
  if (!folderId) return null;
  return prisma.supplierSubmission.findFirst({ where: { driveFolderId: folderId } });
}

/** Maps a DB row (JSON-string fields) back into the form's editable shape. */
export function toFormData(submission: Awaited<ReturnType<typeof findSubmissionByToken>>) {
  if (!submission) return null;
  return {
    companyName: submission.companyName,
    registeredAddress: submission.registeredAddress,
    tin: submission.tin ?? "",
    businessType: submission.businessType ?? "",
    businessRegistrationNo: submission.businessRegistrationNo ?? "",
    companyWebsite: submission.companyWebsite ?? "",
    yearEstablished: submission.yearEstablished ?? "",
    branches: submission.branches ?? "",

    contactPerson: submission.contactPerson,
    contactDesignation: submission.contactDesignation ?? "",
    contactEmail: submission.contactEmail,
    contactMobile: submission.contactMobile ?? "",

    ownersOfficers: JSON.parse(submission.ownersOfficersJson || "[]"),
    productsServices: JSON.parse(submission.productsServicesJson || "[]"),

    finContactPerson: submission.finContactPerson ?? "",
    finDesignation: submission.finDesignation ?? "",
    finContactNumber: submission.finContactNumber ?? "",
    finEmail: submission.finEmail ?? "",
    primaryBankName: submission.primaryBankName ?? "",
    primaryAccountName: submission.primaryAccountName ?? "",
    primaryAccountNo: submission.primaryAccountNo ?? "",
    primaryAccountType: submission.primaryAccountType ?? "",
    secondaryBankName: submission.secondaryBankName ?? "",
    secondaryAccountName: submission.secondaryAccountName ?? "",
    secondaryAccountNo: submission.secondaryAccountNo ?? "",
    secondaryAccountType: submission.secondaryAccountType ?? "",
    otherBankName: submission.otherBankName ?? "",
    otherAccountName: submission.otherAccountName ?? "",
    otherAccountNo: submission.otherAccountNo ?? "",
    otherAccountType: submission.otherAccountType ?? "",

    declTrueAndAccurate: submission.declTrueAndAccurate,
    declAuthorizeVerify: submission.declAuthorizeVerify,
    declGoodFaith: submission.declGoodFaith,

    complianceCerts: JSON.parse(submission.complianceCertsJson || "[]"),

    attachmentsDriveLink: submission.attachmentsDriveLink,
    requirementTypes: JSON.parse(submission.requirementTypesJson || "[]"),

    repName: submission.repName,
    repDepartment: submission.repDepartment ?? "",
    repDesignation: submission.repDesignation ?? "",
    repEmail: submission.repEmail ?? "",

    finalConsent: submission.finalConsent,
    signatureName: submission.signatureName,
    signatureDesignation: submission.signatureDesignation ?? "",
    signatureDate: submission.signatureDate ? submission.signatureDate.toISOString().slice(0, 10) : "",
    signatureImageDataUrl: submission.signatureImageDataUrl ?? "",
    signatureImageX: submission.signatureImageX ?? undefined,
    signatureImageY: submission.signatureImageY ?? undefined,
    signatureImageWidth: submission.signatureImageWidth ?? undefined,
    signatureImageHeight: submission.signatureImageHeight ?? undefined,
  };
}
