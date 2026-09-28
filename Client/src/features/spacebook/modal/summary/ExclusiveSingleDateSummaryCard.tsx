import React, { useMemo } from "react";
import {
  FileText,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Tag,
  Gift,
  Hourglass,
} from "lucide-react";

import type { SpacePayload } from "@/services/apiClient";
import type { SelectedServiceItem } from "./CoworkingSummaryCard";

const FALLBACK_SPACE_IMAGE =
  "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80";

export type ExclusiveSingleDateSummaryCardProps = {
  space: SpacePayload | null;
  spaceQty: number;
  bookingDate: string;
  timeSlot: string;
  duration: number;
  hourlyRate: number;
  selectedServices: SelectedServiceItem[];
  discountAmount?: number;
  cashbackAmount?: number;
  formatDateDisplay: (val?: string | Date | null) => string;
};

export const ExclusiveSingleDateSummaryCard: React.FC<
  ExclusiveSingleDateSummaryCardProps
> = ({
  space,
  spaceQty,
  bookingDate,
  timeSlot,
  duration,
  hourlyRate,
  selectedServices,
  discountAmount = 0,
  cashbackAmount = 0,
  formatDateDisplay,
}) => {
  /* --------------------------------
     Safe / calculated values
  -------------------------------- */

  const safeDuration = Math.max(1, Number(duration) || 1);
  const safeQty = Math.max(1, Number(spaceQty) || 1);
  const safeHourlyRate = Math.max(0, Number(hourlyRate) || 0);

  const spaceCharges = useMemo(
    () => safeHourlyRate * safeDuration * safeQty,
    [safeHourlyRate, safeDuration, safeQty],
  );

  const servicesTotal = useMemo(
    () =>
      selectedServices.reduce(
        (total, service) =>
          total + (Number(service.price) || 0) * (Number(service.qty) || 0),
        0,
      ),
    [selectedServices],
  );

  const subTotal = spaceCharges + servicesTotal;

  const safeDiscount = Math.max(0, Number(discountAmount) || 0);

  const grandTotal = Math.max(0, subTotal - safeDiscount);

  /* --------------------------------
     Space image
  -------------------------------- */

  const spaceImg =
    space?.images?.[0] ||
    space?.imageUrl ||
    (space as any)?.image ||
    FALLBACK_SPACE_IMAGE;

  /* --------------------------------
     Image fallback
  -------------------------------- */

  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    event.currentTarget.src = FALLBACK_SPACE_IMAGE;
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
      <div className="space-y-4">

        {/* ==============================
            Header
        ============================== */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <FileText size={16} />
          </div>

          <h3 className="text-sm font-bold text-slate-800">
            Booking Summary
          </h3>
        </div>

        {/* ==============================
            Selected Space
        ============================== */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">

          {/* Space Image */}
          <img
            src={spaceImg}
            alt={space?.name || "Space"}
            className="h-13 w-13 shrink-0 rounded-lg border border-slate-200/80 object-cover"
            onError={handleImageError}
          />

          {/* Space Information */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-800">
              {space?.name || "Select a Space"}
            </p>

            <p className="text-[11px] font-medium text-slate-400">
              {space?.spaceCode ||
                (space as any)?.code ||
                "SP-96669"}
            </p>

            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
              <Users size={12} className="text-slate-400" />

              <span>
                {space?.capacity
                  ? `Upto ${space.capacity} People`
                  : "Upto 20 People"}
              </span>
            </div>
          </div>

          {/* Hourly Rate */}
          <div className="shrink-0 self-start">
            <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-600">
              ₹{safeHourlyRate.toLocaleString("en-IN")} / hr
            </span>
          </div>
        </div>

        {/* ==============================
            Booking Details
        ============================== */}
        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">

          {/* Date */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-500">
              <Calendar size={14} className="text-slate-400" />
              Date
            </span>

            <span className="font-semibold text-slate-800">
              {formatDateDisplay(bookingDate)}
            </span>
          </div>

          {/* Time */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-500">
              <Clock size={14} className="text-slate-400" />
              Time
            </span>

            <span className="font-semibold text-slate-800">
              {timeSlot || "09:00 AM - 12:00 PM"}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-500">
              <Hourglass size={14} className="text-slate-400" />
              Duration
            </span>

            <span className="font-semibold text-slate-800">
              {safeDuration}{" "}
              {safeDuration === 1 ? "Hour" : "Hours"}
            </span>
          </div>
        </div>

        {/* ==============================
            Financial Breakdown
        ============================== */}
        <div className="space-y-2.5 border-t border-slate-100 pt-3">

          {/* Space Charges */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Space Charges</span>

              <span className="font-bold text-slate-900">
                ₹{spaceCharges.toLocaleString("en-IN")}
              </span>
            </div>

            <p className="mt-0.5 text-[11px] text-slate-400">
              ₹{safeHourlyRate.toLocaleString("en-IN")} ×{" "}
              {safeDuration}{" "}
              {safeDuration === 1 ? "hour" : "hours"} ×{" "}
              {safeQty}
            </p>
          </div>

          {/* Additional Services */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Additional Services</span>

              <span className="font-bold text-slate-900">
                ₹{servicesTotal.toLocaleString("en-IN")}
              </span>
            </div>

            {selectedServices.length === 0 ? (
              <p className="mt-0.5 text-[11px] text-slate-400">
                No additional services selected
              </p>
            ) : (
              <div className="mt-1 space-y-0.5">
                {selectedServices.map((service) => {
                  const quantity = Number(service.qty) || 0;
                  const price = Number(service.price) || 0;
                  const total = price * quantity;

                  return (
                    <div
                      key={service.label}
                      className="flex items-center justify-between text-[11px] text-slate-500"
                    >
                      <span>
                        {service.label} × {quantity}
                      </span>

                      <span>
                        ₹{total.toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quantity + Subtotal */}
          <div className="space-y-1.5 border-t border-slate-100 pt-2 text-xs">

            <div className="flex items-center justify-between text-slate-600">
              <span>Total Qty</span>

              <span className="font-semibold text-slate-800">
                {safeQty}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="font-medium">
                Sub Total
              </span>

              <span className="font-bold text-slate-900">
                ₹{subTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Membership Discount */}
          {safeDiscount > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-rose-100/80 bg-rose-50/90 px-3 py-2 text-xs font-semibold text-rose-600">
              <span className="flex items-center gap-1.5">
                <Tag size={13} className="text-rose-500" />
                Membership Discount
              </span>

              <span>
                - ₹{safeDiscount.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {/* Cashback */}
          {cashbackAmount > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-100/80 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="flex items-center gap-1.5">
                <Gift size={13} className="text-emerald-600" />
                Cashback
              </span>

              <span>
                + ₹{Number(cashbackAmount).toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm font-bold text-slate-800">
              Grand Total
            </span>

            <span className="text-2xl font-black text-indigo-600">
              ₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* ==============================
          Security / Cancellation
      ============================== */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-sky-600"
        />

      
      </div>
    </div>
  );
};

export default ExclusiveSingleDateSummaryCard;
