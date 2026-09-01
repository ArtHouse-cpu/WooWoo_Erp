import type { CatalogueLookupItem } from "@/services/apiClient";
import { getCatalogueNameParts } from "../components/CatalogueItemLabel";

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

/** Parse size labels like "3 × 3", "12X12", "12 x 24" for ascending dimension order. */
const parseVariantDimensions = (label: string): [number, number] | null => {
  const s = String(label ?? "").trim();
  const m = s.match(/(\d+(?:\.\d+)?)\s*[x×X*]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
};

const compareVariantNames = (a: string, b: string) => {
  const da = parseVariantDimensions(a);
  const db = parseVariantDimensions(b);
  if (da && db) {
    if (da[0] !== db[0]) return da[0] - db[0];
    if (da[1] !== db[1]) return da[1] - db[1];
  }
  return naturalCompare(a, b);
};

const getProductGroupKey = (item: CatalogueLookupItem): string => {
  const parent = String(item.parentProductName ?? "").trim();
  if (parent) return parent.toLowerCase();

  const parts = getCatalogueNameParts(item);
  if (parts.variantName) return parts.parentName.trim().toLowerCase();
  return parts.parentName.trim().toLowerCase() || parts.fullLabel.toLowerCase();
};

/** Group variants under parent; natural sort within group (10, 12X24, 12X36…). */
export function sortCatalogueRowsForPos(
  items: CatalogueLookupItem[],
): CatalogueLookupItem[] {
  return [...items].sort((a, b) => {
    const aIsProduct = String(a.sourceType || "") === "product";
    const bIsProduct = String(b.sourceType || "") === "product";

    if (aIsProduct && bIsProduct) {
      const groupCmp = naturalCompare(
        getProductGroupKey(a),
        getProductGroupKey(b),
      );
      if (groupCmp !== 0) return groupCmp;

      const vA = String(a.variantName ?? "").trim();
      const vB = String(b.variantName ?? "").trim();
      if (!vA && vB) return -1;
      if (vA && !vB) return 1;
      if (vA && vB) return compareVariantNames(vA, vB);
      return naturalCompare(
        String(a.productName || a.name || ""),
        String(b.productName || b.name || ""),
      );
    }

    return naturalCompare(
      String(a.productName || a.name || ""),
      String(b.productName || b.name || ""),
    );
  });
}

/** Same row filter as POS catalogue sidebar (hide empty parent when variants exist). */
export function filterCatalogueRowsForPos(
  items: CatalogueLookupItem[],
): CatalogueLookupItem[] {
  const parentsWithVariants = new Set<string>();
  for (const item of items) {
    const parts = getCatalogueNameParts(item);
    if (parts.variantName) {
      parentsWithVariants.add(parts.parentName.trim().toLowerCase());
    }
  }
  if (!parentsWithVariants.size) return sortCatalogueRowsForPos(items);

  return sortCatalogueRowsForPos(
    items.filter((item) => {
      const parts = getCatalogueNameParts(item);
      if (parts.variantName) return true;
      return !parentsWithVariants.has(parts.parentName.trim().toLowerCase());
    }),
  );
}
