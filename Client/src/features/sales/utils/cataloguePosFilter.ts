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

const rowNameKey = (item: CatalogueLookupItem) =>
  String(item.productName || item.name || "").trim().toLowerCase();

/**
 * Food added with Manage Inventory is one catalogue row: Food, with purchase stock.
 * Hide the linked product row so POS search does not list the same item twice.
 */
function collapseManagedFoodRows(
  items: CatalogueLookupItem[],
): CatalogueLookupItem[] {
  const managedFoodNames = new Set(
    items
      .filter((item) => item.sourceType === "food" && item.manageInventory)
      .map(rowNameKey)
      .filter(Boolean),
  );
  if (!managedFoodNames.size) return items;

  const stockFromProduct = new Map<string, number>();
  for (const item of items) {
    if (item.sourceType !== "product" || !managedFoodNames.has(rowNameKey(item))) continue;
    if (item.stockQty != null) stockFromProduct.set(rowNameKey(item), Number(item.stockQty) || 0);
  }

  return items
    .filter((item) => !(item.sourceType === "product" && managedFoodNames.has(rowNameKey(item))))
    .map((item) => {
      if (item.sourceType !== "food" || !item.manageInventory) return item;
      const qty =
        item.stockQty != null
          ? Number(item.stockQty) || 0
          : stockFromProduct.get(rowNameKey(item)) ?? 0;
      return { ...item, trackStock: true, stockQty: qty };
    });
}

/** Same row filter as POS catalogue sidebar (hide empty parent when variants exist). */
export function filterCatalogueRowsForPos(
  items: CatalogueLookupItem[],
): CatalogueLookupItem[] {
  const collapsed = collapseManagedFoodRows(items);
  const parentsWithVariants = new Set<string>();
  for (const item of collapsed) {
    const parts = getCatalogueNameParts(item);
    if (parts.variantName) {
      parentsWithVariants.add(parts.parentName.trim().toLowerCase());
    }
  }
  if (!parentsWithVariants.size) return sortCatalogueRowsForPos(collapsed);

  return sortCatalogueRowsForPos(
    collapsed.filter((item) => {
      const parts = getCatalogueNameParts(item);
      if (parts.variantName) return true;
      return !parentsWithVariants.has(parts.parentName.trim().toLowerCase());
    }),
  );
}
