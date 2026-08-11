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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Record Payment
            </h3>
            <p className="text-sm text-gray-500">
              Bill: {invoice.bill} | {invoice.customer}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="border-r border-gray-100 p-6">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Invoice Items
            </h4>
            <div className="max-h-60 space-y-3 overflow-y-auto pr-2">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-400">
                  No products found on this invoice.
                </div>
              ) : (
                items.map((item: any, idx: number) => {
                  const name =
                    item.productName || item.name || item.description || "Item";
                  const qty = Number(item.qty || 0);
                  const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                  const discount = Number(item.discount || 0);
                  return (
                    <div
                      key={item._id || `${name}-${idx}`}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-gray-800">
                          {name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {qty} × {formatInr(unitPrice)}
                          {discount > 0 ? ` · Disc ${formatInr(discount)}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 font-semibold text-gray-700">
                        {formatInr(lineAmount(item))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 space-y-2 border-t border-dashed border-gray-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-medium text-gray-800">
                  {formatInr(invoice.amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Already Paid</span>
                <span className="font-medium">
                  {formatInr(invoice.amount - invoice.dueAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-amber-700">
                <span>Current Due</span>
                <span>{formatInr(dueAmount)}</span>
              </div>
              {Math.abs(dueRoundOff) >= 0.005 && (
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Round Off</span>
                  <span>
                    {dueRoundOff >= 0 ? "+" : "−"}
                    {formatInr(Math.abs(dueRoundOff))}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50/50 p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Accept Payment
              </h4>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-1.5 border border-gray-200">
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
                  className="h-4 w-4 rounded border-slate-300 text-violet-600"
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
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Amount to Pay
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        ₹
                      </span>
                      <input
                        type="number"
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
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-7 pr-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                      />
                    </div>
                    <div className="mt-1 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setPayAmount(dueAmount)}
                        className="text-[10px] font-medium text-violet-600 hover:underline"
                      >
                        Pay Full
                      </button>
                      {payAmount < dueAmount && (
                        <span className="text-[10px] text-gray-400">
                          Remaining: {formatInr(dueAmount - payAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {MODE_OPTIONS.map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPaymentMode(mode.id)}
                          className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-all ${
                            paymentMode === mode.id
                              ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <mode.icon
                            size={18}
                            className={
                              paymentMode === mode.id
                                ? "text-violet-600"
                                : mode.color
                            }
                          />
                          <span
                            className={`text-[10px] font-bold ${
                              paymentMode === mode.id
                                ? "text-violet-700"
                                : "text-gray-600"
                            }`}
                          >
                            {mode.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
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
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            value={splitPayments[key] || ""}
                            onChange={(e) =>
                              setSplitAmount(key, Number(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-6 pr-2 text-sm font-bold outline-none focus:border-violet-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
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
                          className="text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-violet-600"
                        >
                          + Add rest to {label}
                        </button>
                      ),
                    )}
                  </div>

                  <div className="space-y-2 rounded-xl bg-white p-4 text-xs font-semibold border border-gray-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Due</span>
                      <span>{formatInr(dueAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Allocated</span>
                      <span className="text-violet-600">
                        {formatInr(splitTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold">
                      <span>Still Due After</span>
                      <span
                        className={
                          remainingAfter > 0
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }
                      >
                        {formatInr(remainingAfter)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={loading || thisPaymentAmount <= 0}
                onClick={() => void handlePay()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
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
                className="w-full py-2 text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
