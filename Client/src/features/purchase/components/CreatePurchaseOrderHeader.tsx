import {ArrowLeft, Save} from "lucide-react";

type Props = {
  purchaseOrderNo: string;
  onBack: () => void;
  onClear?: () => void;
  onSaveDraft?: () => void;
  onSavePrint?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  mode?: "create" | "edit" | "view";
};

export default function CreatePurchaseHeader({
  purchaseOrderNo,
  onBack,
  onClear,
  onSaveDraft,
  onSavePrint,
  onSave,
  isSaving = false,
  mode = "create",
}: Props) {
  const title =
    mode === "create"
      ? "Create Purchase Order"
      : mode === "edit"
        ? "Edit Purchase"
        : "View Purchase";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:px-4">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight text-gray-900 sm:text-lg">
            {title}
          </h1>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {mode === "create" ? "PURODR- " : ""}
            <span className="font-semibold text-gray-800">{purchaseOrderNo}</span>
          </p>
        </div>
        {mode === "create" && onClear ? (
          <button
            type="button"
            onClick={onClear}
            disabled={isSaving}
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Clear
          </button>
        ) : null}
      </div>

      {mode !== "view" && (
        <div className="grid grid-cols-3 gap-2 sm:flex sm:justify-end">
          {mode === "create" && onSaveDraft ? (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSaving}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 sm:px-3 sm:text-sm"
            >
              Save as Draft
            </button>
          ) : null}
          {mode === "create" && onSavePrint ? (
            <button
              type="button"
              onClick={onSavePrint}
              disabled={isSaving}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 sm:px-3 sm:text-sm"
            >
              Save and Print
            </button>
          ) : null}
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:px-3 sm:text-sm"
            >
              <Save size={14} />
              {isSaving ? "Saving..." : mode === "edit" ? "Update" : "Save"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
