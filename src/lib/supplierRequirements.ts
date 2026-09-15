// VIII. ATTACHMENT OF THE REQUIREMENTS — from the Supplier Information
// Form. At least one of these must be uploaded before a submission can be
// saved.
export const SUPPLIER_REQUIREMENT_TYPES = [
  { key: "BUSINESS_PERMIT", label: "Business Permit" },
  { key: "SEC_OR_DTI_REGISTRATION", label: "SEC Registration Certificate or DTI Registration" },
  { key: "BIR_FORM_2303", label: "BIR Form 2303" },
  { key: "TAX_CLEARANCE", label: "Tax Clearance" },
  { key: "AUDITED_FINANCIAL_STATEMENT", label: "Audited Financial Statement (AFS)" },
  { key: "CERTIFICATE_OF_INSURANCE", label: "Certificate of Insurance (if any)" },
  { key: "ISO_CERTIFICATE", label: "ISO Certificate (if any)" },
  { key: "COMPANY_PROFILE", label: "Company Profile" },
  { key: "CATALOGUE_OF_PRODUCTS_AND_SERVICES", label: "Catalogue of Products and Services" },
] as const;

export type SupplierRequirementType = (typeof SUPPLIER_REQUIREMENT_TYPES)[number]["key"];

const VALID_KEYS = new Set(SUPPLIER_REQUIREMENT_TYPES.map((t) => t.key));

export function isValidRequirementType(key: string): key is SupplierRequirementType {
  return VALID_KEYS.has(key as SupplierRequirementType);
}

export function requirementLabel(key: string): string {
  return SUPPLIER_REQUIREMENT_TYPES.find((t) => t.key === key)?.label ?? key;
}
