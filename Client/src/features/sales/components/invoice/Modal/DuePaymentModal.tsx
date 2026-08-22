import { useEffect, useMemo, useState } from "react";
import {
  X,
  Check,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import { handleUpdateInvoice } from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";
import { nearestRupee, roundPayable } from "@/features/sales/utils/paymentRoundOff";

type SplitKey = "cash" | "upi" | "card" | "wallet";

type SplitPayments = Record<SplitKey, number>;

type Props = {
  open: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
};

const EMPTY_SPLIT: SplitPayments = {
  cash: 0,
  upi: 0,
  card: 0,
  wallet: 0,
};

const MODE_OPTIONS = [
  { id: "Cash", icon: Banknote, color: "text-green-600" },
  { id: "UPI", icon: Smartphone, color: "text-indigo-600" },
  { id: "Card", icon: CreditCard, color: "text-blue-600" },
  { id: "Wallet", icon: Wallet, color: "text-amber-600" },
] as const;

export default function DuePaymentModal({
  open,
  onClose,
  invoice,
  onSuccess,
}: Props) {
  const [payAmount, setPayAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayments>(EMPTY_SPLIT);
  const [loading, setLoading] = useState(false);
  const staff = useAppSelector((state) => state.user);

  const dueAmount = nearestRupee(Number(invoice?.dueAmount ?? 0));
  const { roundOff: dueRoundOff } = roundPayable(
    Number(invoice?.dueAmount ?? 0),
  );

  useEffect(() => {
    if (!open || !invoice) return;
    setPayAmount(nearestRupee(Number(invoice.dueAmount) || 0));
    setPaymentMode("Cash");
    setIsMultiMode(false);
    setSplitPayments(EMPTY_SPLIT);
    setLoading(false);
  }, [open, invoice]);

  const splitTotal = useMemo(
    () =>
      Number(splitPayments.cash || 0) +
      Number(splitPayments.upi || 0) +
      Number(splitPayments.card || 0) +
      Number(splitPayments.wallet || 0),
    [splitPayments],
  );

  const thisPaymentAmount = isMultiMode
    ? splitTotal
    : nearestRupee(Number(payAmount) || 0);
  const remainingAfter = Math.max(0, dueAmount - thisPaymentAmount);
  const remainingToAllocate = Math.max(0, dueAmount - splitTotal);

  if (!open || !invoice) return null;

  const setSplitAmount = (key: SplitKey, value: number) => {
    const nextVal = Math.max(0, nearestRupee(Number(value) || 0));
    setSplitPayments((prev) => {
      const without = { ...prev, [key]: 0 };
      const others =
        without.cash + without.upi + without.card + without.wallet;
      const maxForKey = Math.max(0, dueAmount - others);
      return { ...prev, [key]: Math.min(nextVal, maxForKey) };
    });
  };

  const handlePay = async () => {
    if (thisPaymentAmount <= 0) {
      Swal.fire(
        "Invalid amount",
        "Payment amount must be greater than 0",
        "warning",
      );
      return;
    }
    if (thisPaymentAmount > dueAmount + 0.001) {
      Swal.fire(
        "Invalid amount",
        `Payment cannot exceed due amount (₹${dueAmount})`,
        "warning",
      );
      return;
    }

    try {
      setLoading(true);

      const currentBreakdown = invoice.raw?.paymentBreakdown || {
        cash: 0,
        upi: 0,
        card: 0,
        wallet: 0,
        paidAmount: 0,
        dueAmount: invoice.amount,
        changeAmount: 0,
      };

      const addCash = isMultiMode
        ? Number(splitPayments.cash || 0)
        : paymentMode === "Cash"
          ? thisPaymentAmount
          : 0;
      const addUpi = isMultiMode
        ? Number(splitPayments.upi || 0)
        : paymentMode === "UPI"
          ? thisPaymentAmount
          : 0;
      const addCard = isMultiMode
        ? Number(splitPayments.card || 0)
        : paymentMode === "Card"
          ? thisPaymentAmount
          : 0;
      const addWallet = isMultiMode
        ? Number(splitPayments.wallet || 0)
        : paymentMode === "Wallet"
          ? thisPaymentAmount
          : 0;

      const newPaidAmount =
        (Number(currentBreakdown.paidAmount) || 0) + thisPaymentAmount;
      const newDueAmount = Math.max(
        0,
        (Number(currentBreakdown.dueAmount) || dueAmount) - thisPaymentAmount,
      );

      const nextCash = (Number(currentBreakdown.cash) || 0) + addCash;
      const nextUpi = (Number(currentBreakdown.upi) || 0) + addUpi;
      const nextCard = (Number(currentBreakdown.card) || 0) + addCard;
      const nextWallet = (Number(currentBreakdown.wallet) || 0) + addWallet;

      const activeChannels = [
        nextCash > 0,
        nextUpi > 0,
        nextCard > 0,
        nextWallet > 0,
      ].filter(Boolean).length;

      const updatedBreakdown = {
        ...currentBreakdown,
        cash: nextCash,
        upi: nextUpi,
        card: nextCard,
        wallet: nextWallet,
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
      };

      const historyMode = isMultiMode
        ? "Multi"
        : paymentMode;
      const invoiceMode =
        isMultiMode || activeChannels > 1 ? "Multi" : paymentMode;

      const payload = {
        mode: invoiceMode,
        paymentStatus: (newDueAmount === 0 ? "full" : "partial") as
          | "full"
          | "partial",
        paymentBreakdown: updatedBreakdown,
        pendingAmount: newDueAmount,
        newPayment: {
          date: new Date().toISOString(),
          amount: thisPaymentAmount,
          mode: historyMode,
          receivedBy: staff?.m_staff_name || "Unknown",
        },
      };

      await handleUpdateInvoice(invoice._id, payload);

      Swal.fire("Success", "Payment recorded successfully", "success");
      onSuccess();
      onClose();
    } catch (error: any) {
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Failed to record payment",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const items = Array.isArray(invoice.raw?.items)
    ? invoice.raw.items
    : Array.isArray(invoice.items)
      ? invoice.items
      : [];

  const formatInr = (value: number) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const lineAmount = (item: any) => {
    const qty = Number(item.qty || 0);
    const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
    const discount = Number(item.discount || 0);
    if (Number.isFinite(Number(item.lineTotal))) {
      return Number(item.lineTotal);
    }
    return Math.max(0, qty * unitPrice - discount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-payment-title"
        className="relative flex max-h-[min(94dvh,920px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-100 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                id="record-payment-title"
                className="text-base font-bold tracking-tight text-slate-900 sm:text-lg"
              >
                Record Payment
              </h3>
              <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                Bill: {invoice.bill}
                {invoice.customer ? ` · ${invoice.customer}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Invoice summary */}
            <div className="border-b border-slate-100 p-4 sm:p-5 md:border-b-0 md:border-r">
              <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Invoice Items
              </h4>
              <div className="max-h-40 space-y-2.5 overflow-y-auto pr-1 sm:max-h-56">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-400">
                    No products found on this invoice.
                  </div>
                ) : (
                  items.map((item: any, idx: number) => {
                    const name =
                      item.productName ||
                      item.name ||
                      item.description ||
                      "Item";
                    const qty = Number(item.qty || 0);
                    const unitPrice = Number(
                      item.unitPrice ?? item.price ?? 0,
                    );
                    const discount = Number(item.discount || 0);
                    return (
                      <div
                        key={item._id || `${name}-${idx}`}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-slate-800">
                            {name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {qty} × {formatInr(unitPrice)}
                            {discount > 0
                              ? ` · Disc ${formatInr(discount)}`
                              : ""}
                          </div>
                        </div>
                        <div className="shrink-0 tabular-nums text-sm font-semibold text-slate-700">
                          {formatInr(lineAmount(item))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 space-y-2 border-t border-dashed border-slate-200 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Amount</span>
                  <span className="font-medium tabular-nums text-slate-800">
                    {formatInr(invoice.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Already Paid</span>
                  <span className="font-medium tabular-nums">
                    {formatInr(invoice.amount - invoice.dueAmount)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold text-amber-700 sm:text-base">
                  <span>Current Due</span>
                  <span className="tabular-nums">{formatInr(dueAmount)}</span>
                </div>
                {Math.abs(dueRoundOff) >= 0.005 && (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Round Off</span>
                    <span className="tabular-nums">
                      {dueRoundOff >= 0 ? "+" : "−"}
                      {formatInr(Math.abs(dueRoundOff))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Accept payment */}
            <div className="bg-slate-50/70 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Accept Payment
                </h4>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                  <input
                    type="checkbox"
                    checked={isMultiMode}
                    onChange={(e) => {
                      setIsMultiMode(e.target.checked);
                      if (e.target.checked) {
                        setSplitPayments(EMPTY_SPLIT);
                      } else {
                        setPayAmount(dueAmount);
                      }
                    }}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Split
                  </span>
                </label>
              </div>

              <div className="space-y-4">
                {!isMultiMode ? (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Amount to Pay
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={payAmount}
                          onChange={(e) =>
                            setPayAmount(
                              Math.min(
                                dueAmount,
                                nearestRupee(
                                  Math.max(0, Number(e.target.value) || 0),
                                ),
                              ),
                            )
                          }
                          step={1}
                          max={dueAmount}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-base font-semibold tabular-nums text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 sm:h-11 sm:text-sm"
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setPayAmount(dueAmount)}
                          className="text-xs font-semibold text-violet-600 hover:underline"
                        >
                          Pay Full
                        </button>
                        {payAmount < dueAmount && (
                          <span className="text-[11px] text-slate-400">
                            Remaining: {formatInr(dueAmount - payAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Payment Mode
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {MODE_OPTIONS.map((mode) => {
                          const active = paymentMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setPaymentMode(mode.id)}
                              className={`flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition sm:min-h-0 sm:flex-col sm:gap-1.5 sm:p-2.5 ${
                                active
                                  ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <mode.icon
                                size={18}
                                className={
                                  active ? "text-violet-600" : mode.color
                                }
                              />
                              <span
                                className={`text-xs font-bold sm:text-[10px] ${
                                  active ? "text-violet-700" : "text-slate-600"
                                }`}
                              >
                                {mode.id}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      {(
                        [
                          ["cash", "Cash"],
                          ["upi", "UPI"],
                          ["card", "Card"],
                          ["wallet", "Wallet"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key}>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {label}
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                              ₹
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={splitPayments[key] || ""}
                              onChange={(e) =>
                                setSplitAmount(key, Number(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-6 pr-2 text-sm font-bold tabular-nums outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {(["Cash", "UPI", "Card", "Wallet"] as const).map(
                        (label) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              const key = label.toLowerCase() as SplitKey;
                              setSplitAmount(
                                key,
                                splitPayments[key] + remainingToAllocate,
                              );
                            }}
                            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-violet-600"
                          >
                            + Rest to {label}
                          </button>
                        ),
                      )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-slate-100 bg-white p-3 text-xs font-semibold sm:p-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Current Due</span>
                        <span className="tabular-nums">
                          {formatInr(dueAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Allocated</span>
                        <span className="tabular-nums text-violet-600">
                          {formatInr(splitTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold">
                        <span>Still Due After</span>
                        <span
                          className={`tabular-nums ${
                            remainingAfter > 0
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {formatInr(remainingAfter)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer actions */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <button
            type="button"
            disabled={loading || thisPaymentAmount <= 0}
            onClick={() => void handlePay()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white shadow-lg shadow-violet-200/60 transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check size={18} />
            )}
            Confirm Payment
            {thisPaymentAmount > 0
              ? ` · ${formatInr(thisPaymentAmount)}`
              : ""}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full py-2 text-center text-xs font-medium text-slate-400 transition hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
