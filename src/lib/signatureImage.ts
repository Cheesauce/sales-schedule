export class InvalidSignatureImageError extends Error {}

const MAX_SIGNATURE_BYTES = 3 * 1024 * 1024; // 3MB — plenty for a signature scan/photo

/**
 * Validates an uploaded signature image (any image/* type is accepted —
 * unlike Section VIII's document allowlist, this is deliberately broad)
 * and returns it as a base64 data URI, small enough to store inline and
 * embed directly into the generated PDF without a round trip anywhere.
 */
export async function encodeSignatureImage(file: File): Promise<string> {
  if (file.size === 0) {
    throw new InvalidSignatureImageError("Signature image is empty.");
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    throw new InvalidSignatureImageError("Signature image is too large (max 3MB).");
  }
  if (!file.type.startsWith("image/")) {
    throw new InvalidSignatureImageError(`Signature must be an image file (got ${file.type || "unknown type"}).`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
