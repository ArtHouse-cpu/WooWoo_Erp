import { UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import InvoicedBySelect from "../components/shared/InvoicedBySelect";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after user selects Invoiced By and continues */
  onContinue: (payload: { invoicedById: string; invoicedBy: string }) => void;
  initialInvoicedById?: string;
  initialInvoicedByName?: string;
};

export default function InvoicedByModal({
  open,
  onClose,
  onContinue,
  initialInvoicedById = "",
  initialInvoicedByName = "",
}: Props) {
  const [invoicedById, setInvoicedById] = useState(initialInvoicedById);
  const [invoicedByName, setInvoicedByName] = useState(initialInvoicedByName);

  useEffect(() => {
    if (!open) return;
    setInvoicedById(initialInvoicedById);
    setInvoicedByName(initialInvoicedByName);
  }, [open, initialInvoicedById, initialInvoicedByName]);

  if (!open) return null;

  const handleContinue = () => {
    if (!invoicedById.trim() || !invoicedByName.trim()) {
      void Swal.fire(
        "Invoiced By required",
        "Please select who this bill is invoiced by.",
        "warning",
      );
      return;
    }
    onContinue({
      invoicedById: invoicedById.trim(),
      invoicedBy: invoicedByName.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <UserRound size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Invoiced By
              </h2>
              <p className="text-sm text-slate-500">
                Select who is invoicing this bill before checkout.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <InvoicedBySelect
            valueId={invoicedById}
            valueName={invoicedByName}
            onChange={(id, name) => {
              setInvoicedById(id);
              setInvoicedByName(name);
            }}
            label="Invoiced By"
            required
            allowCreate={false}
            allowEdit={false}
            allowDelete={false}
          />
          <p className="text-xs text-slate-500">
            Choose a name from the list. Manage (create / delete) names under{" "}
            <span className="font-semibold text-slate-700">Access → Invoiced By</span>.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Continue to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
