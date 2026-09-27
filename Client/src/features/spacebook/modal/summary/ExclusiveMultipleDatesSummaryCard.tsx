import React from "react";
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
import type { MultiDateSlot } from "../CreateBookingDetailsModal";
import type { SelectedServiceItem } from "./CoworkingSummaryCard";

export type ExclusiveMultipleDatesSummaryCardProps = {
  space: SpacePayload | null;
  spaceQty: number;
  slots: MultiDateSlot[];
  hourlyRate: number;
  selectedServices: SelectedServiceItem[];
  discountAmount?: number;
  cashbackAmount?: number;
  formatDateDisplay: (val?: string | Date | null) => string;
};

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
  const safeQty = Math.max(1, spaceQty || 1);
  const totalDuration = slots.reduce((acc, s) => acc + (s.duration || 1), 0);
  const spaceCharges = slots.reduce(
    (acc, s) => acc + hourlyRate * (s.duration || 1) * safeQty,
    0,
  );
  const servicesTotal = selectedServices.reduce(
    (acc, s) => acc + s.price * s.qty,
    0,
  );
  const subTotal = spaceCharges + servicesTotal;
  const grandTotal = Math.max(0, subTotal - discountAmount);

  const spaceImg =
    space?.images?.[0] ||
    (space as any)?.image ||
    "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80";

  // Group dates nicely
  const datesSummary = slots
    .map((s) => formatDateDisplay(s.date))
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <FileText size={16} />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Booking Summary</h3>
        </div>

        {/* Selected Space Item */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
          <img
            src={spaceImg}
            alt={space?.name || "Space"}
            className="h-13 w-13 rounded-lg object-cover border border-slate-200/80 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80";
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-800">
              {space?.name || "Select a Space"}
            </p>
            <p className="text-[11px] font-medium text-slate-400">
              {space?.spaceCode || (space as any)?.code || "SP-96669"}
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
          <div className="shrink-0 self-start">
            <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-600">
              ₹{hourlyRate.toLocaleString("en-IN")} / hr
            </span>
          </div>
        </div>

        {/* Booking Details Rows */}
        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
          {/* Dates */}
          <div className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-500 shrink-0 mt-0.5">
              <Calendar size={14} className="text-slate-400" />
              Dates
            </span>
            <div className="text-right min-w-0">
              <p className="font-semibold text-slate-800 leading-tight">
                {datesSummary || "—"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ({slots.length} {slots.length === 1 ? "date" : "dates"})
              </p>
            </div>
          </div>

          {/* Time Slots */}
          <div className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-500 shrink-0 mt-0.5">
              <Clock size={14} className="text-slate-400" />
              Time Slots
            </span>
            <div className="space-y-1 text-right">
              {slots.map((s) => (
                <div key={s.id} className="text-[11px] text-slate-600 font-medium">
                  <span className="font-semibold text-slate-700">
                    {formatDateDisplay(s.date)}
                  </span>
                  {" : "}
                  <span>{s.timeSlot || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Duration */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-500">
              <Hourglass size={14} className="text-slate-400" />
              Total Duration
            </span>
            <span className="font-semibold text-slate-800">
              {totalDuration} {totalDuration === 1 ? "Hour" : "Hours"}
            </span>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="space-y-2.5 border-t border-slate-100 pt-3">
          {/* Space Charges with breakdown */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Space Charges</span>
              <span className="font-bold text-slate-900">
                ₹{spaceCharges.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="mt-1 space-y-0.5">
              {slots.map((s) => {
                const rowCharge = hourlyRate * (s.duration || 1) * safeQty;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-[11px] text-slate-400"
                  >
                    <span>
                      {formatDateDisplay(s.date)} ({s.duration} hrs × ₹
                      {hourlyRate.toLocaleString("en-IN")})
                    </span>
                    <span>₹{rowCharge.toLocaleString("en-IN")}</span>
                  </div>
                );
              })}
            </div>
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
                {selectedServices.map((svc) => (
                  <div
                    key={svc.label}
                    className="flex items-center justify-between text-[11px] text-slate-500"
                  >
                    <span>
                      {svc.label} × {svc.qty}
                    </span>
                    <span>₹{(svc.price * svc.qty).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Total Qty</span>
              <span className="font-semibold text-slate-800">{safeQty}</span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="font-medium">Sub Total</span>
              <span className="font-bold text-slate-900">
                ₹{subTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Membership Discount Pill */}
          {discountAmount > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-rose-50/90 border border-rose-100/80 px-3 py-2 text-xs font-semibold text-rose-600">
              <span className="flex items-center gap-1.5">
                <Tag size={13} className="text-rose-500" />
                Membership Discount
              </span>
              <span>- ₹{discountAmount.toLocaleString("en-IN")}</span>
            </div>
          )}

          {/* Cashback Pill */}
          {cashbackAmount > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/90 border border-emerald-100/80 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="flex items-center gap-1.5">
                <Gift size={13} className="text-emerald-600" />
                Cashback
              </span>
              <span>+ ₹{cashbackAmount.toLocaleString("en-IN")}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm font-bold text-slate-800">Grand Total</span>
            <span className="text-2xl font-black text-indigo-600">
              ₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Badge */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
        <ShieldCheck size={18} className="text-sky-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-sky-950">100% Secure Payments</p>
          <p className="text-[11px] text-sky-800/80 leading-snug">
            You can cancel up to 24 hours before your booking.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExclusiveMultipleDatesSummaryCard;
