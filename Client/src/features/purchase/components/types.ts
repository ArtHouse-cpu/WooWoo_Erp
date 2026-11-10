/** Next line id that does not collide with a row already in the list. */
export function nextLineId(items: Array<{ id?: number }>): number {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

/** Give every row its own id. Reused ids (after a delete, or a missing id) are replaced. */
export function assignUniqueLineIds<T extends { id?: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  let max = nextLineId(items) - 1;
  let changed = false;
  const next = items.map((item) => {
    const id = Number(item.id);
    if (Number.isFinite(id) && id > 0 && !seen.has(id)) {
      seen.add(id);
      return item;
    }
    changed = true;
    max += 1;
    seen.add(max);
    return { ...item, id: max };
  });
  return changed ? next : items;
}

export type InvoiceItem = {
  id: number;
  productName: string;
  qty: number;
  unitPrice: number;
  /** Catalogue selling price (display-only on purchase UI) */
  sellingPrice?: number;
  discount: number;
  image?: string;
};
