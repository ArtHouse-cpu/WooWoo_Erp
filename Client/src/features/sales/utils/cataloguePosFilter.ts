import type { CatalogueLookupItem } from "@/services/apiClient";
import { getCatalogueNameParts } from "../components/CatalogueItemLabel";

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

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
      if (vA && vB) return naturalCompare(vA, vB);
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
