import type { CatalogueLookupItem } from "@/services/apiClient";

type CatalogueIdentity = Pick<
  CatalogueLookupItem,
  "_id" | "sourceType" | "sourceId" | "variantName" | "productName" | "name"
> & {
  catalogueKey?: string;
  sellingPrice?: number;
  price?: number;
};

/**
 * Stable identity for a catalogue row (parent product vs each variant).
 * Catalogue variant rows use `_id = sourceId::variantName`.
 */
export function getCatalogueLineKey(item: CatalogueIdentity | null | undefined): string {
  if (!item) return "";
  const explicit = String(item.catalogueKey || "").trim();
  if (explicit) return explicit.toLowerCase();

  const id = String(item._id ?? "").trim();
  if (id) return id.toLowerCase();

  const sourceType = String(item.sourceType || "product").trim().toLowerCase();
  const sourceId = String(item.sourceId || "").trim().toLowerCase();
  const variant = String(item.variantName || "").trim().toLowerCase();
  const name = String(item.productName || item.name || "")
    .trim()
    .toLowerCase();
  return `${sourceType}:${sourceId}:${variant}:${name}`;
}

/** Find the cart line that belongs to this catalogue tile (not all same-named parents). */
export function findCartItemForCatalogueLine<T extends CatalogueIdentity>(
  cartItems: T[] | null | undefined,
  catalogueItem: CatalogueIdentity,
): T | undefined {
  const list = Array.isArray(cartItems) ? cartItems : [];
  const key = getCatalogueLineKey(catalogueItem);
  if (!key) return undefined;

  const byKey = list.find(
    (c) => getCatalogueLineKey(c) === key || String(c._id || "").toLowerCase() === key,
  );
  if (byKey) return byKey;

  // Legacy cart lines (no catalogueKey): match full line name + price only.
  // Never match on parent name alone — that selects every variant of the same product.
  const lineName = String(
    catalogueItem.productName || catalogueItem.name || "",
  )
    .trim()
    .toLowerCase();
  const price = Number(
    catalogueItem.sellingPrice ?? catalogueItem.price ?? 0,
  );
  if (!lineName) return undefined;

  return list.find((c) => {
    if (c.catalogueKey || c._id) return false;
    const cName = String(c.productName || c.name || "")
      .trim()
      .toLowerCase();
    const cPrice = Number(c.price ?? c.sellingPrice ?? 0);
    return cName === lineName && Math.abs(cPrice - price) < 0.001;
  });
}
