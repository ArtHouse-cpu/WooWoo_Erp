export type SpaceOfferPdf = {
  offerName: string;
  ruleLabel: string;
  minimumHours: number;
  freeHours: number;
  chargeableHours: number;
  discount: number;
};

type OfferInput = {
  offerName?: string;
  minimumHours?: number;
  freeHours?: number;
  chargeableHours?: number;
  discount?: number;
  applied?: boolean;
} | null | undefined;

const hoursText = (value: number) =>
  Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);

export function spaceOfferFromSnapshot(offer: OfferInput): SpaceOfferPdf | null {
  if (!offer) return null;
  const minimumHours = Math.max(0, Number(offer.minimumHours) || 0);
  const freeHours = Math.max(0, Number(offer.freeHours) || 0);
  const discount = Math.max(0, Number(offer.discount) || 0);
  if (!(discount > 0) && !(freeHours > 0) && !offer.applied) return null;
  const ruleLabel =
    minimumHours > 0 && freeHours > 0
      ? `Book ${hoursText(minimumHours)} get ${hoursText(freeHours)}hr Free`
      : String(offer.offerName || "Space offer");
  return {
    offerName: String(offer.offerName || ruleLabel),
    ruleLabel,
    minimumHours,
    freeHours,
    chargeableHours: Math.max(
      0,
      Number(offer.chargeableHours) || Math.max(0, minimumHours - freeHours),
    ),
    discount,
  };
}

export function spaceOfferDetailRows(offer: SpaceOfferPdf) {
  const rows = [
    { label: "Offer", value: offer.ruleLabel },
    { label: "Free hours", value: `${hoursText(offer.freeHours)} hr` },
    { label: "Hours charged", value: `${hoursText(offer.chargeableHours)} hr` },
  ];
  if (offer.discount > 0) {
    rows.push({
      label: "Offer discount",
      value: `₹${Math.round(offer.discount).toLocaleString("en-IN")}`,
    });
  }
  return rows.filter((row) => row.label && row.value);
}
