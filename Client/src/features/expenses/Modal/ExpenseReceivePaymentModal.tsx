import { useEffect, useMemo, useState } from "react";
import {
  X,
  Check,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  Loader2,
  Landmark,
  History,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  handleGetExpenceById,
  handleRecordExpencePayment,
  type ExpencePaymentRecord,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";
import { nearestRupee } from "@/features/sales/utils/paymentRoundOff";

type SplitKey = "cash" | "upi" | "card" | "wallet";

type SplitPayments = Record<SplitKey, number>;

export type ExpensePaymentTarget = {
  _id: string;
  expenseCode: string;
  title: string;
  paidTo: string;
  amount: number;
  dueAmount: number;
  paidAmount: number;
  payments?: ExpencePaymentRecord[];
  raw?: Record<string, unknown>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  expense: ExpensePaymentTarget | null;
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
  { id: "Bank Transfer", icon: Landmark, color: "text-teal-600" },
] as const;

function staffDisplayName(value: unknown): string {
  if (value && typeof value === "object") {
    const o = value as { m_staff_name?: string; name?: string };
    return String(o.m_staff_name || o.name || "").trim() || "Unknown";
  }
  return String(value ?? "").trim() || "Unknown";
}

function formatInr(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value: unknown) {
  const d = new Date(String(value ?? ""));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExpenseReceivePaymentModal({
  open,
  onClose,
  expense,
  onSuccess,
}: Props) {
  const staff = useAppSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [detail, setDetail] = useState<ExpensePaymentTarget | null>(null);

  const [payAmount, setPayAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayments>(EMPTY_SPLIT);
  const [receivedByName, setReceivedByName] = useState("");

  const activeExpense = detail ?? expense;
  const totalAmount = nearestRupee(Number(activeExpense?.amount ?? 0));
  const dueAmount = nearestRupee(Number(activeExpense?.dueAmount ?? 0));
  const paidSoFar = nearestRupee(
    Number(activeExpense?.paidAmount ?? totalAmount - dueAmount),
  );

  useEffect(() => {
    if (!open || !expense?._id) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setFetching(true);
      try {
        const response = await handleGetExpenceById(expense._id);
        const item = response?.expence;
        if (cancelled || !item) return;
        setDetail({
          _id: String(item._id),
          expenseCode: String(item.expenseCode || expense.expenseCode),
          title: String(item.title || expense.title),
          paidTo: String(item.paidTo || expense.paidTo),
          amount: Number(item.amount ?? item.totalDueAmount) || 0,
          dueAmount: Number(item.dueAmount ?? item.remainingAmount) || 0,
          paidAmount: Number(item.paidAmount ?? item.totalReceivedAmount) || 0,
          payments: Array.isArray(item.payments) ? item.payments : [],
          raw: item,
        });
      } catch {
        if (!cancelled) setDetail(expense);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, expense]);

  useEffect(() => {
    if (!open || !activeExpense) return;
    setPayAmount(nearestRupee(Number(activeExpense.dueAmount) || 0));
    setPaymentMode("Cash");
    setIsMultiMode(false);
    setSplitPayments(EMPTY_SPLIT);
    setReceivedByName(staff?.m_staff_name || "");
    setLoading(false);
  }, [open, activeExpense?._id, activeExpense?.dueAmount, staff?.m_staff_name]);

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
  const canAcceptPayment = dueAmount > 0 && !fetching;

  const historyWithRemaining = useMemo(() => {
    const payments = [...(activeExpense?.payments ?? [])].sort(
      (a, b) =>
        new Date(String(a.paidAt ?? 0)).getTime() -
        new Date(String(b.paidAt ?? 0)).getTime(),
    );
    let runningPaid = 0;
    return payments.map((payment) => {
      runningPaid += Number(payment.amount) || 0;
      return {
        ...payment,
        remainingAfter: Math.max(0, totalAmount - runningPaid),
      };
    });
  }, [activeExpense?.payments, totalAmount]);

  if (!open || !expense) return null;

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
    if (!activeExpense?._id) return;
    if (dueAmount <= 0) {
      Swal.fire("Fully paid", "This expense has no remaining due amount.", "info");
      return;
    }
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
        `Payment cannot exceed due amount (${formatInr(dueAmount)})`,
        "warning",
      );
      return;
    }
    if (!receivedByName.trim()) {
      Swal.fire("Received by required", "Enter who received this payment.", "warning");
      return;
    }

    try {
      setLoading(true);
      const response = await handleRecordExpencePayment(activeExpense._id, {
        amount: thisPaymentAmount,
        mode: paymentMode,
        isMultiMode,
        paymentBreakdown: isMultiMode ? splitPayments : undefined,
        receivedBy: {
          m_staff_id: staff?.m_staff_id || null,
          m_staff_name: receivedByName.trim(),
          m_staff_email: staff?.m_staff_email || null,
        },
      });

      const updated = response?.expence;
      if (updated) {
        setDetail({
          _id: String(updated._id),
          expenseCode: String(updated.expenseCode || activeExpense.expenseCode),
          title: String(updated.title || activeExpense.title),
          paidTo: String(updated.paidTo || activeExpense.paidTo),
          amount: Number(updated.amount ?? updated.totalDueAmount) || 0,
          dueAmount: Number(updated.dueAmount ?? updated.remainingAmount) || 0,
          paidAmount: Number(updated.paidAmount ?? updated.totalReceivedAmount) || 0,
          payments: Array.isArray(updated.payments) ? updated.payments : [],
          raw: updated,
        });
      }

      onSuccess();

      const newDue = Number(updated?.dueAmount ?? updated?.remainingAmount ?? 0);
      if (newDue <= 0) {
        await Swal.fire("Success", "Expense fully paid.", "success");
        onClose();
      } else {
        await Swal.fire("Success", "Payment recorded successfully.", "success");
        setPayAmount(nearestRupee(newDue));
        setIsMultiMode(false);
        setSplitPayments(EMPTY_SPLIT);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to record payment",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Record Payment
              </h3>
            <p className="text-sm text-gray-500">
              {activeExpense?.expenseCode} · {activeExpense?.title}
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

        <div className="grid max-h-[calc(92vh-72px)] grid-cols-1 overflow-y-auto md:grid-cols-2">
          <div className="border-r border-gray-100 p-6">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Expense Summary
            </h4>
            <div className="space-y-2 rounded-xl border border-gray-100 bg-slate-50/80 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Vendor</span>
                <span className="font-medium text-gray-800">
                  {activeExpense?.paidTo || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Due</span>
                <span className="font-medium text-gray-800">
                  {formatInr(totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Received So Far</span>
                <span className="font-medium">{formatInr(paidSoFar)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-amber-700">
                <span>Remaining</span>
                <span>{formatInr(dueAmount)}</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <History size={14} className="text-gray-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Payment History
                </h4>
              </div>
              {fetching ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading payments…
                </div>
              ) : historyWithRemaining.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-400">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {historyWithRemaining.map((payment, idx) => (
                    <div
                      key={payment._id || `payment-${idx}`}
                      className="rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-gray-800">
                          {formatInr(Number(payment.amount) || 0)}
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                          {payment.mode}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        Received by{" "}
                        <span className="font-medium text-gray-800">
                          {staffDisplayName(payment.receivedBy)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-400">
                        {formatDateTime(payment.paidAt)}
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-amber-700">
                        Remaining after: {formatInr(payment.remainingAfter)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50/50 p-6">
            {!canAcceptPayment ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
                  <Check size={28} />
                </div>
                <p className="mt-4 text-sm font-semibold text-gray-800">
                  Fully settled
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  No further payments can be recorded for this expense.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Record Payment
                  </h4>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
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
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Paid By
                    </label>
                    <input
                      type="text"
                      value={receivedByName}
                      onChange={(e) => setReceivedByName(e.target.value)}
                      placeholder="Staff name"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                    />
                  </div>

                  {!isMultiMode ? (
                    <>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                          Paying
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
                            Receive Full
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
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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

                      <div className="space-y-2 rounded-xl border border-gray-100 bg-white p-4 text-xs font-semibold">
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
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
