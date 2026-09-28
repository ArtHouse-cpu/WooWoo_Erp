
import React, { useMemo } from "react";
import {
  FileText,
  Calendar,
  Clock,
  Users,
  Tag,
  Gift,
  Hourglass,
} from "lucide-react";

import type { SpacePayload } from "@/services/apiClient";
import type { MultiDateSlot } from "../CreateBookingDetailsModal";
import type { SelectedServiceItem } from "./CoworkingSummaryCard";

/* =========================================
   Constants
========================================= */

const FALLBACK_SPACE_IMAGE =
  "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80";

/* =========================================
   Types
========================================= */

export type ExclusiveMultipleDatesSummaryCardProps = {
  space: SpacePayload | null;
  spaceQty: number;
  slots: MultiDateSlot[];
  hourlyRate: number;
  selectedServices: SelectedServiceItem[];
  discountAmount?: number;
  cashbackAmount?: number;
  formatDateDisplay: (
    val?: string | Date | null,
  ) => string;
};

/* =========================================
   Component
========================================= */

export const ExclusiveMultipleDatesSummaryCard: React.FC<
  ExclusiveMultipleDatesSummaryCardProps
> = ({
  space,
  spaceQty,
  slots,
  hourlyRate,
  selectedServices,
  discountAmount = 0,
  cashbackAmount = 0,
  formatDateDisplay,
}) => {
  /* =========================================
     Safe Values
  ========================================= */

  const safeQty = Math.max(
    1,
    Number(spaceQty) || 1,
  );

  const safeHourlyRate = Math.max(
    0,
    Number(hourlyRate) || 0,
  );

  const safeDiscount = Math.max(
    0,
    Number(discountAmount) || 0,
  );

  const safeCashback = Math.max(
    0,
    Number(cashbackAmount) || 0,
  );

  /* =========================================
     Space Image
  ========================================= */

  const spaceImg =
    space?.images?.[0] ||
    space?.imageUrl ||
    (space as any)?.image ||
    FALLBACK_SPACE_IMAGE;

  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    event.currentTarget.src = FALLBACK_SPACE_IMAGE;
  };

  /* =========================================
     Duration Calculations
  ========================================= */

  const totalDuration = useMemo(() => {
    return slots.reduce(
      (total, slot) =>
        total + (Number(slot.duration) || 1),
      0,
    );
  }, [slots]);

  /* =========================================
     Space Charges
  ========================================= */

  const spaceCharges = useMemo(() => {
    return slots.reduce((total, slot) => {
      const duration =
        Number(slot.duration) || 1;

      return (
        total +
        safeHourlyRate *
          duration *
          safeQty
      );
    }, 0);
  }, [slots, safeHourlyRate, safeQty]);

  /* =========================================
     Services Total
  ========================================= */

  const servicesTotal = useMemo(() => {
    return selectedServices.reduce(
      (total, service) => {
        const price =
          Number(service.price) || 0;

        const quantity =
          Number(service.qty) || 0;

        return total + price * quantity;
      },
      0,
    );
  }, [selectedServices]);

  /* =========================================
     Final Amounts
  ========================================= */

  const subTotal =
    spaceCharges + servicesTotal;

  const grandTotal = Math.max(
    0,
    subTotal - safeDiscount,
  );

  /* =========================================
     Dates Summary
  ========================================= */

  const datesSummary = useMemo(() => {
    return slots
      .map((slot) =>
        formatDateDisplay(slot.date),
      )
      .filter(Boolean)
      .join(", ");
  }, [slots, formatDateDisplay]);

  /* =========================================
     Render
  ========================================= */

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">

      <div className="space-y-4">

        {/* =====================================
            Header
        ===================================== */}

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <FileText size={16} />
          </div>

          <h3 className="text-sm font-bold text-slate-800">
            Booking Summary
          </h3>
        </div>

        {/* =====================================
            Selected Space
        ===================================== */}

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
              <Users
                size={12}
                className="text-slate-400"
              />

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

        {/* =====================================
            Booking Details
        ===================================== */}

        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">

          {/* Dates */}

          <div className="flex items-start justify-between gap-3">

            <span className="mt-0.5 flex shrink-0 items-center gap-2 text-slate-500">
              <Calendar
                size={14}
                className="text-slate-400"
              />

              Dates
            </span>

            <div className="min-w-0 text-right">

              <p className="font-semibold leading-tight text-slate-800">
                {datesSummary || "—"}
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                ({slots.length}{" "}
                {slots.length === 1
                  ? "date"
                  : "dates"})
              </p>

            </div>

          </div>

          {/* Time Slots */}

          <div className="flex items-start justify-between gap-3">

            <span className="mt-0.5 flex shrink-0 items-center gap-2 text-slate-500">
              <Clock
                size={14}
                className="text-slate-400"
              />

              Time Slots
            </span>

            <div className="space-y-1 text-right">

              {slots.length === 0 ? (
                <span className="text-[11px] text-slate-400">
                  No slots selected
                </span>
              ) : (
                slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="text-[11px] font-medium text-slate-600"
                  >
                    <span className="font-semibold text-slate-700">
                      {formatDateDisplay(
                        slot.date,
                      )}
                    </span>

                    {" : "}

                    <span>
                      {slot.timeSlot || "—"}
                    </span>
                  </div>
                ))
              )}

            </div>

          </div>

          {/* Total Duration */}

          <div className="flex items-center justify-between">

            <span className="flex items-center gap-2 text-slate-500">
              <Hourglass
                size={14}
                className="text-slate-400"
              />

              Total Duration
            </span>

            <span className="font-semibold text-slate-800">
              {totalDuration}{" "}
              {totalDuration === 1
                ? "Hour"
                : "Hours"}
            </span>

          </div>

        </div>

        {/* =====================================
            Financial Breakdown
        ===================================== */}

        <div className="space-y-2.5 border-t border-slate-100 pt-3">

          {/* Space Charges */}

          <div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-700">

              <span>
                Space Charges
              </span>

              <span className="font-bold text-slate-900">
                ₹{spaceCharges.toLocaleString("en-IN")}
              </span>

            </div>

            {/* Per Date Breakdown */}

            {slots.length > 0 && (
              <div className="mt-1 space-y-0.5">

                {slots.map((slot) => {
                  const duration =
                    Number(slot.duration) || 1;

                  const rowCharge =
                    safeHourlyRate *
                    duration *
                    safeQty;

                  return (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-2 text-[11px] text-slate-400"
                    >

                      <span className="min-w-0 truncate">
                        {formatDateDisplay(
                          slot.date,
                        )}{" "}
                        ({duration} hrs × ₹
                        {safeHourlyRate.toLocaleString(
                          "en-IN",
                        )}
                        )
                      </span>

                      <span className="shrink-0">
                        ₹
                        {rowCharge.toLocaleString(
                          "en-IN",
                        )}
                      </span>

                    </div>
                  );
                })}

              </div>
            )}

          </div>

          {/* =================================
              Additional Services
          ================================= */}

          <div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-700">

              <span>
                Additional Services
              </span>

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

                {selectedServices.map(
                  (service) => {
                    const price =
                      Number(service.price) || 0;

                    const quantity =
                      Number(service.qty) || 0;

                    const total =
                      price * quantity;

                    return (
                      <div
                        key={service.label}
                        className="flex items-center justify-between text-[11px] text-slate-500"
                      >

                        <span>
                          {service.label} ×{" "}
                          {quantity}
                        </span>

                        <span>
                          ₹
                          {total.toLocaleString(
                            "en-IN",
                          )}
                        </span>

                      </div>
                    );
                  },
                )}

              </div>
            )}

          </div>

          {/* =================================
              Quantity + Subtotal
          ================================= */}

          <div className="space-y-1.5 border-t border-slate-100 pt-2 text-xs">

            <div className="flex items-center justify-between text-slate-600">

              <span>
                Total Qty
              </span>

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

          {/* =================================
              Membership Discount
          ================================= */}

          {safeDiscount > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-rose-100/80 bg-rose-50/90 px-3 py-2 text-xs font-semibold text-rose-600">

              <span className="flex items-center gap-1.5">
                <Tag
                  size={13}
                  className="text-rose-500"
                />

                Membership Discount
              </span>

              <span>
                - ₹
                {safeDiscount.toLocaleString(
                  "en-IN",
                )}
              </span>

            </div>
          )}

          {/* =================================
              Cashback
          ================================= */}

          {safeCashback > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-100/80 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-emerald-700">

              <span className="flex items-center gap-1.5">
                <Gift
                  size={13}
                  className="text-emerald-600"
                />

                Cashback
              </span>

              <span>
                + ₹
                {safeCashback.toLocaleString(
                  "en-IN",
                )}
              </span>

            </div>
          )}

          {/* =================================
              Grand Total
          ================================= */}

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
    </div>
  );
};

export default ExclusiveMultipleDatesSummaryCard;

