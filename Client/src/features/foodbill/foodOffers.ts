export type FoodOfferRule = {
  id: string;
  buyFoodId: string;
  freeFoodId: string;
};

export type OfferBillLine<TItem extends { id: string; price: number }> = {
  item: TItem;
  quantity: number;
  promo?: boolean;
  promoBuyFoodId?: string;
};

export function offerLineKey(line: {
  item: { id: string };
  promo?: boolean;
  promoBuyFoodId?: string;
}) {
  return line.promo
    ? `promo:${line.promoBuyFoodId || ""}:${line.item.id}`
    : `manual:${line.item.id}`;
}

export function applyFoodOffers<TItem extends { id: string; price: number }>(
  lines: OfferBillLine<TItem>[],
  offers: FoodOfferRule[],
  catalog: Map<string, TItem>,
): OfferBillLine<TItem>[] {
  const manual = lines.filter((line) => !line.promo && line.quantity > 0);
  const previousPromo = lines.filter((line) => line.promo);
  const promo: OfferBillLine<TItem>[] = [];
  const seenBuy = new Set<string>();

  for (const offer of offers) {
    const buyId = String(offer.buyFoodId || "");
    const freeId = String(offer.freeFoodId || "");
    if (!buyId || !freeId || buyId === freeId || seenBuy.has(buyId)) continue;
    seenBuy.add(buyId);

    const buy = manual.find((line) => line.item.id === buyId);
    if (!buy || buy.quantity < 1) continue;

    const previous = previousPromo.find(
      (line) => line.promoBuyFoodId === buyId && line.item.id === freeId,
    );
    const item = catalog.get(freeId) || previous?.item;
    if (!item || item.id !== freeId) continue;

    promo.push({
      item,
      quantity: buy.quantity,
      promo: true,
      promoBuyFoodId: buyId,
    });
  }

  return [...manual, ...promo];
}

export function offerLinesEqual<TItem extends { id: string; price: number }>(
  left: OfferBillLine<TItem>[],
  right: OfferBillLine<TItem>[],
) {
  if (left.length !== right.length) return false;
  return left.every((line, index) => {
    const other = right[index];
    return (
      line.item.id === other.item.id &&
      line.item.price === other.item.price &&
      line.quantity === other.quantity &&
      Boolean(line.promo) === Boolean(other.promo) &&
      String(line.promoBuyFoodId || "") === String(other.promoBuyFoodId || "")
    );
  });
}
