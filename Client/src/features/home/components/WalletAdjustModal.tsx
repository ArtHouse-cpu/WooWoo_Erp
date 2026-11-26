import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Wallet, X } from "lucide-react";
import Swal from "sweetalert2";
import {
  handleGetWalletById,
  handleGetWalletInstructions,
  handleUpdateWallet,
} from "@/services/apiClient";

type WalletAdjustCustomer = {
  id: string;
  name: string;
  phone?: string;
};

type WalletAdjustModalProps = {
  customer: WalletAdjustCustomer;
  mode: "credit" | "debit";
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  createdBy?: {
    m_staff_id?: string | null;
    m_staff_name?: string | null;
    m_staff_email?: string | null;
  };
};

const money = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;

export default function WalletAdjustModal({
  customer,
  mode,
  onClose,
  onSaved,
  createdBy,
}: WalletAdjustModalProps) {
  const [walletType, setWalletType] = useState<"nonWithdrawable" | "withdrawable">(
    "nonWithdrawable",
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);
  const [withdrawable, setWithdrawable] = useState(0);
  const [nonWithdrawable, setNonWithdrawable] = useState(0);
  const [minimumBalance, setMinimumBalance] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingBalance(true);
    void Promise.all([
      handleGetWalletById(customer.id, controller.signal).catch(() => null),
      handleGetWalletInstructions(controller.signal).catch(() => null),
    ]).then(([walletResponse, instructions]) => {
      if (controller.signal.aborted) return;
      const wallet = walletResponse?.wallet;
      const nextWithdrawable = Number(wallet?.withdrawable ?? wallet?.affiliateBalance ?? 0) || 0;
      const nextNon = Number(wallet?.nonWithdrawable ?? wallet?.cashbackBalance ?? 0) || 0;
      const nextTotal =
        Number(wallet?.walletAmount ?? wallet?.totalBalance ?? nextWithdrawable + nextNon) || 0;
      setWithdrawable(nextWithdrawable);
      setNonWithdrawable(nextNon);
      setTotal(nextTotal);
      setMinimumBalance(
        Math.max(
          0,
          Number(instructions?.minimumBalance ?? instructions?.instructions?.minimumBalance ?? 0) || 0,
        ),
      );
      setLoadingBalance(false);
    });
    return () => controller.abort();
  }, [customer.id]);

  const spendable = Math.max(0, Math.round((total - minimumBalance) * 100) / 100);

  const submit = async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      await Swal.fire("Amount required", "Enter an amount greater than zero.", "info");
      return;
    }
    if (mode === "debit" && numericAmount > total + 0.001) {
      await Swal.fire(
        "Insufficient balance",
        `Available wallet balance is ${money(total)}.`,
        "info",
      );
      return;
    }
    if (mode === "debit" && numericAmount > spendable + 0.001) {
      await Swal.fire(
        "Minimum balance",
        `This wallet must keep ${money(minimumBalance)}. You can deduct up to ${money(spendable)}.`,
        "info",
      );
      return;
    }

    setSaving(true);
    try {
      await handleUpdateWallet(customer.id, {
        type: mode,
        amount: numericAmount,
        note: note.trim(),
        walletType: mode === "credit" ? walletType : undefined,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        createdBy,
      });
      await onSaved();
      onClose();
      await Swal.fire(
        "Updated",
        mode === "credit" ? "Wallet amount added." : "Wallet amount deducted.",
        "success",
      );
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Wallet update failed",
        err?.response?.data?.message ?? "Could not update this wallet.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close wallet modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-adjust-title"
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Wallet size={18} />
            </span>
            <div>
              <h2 id="wallet-adjust-title" className="text-base font-bold text-slate-900">
                {mode === "credit" ? "Add in wallet" : "Deduct from wallet"}
              </h2>
              <p className="text-xs text-slate-500">{customer.name || "Customer"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {loadingBalance ? "…" : money(total)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-2 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
              Withdrawable
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-800">
              {loadingBalance ? "…" : money(withdrawable)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Non-withdrawable
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {loadingBalance ? "…" : money(nonWithdrawable)}
            </p>
          </div>
        </div>

        {mode === "credit" ? (
          <label className="mt-4 block text-xs font-semibold text-slate-600">
            Wallet type
            <select
              value={walletType}
              onChange={(event) =>
                setWalletType(
                  event.target.value === "withdrawable" ? "withdrawable" : "nonWithdrawable",
                )
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-500"
            >
              <option value="nonWithdrawable">Non-withdrawable</option>
              <option value="withdrawable">Withdrawable</option>
            </select>
          </label>
        ) : (
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Deduction uses the combined balance. Non-withdrawable is used first, then withdrawable.
            {minimumBalance > 0 ? ` Minimum balance kept: ${money(minimumBalance)}.` : ""}
          </p>
        )}

        <label className="mt-3 block text-xs font-semibold text-slate-600">
          Amount (₹)
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Enter amount"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-500"
          />
        </label>

        <label className="mt-3 block text-xs font-semibold text-slate-600">
          Note
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Cash added, refund, adjustment…"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-500"
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || loadingBalance}
            className={`rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60 ${
              mode === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {saving ? "Saving…" : mode === "credit" ? "Add money" : "Deduct money"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
