import { KeyRound, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  handleVerifyStaffPin,
  type VerifiedStaff,
} from "@/services/apiClient";

const PIN_AUTO_LENGTH = 6;

type Props = {
  open: boolean;
  onClose: () => void;
  onVerified: (payload: {
    staff: VerifiedStaff;
    verifiedAt: string;
  }) => void;
};

export default function StaffVerifyModal({
  open,
  onClose,
  onVerified,
}: Props) {
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setPin("");
    setError("");
    setVerifying(false);
    verifyingRef.current = false;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const submit = async (rawPin: string) => {
    const value = rawPin.trim();
    if (value.length !== PIN_AUTO_LENGTH || !/^\d{6}$/.test(value)) {
      return;
    }
    if (verifyingRef.current) return;
    verifyingRef.current = true;

    try {
      setVerifying(true);
      setError("");
      const res = await handleVerifyStaffPin(value);
      if (!res?.success || !res.staff) {
        setError("Invalid Staff PIN.");
        setPin("");
        window.setTimeout(() => inputRef.current?.focus(), 50);
        return;
      }
      onVerified({
        staff: res.staff,
        verifiedAt: res.verifiedAt || new Date().toISOString(),
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || "Invalid Staff PIN.");
      setPin("");
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Verify Staff
              </h2>
              <p className="text-sm text-slate-500">
                Enter your 6-digit Staff PIN — verification starts automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-5">
          <label className="block text-sm font-medium text-slate-700">
            Staff PIN <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={PIN_AUTO_LENGTH}
              value={pin}
              disabled={verifying}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, PIN_AUTO_LENGTH);
                setPin(next);
                if (error) setError("");
                if (next.length === PIN_AUTO_LENGTH) {
                  void submit(next);
                }
              }}
              placeholder="••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-lg tracking-[0.35em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:opacity-70"
            />
            {verifying ? (
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-indigo-600">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : null}
          </div>
          {error ? (
            <p className="text-sm font-medium text-red-600">{error}</p>
          ) : verifying ? (
            <p className="text-xs font-medium text-indigo-600">Verifying…</p>
          ) : (
            <p className="text-xs text-slate-500">
              Type all 6 digits — no button needed.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/80 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/** Helper for Swal when verify fails outside the modal */
export async function alertInvalidStaffPin(message?: string) {
  await Swal.fire(
    "Verification failed",
    message || "Invalid Staff PIN.",
    "error",
  );
}
