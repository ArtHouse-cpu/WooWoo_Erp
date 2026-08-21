import { ArrowLeft, Save, Printer, FileText } from "lucide-react";

type Props = {
  invoiceNo: string;
  onBack: () => void;
  onSaveDraft?: () => void;
  onSavePrint?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  mode?: "create" | "edit" | "view";
  title?: string;
  prefix?: string;
  /** When true, renders without its own card chrome (for merged panels). */
  embedded?: boolean;
};

export default function CreateInvoiceHeader({
  invoiceNo,
  onBack,
  onSaveDraft,
  onSavePrint,
  onSave,
  isSaving = false,
  mode = "create",
  title,
  prefix = "INVVWAH- ",
  embedded = false,
}: Props) {
  const heading =
    title ||
    (mode === "create"
      ? "Create Invoice"
      : mode === "edit"
        ? "Edit Invoice"
        : "View Invoice");

  return (
    <div
      className={
        embedded
          ? "space-y-3"
          : "sticky top-0 z-30 -mx-1 space-y-3 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-md sm:mx-0 sm:px-4"
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              {heading}
            </h1>
            <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
              <span className="shrink-0 text-slate-400">
                {mode === "create" ? prefix.trim() : "Invoice"}
              </span>
              <span className="truncate font-semibold text-slate-800">
                {invoiceNo}
              </span>
            </div>
          </div>
        </div>

        {mode !== "view" && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end lg:shrink-0">
            {mode === "create" && onSaveDraft && (
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:min-w-[7.5rem]"
              >
                <FileText size={14} className="opacity-70" />
                Draft
              </button>
            )}
            {mode === "create" && onSavePrint && (
              <button
                type="button"
                onClick={onSavePrint}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:min-w-[7.5rem]"
              >
                <Printer size={14} className="opacity-70" />
                Print
              </button>
            )}
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 ${
                  mode === "create"
                    ? "col-span-2 sm:col-span-1 sm:min-w-[8rem]"
                    : "col-span-2 sm:min-w-[8rem]"
                }`}
              >
                <Save size={14} />
                {isSaving ? "Saving…" : mode === "edit" ? "Update" : "Save"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
