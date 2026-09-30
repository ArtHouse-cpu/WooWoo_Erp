import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Wand2, X } from "lucide-react";
import type { GiftCardData } from "../Pages/GiftCard";
import { useAuthStore } from "@/store/authStore";
import { useAppSelector } from "@/store/hooks";
import { toast } from "react-toastify";

export type GiftCardFormData = Omit<GiftCardData, "_id"> & {
  _id?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Return false (or reject) to keep the modal open, e.g. on a server error. */
  onSubmit: (card: GiftCardFormData) => Promise<boolean | void> | boolean | void;
  initialData?: GiftCardData | null;
  existingCards?: GiftCardData[];
  defaultCreatedBy?: string;
};

export const resolveStaffName = (
  reduxName?: string | null,
  authUserName?: string | null,
  fallback?: string,
): string => {
  const fromRedux = reduxName?.trim();
  if (fromRedux) return fromRedux;

  const fromAuth = authUserName?.trim();
  if (fromAuth) return fromAuth;

  try {
    const authRaw = localStorage.getItem("auth-storage");
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      const u = parsed?.state?.user;
      const name =
        u?.fullName?.trim() || u?.name?.trim() || u?.m_staff_name?.trim();
      if (name) return name;
    }
  } catch {
    // ignore
  }

  try {
    const reduxRaw = localStorage.getItem("wooerp-redux-user");
    if (reduxRaw) {
      const parsed = JSON.parse(reduxRaw);
      const name = parsed?.m_staff_name?.trim();
      if (name) return name;
    }
  } catch {
    // ignore
  }

  return fallback?.trim() || "Staff";
};

export const generateGiftCardCode = (existingCards: GiftCardData[] = []): string => {
  const year = new Date().getFullYear();
  let maxNum = 0;
  for (const c of existingCards) {
    const match = c.code?.match(/GC-\d+-(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  const nextNum = maxNum > 0 ? maxNum + 1 : existingCards.length + 1;
  return `GC-${year}-${String(nextNum).padStart(3, "0")}`;
};

const getDefaultExpiryDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
};

export default function CreateGiftCardModal({
  open,
  onClose,
  onSubmit,
  initialData = null,
  existingCards = [],
  defaultCreatedBy = "",
}: Props) {
  const authUser = useAuthStore((state) => state.user);
  const reduxStaffName = useAppSelector((state) => state.user.m_staff_name);

  const resolvedStaffName = useMemo(() => {
    const authName =
      authUser?.fullName ||
      (authUser as any)?.name ||
      (authUser as any)?.m_staff_name ||
      null;
    return resolveStaffName(reduxStaffName, authName, defaultCreatedBy || "Admin");
  }, [reduxStaffName, authUser, defaultCreatedBy]);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [initialAmount, setInitialAmount] = useState<number | "">("");
  const [currentBalance, setCurrentBalance] = useState<number | "">("");
  const [createdBy, setCreatedBy] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState<GiftCardData["status"]>("Active");
  const [balanceTouched, setBalanceTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setCode(initialData.code || "");
      setName(initialData.name || "");
      setInitialAmount(initialData.initialAmount ?? 0);
      setCurrentBalance(initialData.currentBalance ?? 0);
      setCreatedBy(initialData.createdBy || resolvedStaffName);
      setExpiryDate(
        initialData.expiryDate
          ? new Date(initialData.expiryDate).toISOString().split("T")[0]
          : getDefaultExpiryDate(),
      );
      setStatus(initialData.status || "Active");
      setBalanceTouched(true);
    } else {
      setCode(generateGiftCardCode(existingCards));
      setName("");
      setInitialAmount("");
      setCurrentBalance("");
      setCreatedBy(resolvedStaffName);
      setExpiryDate(getDefaultExpiryDate());
      setStatus("Active");
      setBalanceTouched(false);
    }
  }, [open, initialData, existingCards, resolvedStaffName]);

  if (!open) return null;

  const isEdit = Boolean(initialData?._id);

  const handleAmountChange = (value: number | "") => {
    setInitialAmount(value);
    // If creating and balance hasn't been manually edited, auto-match the amount
    if (!isEdit && !balanceTouched) {
      setCurrentBalance(value);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!code.trim() || !name.trim() || initialAmount === "") return;

    const amount = Number(initialAmount || 0);
    const balance =
      currentBalance === "" ? amount : Number(currentBalance || 0);
    if (amount <= 0) {
      toast.error("Amount must be greater than 0.");
      return;
    }
    if (balance > amount) {
      toast.error("Balance cannot be greater than the amount.");
      return;
    }

    setSubmitting(true);
    let saved: boolean | void = false;
    try {
      saved = await onSubmit({
        _id: initialData?._id,
        code: code.trim(),
        name: name.trim(),
        initialAmount: amount,
        currentBalance: balance,
        createdBy: createdBy.trim() || resolvedStaffName,
        expiryDate: expiryDate || getDefaultExpiryDate(),
        status,
      });
    } catch {
      saved = false;
    } finally {
      setSubmitting(false);
    }

    if (saved !== false) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? "Edit Gift Card" : "Create Gift Card"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {isEdit
                ? "Update gift card details."
                : "Enter gift card details to add to the table."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form - Only MRT Table Parameters */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Gift Card Code */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Gift Card Code <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. GC-2026-001"
                required
                className="h-10 flex-1 rounded-xl border border-gray-300 px-3.5 text-sm font-medium text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
              />
              <button
                type="button"
                onClick={() => setCode(generateGiftCardCode(existingCards))}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-50 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                title="Generate new code"
              >
                <Wand2 size={15} />
                <span>Generate</span>
              </button>
            </div>
          </div>

          {/* 2. Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Birthday Gift Card, Festival Gift Card"
              required
              autoFocus={!isEdit}
              className="h-10 w-full rounded-xl border border-gray-300 px-3.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 3. Amount (initialAmount) */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-gray-400">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={initialAmount}
                  onChange={(e) =>
                    handleAmountChange(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  required
                  className="h-10 w-full rounded-xl border border-gray-300 pl-8 pr-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  placeholder="2000"
                />
              </div>
            </div>

            {/* 4. Balance (currentBalance) */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Balance (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-gray-400">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={currentBalance}
                  onChange={(e) => {
                    setBalanceTouched(true);
                    setCurrentBalance(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                  }}
                  required
                  className="h-10 w-full rounded-xl border border-gray-300 pl-8 pr-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  placeholder="2000"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 5. Created By */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Created By <span className="text-red-500">*</span>
                </label>
                {resolvedStaffName && (
                  <span className="text-[11px] font-medium text-emerald-600">
                    Logged in: {resolvedStaffName}
                  </span>
                )}
              </div>
              <input
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="Staff name"
                required
                className="h-10 w-full rounded-xl border border-gray-300 px-3.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>

            {/* 6. Expiry Date */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          {/* 7. Status */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as GiftCardData["status"])
              }
              className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
            >
              <option value="Active">Active</option>
              <option value="Used">Used</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer rounded-xl bg-black px-6 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Gift Card"
                  : "Create Gift Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
