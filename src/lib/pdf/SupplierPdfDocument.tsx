import path from "path";
import { Document, Page, View, Text, Image, Svg, Path, StyleSheet } from "@react-pdf/renderer";
import type { SupplierSubmission } from "@prisma/client";
import { SUPPLIER_REQUIREMENT_TYPES } from "@/lib/supplierRequirements";

// Mirrors the company's printed "Supplier Information Form" — see
// public/revlv-logo.png and the header bar color, both sampled directly
// from the source PDF (#BF0000).
const RED = "#BF0000";
const BORDER = "#9CA3AF";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 9,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 36,
    color: "#111827",
  },
  header: {
    // Normal document flow (not `position: absolute`) — a fixed-position
    // header needs the page's paddingTop to *guess* its rendered height in
    // advance, and that guess drifted out of sync with the actual content,
    // making the divider line cut through the title below it. Flow-based
    // + `fixed` on the View repeats it correctly on every page without
    // guessing anything.
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: "#374151",
    paddingBottom: 8,
    marginBottom: 14,
  },
  logo: { width: 130, height: 34 },
  addressBlock: { textAlign: "right", fontSize: 8, lineHeight: 1.4 },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  sectionBar: {
    backgroundColor: RED,
    color: "#FFFFFF",
    fontFamily: "Times-Bold",
    fontSize: 9.5,
    padding: 4,
    paddingLeft: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 0,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  rowFirst: { borderTopWidth: 0 },
  labelCell: {
    width: 130,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
  },
  valueCell: { flex: 1, padding: 4, justifyContent: "center" },
  // react-pdf silently drops the parent table's own bottom border when an
  // italic note like this is its last child (confirmed by isolated repro)
  // — giving the note its own top+bottom border sidesteps that entirely.
  italicNote: {
    fontFamily: "Times-Italic",
    fontSize: 8,
    padding: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  checkboxRow: { flexDirection: "row", alignItems: "center", padding: 3 },
  checkbox: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: "#374151",
    marginRight: 5,
  },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View wrap={false}>
      <View style={styles.sectionBar}>
        <Text>{title}</Text>
      </View>
      <View style={styles.table}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  first,
}: {
  label: string;
  value?: string | null;
  first?: boolean;
}) {
  return (
    <View style={[styles.row, first ? styles.rowFirst : {}]}>
      <View style={styles.labelCell}>
        <Text>{label}</Text>
      </View>
      <View style={styles.valueCell}>
        <Text>{value || ""}</Text>
      </View>
    </View>
  );
}

function Row2({
  labelA,
  valueA,
  labelB,
  valueB,
  first,
}: {
  labelA: string;
  valueA?: string | null;
  labelB: string;
  valueB?: string | null;
  first?: boolean;
}) {
  return (
    <View style={[styles.row, first ? styles.rowFirst : {}]}>
      <View style={styles.labelCell}>
        <Text>{labelA}</Text>
      </View>
      <View style={[styles.valueCell, { borderRightWidth: 1, borderRightColor: BORDER, flex: 1 }]}>
        <Text>{valueA || ""}</Text>
      </View>
      <View style={styles.labelCell}>
        <Text>{labelB}</Text>
      </View>
      <View style={styles.valueCell}>
        <Text>{valueB || ""}</Text>
      </View>
    </View>
  );
}

// IV. Products/Services — each cell is "1.  <value>" as ONE unified
// fill-in-the-blank (no border between the number and the value) — unlike
// Row2's genuinely paired label:value fields (e.g. Business Type /
// Business Registration No.), which do have that divider by design.
function ProductHeaderRow() {
  return (
    <View style={[styles.row, styles.rowFirst]}>
      <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: BORDER, padding: 4 }}>
        <Text style={{ fontFamily: "Times-Bold", textAlign: "center" }}>List of Products and Services</Text>
      </View>
      <View style={{ flex: 1, padding: 4 }}>
        <Text style={{ fontFamily: "Times-Bold", textAlign: "center" }}>Brands of Products and Services</Text>
      </View>
    </View>
  );
}

function ProductRow({ index, product, brand }: { index: number; product?: string | null; brand?: string | null }) {
  return (
    <View style={styles.row}>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          borderRightWidth: 1,
          borderRightColor: BORDER,
          padding: 4,
        }}
      >
        <Text style={{ color: "#6B7280", marginRight: 4 }}>{index}.</Text>
        <Text>{product || ""}</Text>
      </View>
      <View style={{ flex: 1, flexDirection: "row", padding: 4 }}>
        <Text style={{ color: "#6B7280", marginRight: 4 }}>{index}.</Text>
        <Text>{brand || ""}</Text>
      </View>
    </View>
  );
}

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={styles.checkboxRow}>
      <View style={styles.checkbox}>
        {checked && (
          // react-pdf silently fails to render a tiny bold Text glyph at
          // this size (verified) — an SVG tick renders reliably instead.
          <Svg viewBox="0 0 9 9" width={9} height={9}>
            <Path d="M1.5 4.8 L3.5 7 L7.5 2" stroke="#111827" strokeWidth={1.4} fill="none" />
          </Svg>
        )}
      </View>
      <Text>{label}</Text>
    </View>
  );
}

const PageHeader = () => (
  <View style={styles.header} fixed>
    <Image src={path.join(process.cwd(), "public", "revlv-logo.png")} style={styles.logo} />
    <View style={styles.addressBlock}>
      <Text>Unit 26N Burgundy Corporate Tower,</Text>
      <Text>252 Senator Gil Puyat Avenue Makati City</Text>
      <Text>P: +632 5310 6069 | +632 7001 4416</Text>
      <Text>M: 0906-455-8559 / 09951319962</Text>
      <Text>E: sales@revlv.com   W: www.revlv.com</Text>
      <Text>TIN: 008-745-077-000</Text>
    </View>
  </View>
);

export interface SupplierPdfProps {
  submission: SupplierSubmission;
}

export function SupplierPdfDocument({ submission: s }: SupplierPdfProps) {
  const ownersOfficers: { name: string; designation: string }[] = JSON.parse(s.ownersOfficersJson || "[]");
  const productsServices: { product: string; brand: string }[] = JSON.parse(s.productsServicesJson || "[]");
  const complianceCerts: string[] = JSON.parse(s.complianceCertsJson || "[]");
  const requirementTypes: string[] = JSON.parse(s.requirementTypesJson || "[]");

  const ownerRows = Array.from({ length: Math.max(3, ownersOfficers.length) }, (_, i) => ownersOfficers[i]);
  const productRows = Array.from({ length: Math.max(8, productsServices.length) }, (_, i) => productsServices[i]);
  const certRows = Array.from({ length: Math.max(3, complianceCerts.length) }, (_, i) => complianceCerts[i]);

  const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.title}>SUPPLIER INFORMATION FORM</Text>

        <Section title="I. COMPANY INFORMATION">
          <Row first label="Company Name" value={s.companyName} />
          <Row label="Registered Address" value={s.registeredAddress} />
          <Row label="TIN" value={s.tin} />
          <Row2 labelA="Business Type" valueA={s.businessType} labelB="Business Registration No." valueB={s.businessRegistrationNo} />
          <Row2 labelA="Company Website" valueA={s.companyWebsite} labelB="Year Established" valueB={s.yearEstablished} />
          <Row label="Branch (if any)" value={s.branches} />
        </Section>

        <Section title="II. CONTACT DETAILS">
          <Row first label="Contact Person" value={s.contactPerson} />
          <Row label="Designation" value={s.contactDesignation} />
          <Row label="Email Address" value={s.contactEmail} />
          <Row label="Mobile No." value={s.contactMobile} />
          <View style={styles.italicNote}>
            <Text>Attach separate list for other contact person per account/product</Text>
          </View>
        </Section>

        <Section title="III. OWNERS / OFFICERS (C-LEVEL)">
          {ownerRows.map((o, i) => (
            <View key={i}>
              <Row first={i === 0} label="Name" value={o?.name} />
              <Row label="Designation" value={o?.designation} />
            </View>
          ))}
          <View style={styles.italicNote}>
            <Text>Attached separate list for other owners/officers</Text>
          </View>
        </Section>

        <Section title="IV. PRODUCTS AND SERVICES DETAILS">
          <ProductHeaderRow />
          {productRows.map((p, i) => (
            <ProductRow key={i} index={i + 1} product={p?.product} brand={p?.brand} />
          ))}
          <View style={styles.italicNote}>
            <Text>Attached separate list for other products and services</Text>
          </View>
        </Section>

        <Section title="V. FINANCIAL INFORMATION">
          <Row first label="Contact Person" value={s.finContactPerson} />
          <Row label="Designation" value={s.finDesignation} />
          <Row label="Contact Number" value={s.finContactNumber} />
          <Row label="Email Address" value={s.finEmail} />
          {(
            [
              ["Primary Bank Details", s.primaryBankName, s.primaryAccountName, s.primaryAccountNo, s.primaryAccountType],
              ["Secondary Bank Details", s.secondaryBankName, s.secondaryAccountName, s.secondaryAccountNo, s.secondaryAccountType],
              ["Other Bank Details", s.otherBankName, s.otherAccountName, s.otherAccountNo, s.otherAccountType],
            ] as const
          ).map(([label, bankName, accName, accNo, accType], i) => (
            <View key={i} style={styles.row}>
              <View style={styles.labelCell}>
                <Text>{label}</Text>
                {bankName ? <Text style={{ marginTop: 2 }}>{bankName}</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Row first label="Account Name" value={accName} />
                <Row label="Account No." value={accNo} />
                <Row label="Type of Account" value={accType} />
              </View>
            </View>
          ))}
        </Section>

        <Section title="VI. DECLARATIONS">
          {[
            ["We hereby confirm that all the information provided in this Supplier Information Form is true, accurate, and complete to the best of our knowledge.", s.declTrueAndAccurate],
            ["We authorize the requesting company to verify any of the details submitted for the purpose of due diligence, compliance, and vendor onboarding.", s.declAuthorizeVerify],
            ["This declaration is made in good faith and in compliance with your requirements for supplier verification and corporate responsibility.", s.declGoodFaith],
          ].map(([text, checked], i) => (
            <View key={i} style={[styles.row, i === 0 ? styles.rowFirst : {}]}>
              <View style={[styles.valueCell, { flex: 1 }]}>
                <Text>{text as string}</Text>
              </View>
              <View style={{ width: 55, borderLeftWidth: 1, borderLeftColor: BORDER, justifyContent: "center" }}>
                <Checkbox checked={checked as boolean} label="YES" />
              </View>
            </View>
          ))}
        </Section>

        <Section title="VII. COMPLIANCE AND CERTIFICATIONS">
          <View style={{ padding: 4, borderBottomWidth: 1, borderBottomColor: BORDER }}>
            <Text>
              Information regarding your company&apos;s adherence to industry standards, regulations, and any
              relevant certifications.
            </Text>
          </View>
          {certRows.map((c, i) => (
            <Row key={i} label={`${i + 1}.`} value={c} />
          ))}
        </Section>

        <Section title="VIII. ATTACHMENT OF THE REQUIREMENTS">
          <View style={{ padding: 4 }}>
            {SUPPLIER_REQUIREMENT_TYPES.map((t) => (
              <Checkbox key={t.key} checked={requirementTypes.includes(t.key)} label={t.label} />
            ))}
            {s.attachmentsDriveLink && (
              <Text style={{ marginTop: 6, fontFamily: "Times-Italic" }}>
                Documents: {s.attachmentsDriveLink}
              </Text>
            )}
          </View>
        </Section>

        <Section title="IX. AUTHORIZED REPRESENTATIVE">
          <Row first label="Name" value={s.repName} />
          <Row label="Department" value={s.repDepartment} />
          <Row label="Designation" value={s.repDesignation} />
          <Row label="Email Address" value={s.repEmail} />
        </Section>

        <View wrap={false}>
          <View style={styles.sectionBar}>
            <Text>X. DECLARATION AND AUTHORIZATION STATEMENT</Text>
          </View>
          <View style={[styles.table, { padding: 6, position: "relative" }]}>
            <Text style={{ marginBottom: 6, lineHeight: 1.4 }}>
              By completing and submitting this form, we affirm and certify that the information furnished herein
              is, to the best of our knowledge and belief, true, accurate, and complete in all respects.
            </Text>
            <Text style={{ marginBottom: 6, lineHeight: 1.4 }}>
              We grant Revlv Solutions Inc. the authority to collect, retain, use, and process the data and
              documentation provided in this form for all legitimate business purposes, handled in accordance with
              applicable data protection and privacy laws.
            </Text>
            <Checkbox
              checked={s.finalConsent}
              label="I have read, understood, and agree to this declaration and authorization statement."
            />
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ borderBottomWidth: 1, borderBottomColor: "#374151", paddingBottom: 2 }}>
                  {s.signatureName}
                </Text>
                <Text style={{ fontSize: 7.5, color: "#4B5563" }}>Signature Over Printed Name</Text>
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ borderBottomWidth: 1, borderBottomColor: "#374151", paddingBottom: 2 }}>
                  {s.signatureDesignation}
                </Text>
                <Text style={{ fontSize: 7.5, color: "#4B5563" }}>Designation</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ borderBottomWidth: 1, borderBottomColor: "#374151", paddingBottom: 2 }}>
                  {fmtDate(s.signatureDate)}
                </Text>
                <Text style={{ fontSize: 7.5, color: "#4B5563" }}>Date</Text>
              </View>
            </View>

            {/* Signature image — free-placed by the requestor as fractions
                of this same box, drawn last so it sits on top of the text. */}
            {s.signatureImageDataUrl && (
              <Image
                src={s.signatureImageDataUrl}
                style={{
                  position: "absolute",
                  left: `${(s.signatureImageX ?? 0.03) * 100}%`,
                  top: `${(s.signatureImageY ?? 0.55) * 100}%`,
                  width: `${(s.signatureImageWidth ?? 0.2) * 100}%`,
                  height: `${(s.signatureImageHeight ?? 0.15) * 100}%`,
                  objectFit: "contain",
                }}
              />
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
