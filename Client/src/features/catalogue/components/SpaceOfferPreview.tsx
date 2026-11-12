import { useEffect, useState } from "react";
import {
  handleGetApplicableSpaceOffer,
  handleGetSpaceOffers,
  type ApplicableSpaceOffer,
} from "@/services/apiClient";

const formatHours = (value: number) => {
  const hours = Number(value);
  if (!Number.isFinite(hours)) return "0";
  return Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 100) / 100);
};

const ruleLabel = (minimumHours: number, freeHours: number) =>
  `Book ${formatHours(minimumHours)} get ${formatHours(freeHours)}hr Free`;

type SpaceOfferPreviewProps = {
  hourlyRate: number;
};

export default function SpaceOfferPreview({ hourlyRate }: SpaceOfferPreviewProps) {
  const [offers, setOffers] = useState<ApplicableSpaceOffer[]>([]);

  useEffect(() => {
    const rate = Math.max(0, Number(hourlyRate) || 0);
    if (!(rate > 0)) {
      setOffers([]);
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const list = await handleGetSpaceOffers(
          { status: "active", limit: 20 },
          controller.signal,
        );
        const hours = [
          ...new Set(
            (list.offers || [])
              .filter((offer) => offer.status === "active")
              .flatMap((offer) =>
                (offer.rules || [])
                  .filter((rule) => rule.status !== "inactive")
                  .map((rule) => Number(rule.minimumHours) || 0),
              )
              .filter((value) => value > 0),
          ),
        ];
        const quotes = await Promise.all(
          hours.map(async (hour) => {
            const response = await handleGetApplicableSpaceOffer(
              { hours: hour, lines: [{ hourlyRate: rate, qty: 1 }] },
              controller.signal,
            );
            return response.offer?.applied ? response.offer : null;
          }),
        );
        const seen = new Set<string>();
        setOffers(
          quotes.filter((offer): offer is ApplicableSpaceOffer => {
            if (!offer) return false;
            const key = `${offer.offerId}:${offer.minimumHours}:${offer.freeHours}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }),
        );
      } catch (error) {
        if ((error as { code?: string; name?: string })?.code === "ERR_CANCELED") return;
        if ((error as { name?: string })?.name === "CanceledError") return;
        setOffers([]);
      }
    })();
    return () => controller.abort();
  }, [hourlyRate]);

  if (!offers.length) return null;

  return (
    <div className="space-y-2">
      {offers.map((offer) => {
        const minimum = Number(offer.minimumHours || 0);
        const free = Number(offer.freeHours || 0);
        const charged = Number(offer.chargeableHours || Math.max(0, minimum - free));
        const discount = Number(offer.discount || 0);
        const label = minimum > 0 && free > 0 ? ruleLabel(minimum, free) : offer.offerName;
        return (
          <div
            key={`${offer.offerId}-${minimum}-${free}`}
            className="space-y-1.5 rounded-xl border border-violet-100 bg-violet-50/80 px-3 py-2.5 text-xs"
          >
            <p className="font-bold text-violet-800">{label}</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Offer name</span>
              <span className="text-right font-semibold text-slate-800">{offer.offerName || label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Free hours</span>
              <span className="font-semibold text-slate-800">{formatHours(free)} hr</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Hours charged</span>
              <span className="font-semibold text-slate-800">{formatHours(charged)} hr</span>
            </div>
            {discount > 0 ? (
              <div className="flex items-center justify-between font-semibold text-rose-600">
                <span>Offer discount</span>
                <span>- ₹{discount.toLocaleString("en-IN")}</span>
              </div>
            ) : null}
            <p className="text-slate-600">
              Booked {formatHours(minimum)} hr
              {free > 0 ? `, ${formatHours(free)} hr free` : ""}
              {`, pay for ${formatHours(charged)} hr`}
              {discount > 0 ? ` · discount ₹${discount.toLocaleString("en-IN")}` : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
