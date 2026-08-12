/**
 * Canonical invoice / membership line types.
 * Catalogue subcategory (Snacks, Studio, Electronics) is NOT a line type.
 */
export const LINE_TYPES = {
  PRODUCT: "product",
  SERVICE: "service",
  SPACE: "space",
  FOOD: "food",
} as const;

export type LineType = (typeof LINE_TYPES)[keyof typeof LINE_TYPES];

export const MEMBERSHIP_BUCKETS = {
  product: "Products",
  service: "Services",
  space: "Space",
  food: "Food",
} as const;

export type MembershipBucket =
  (typeof MEMBERSHIP_BUCKETS)[keyof typeof MEMBERSHIP_BUCKETS];

/** Normalize any raw category / sourceType / lineCategory to a line type. */
export function normalizeLineType(raw?: string | null): LineType {
  const lower = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!lower) return LINE_TYPES.PRODUCT;

  if (lower === "food" || lower === "foods") return LINE_TYPES.FOOD;
  if (lower === "space" || lower === "spaces") return LINE_TYPES.SPACE;
  if (lower === "service" || lower === "services") return LINE_TYPES.SERVICE;
  if (
    lower === "product" ||
    lower === "products" ||
    lower === "general" ||
    lower === "store"
  ) {
    return LINE_TYPES.PRODUCT;
  }

  // Catalogue subcategories must not become Space/Services/Food via fuzzy match.
  return LINE_TYPES.PRODUCT;
}

export function membershipBucketForLineType(
  lineType?: string | null,
): MembershipBucket {
  const t = normalizeLineType(lineType);
  return MEMBERSHIP_BUCKETS[t];
}

/** Prefer explicit lineCategory / sourceType over free-form catalogue labels. */
export function resolveInvoiceLineCategory(input: {
  lineCategory?: string | null;
  sourceType?: string | null;
  category?: string | null;
}): LineType {
  return normalizeLineType(
    input.lineCategory || input.sourceType || input.category,
  );
}
