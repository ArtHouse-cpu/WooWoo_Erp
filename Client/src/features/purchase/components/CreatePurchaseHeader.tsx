import {ArrowLeft, Save} from "lucide-react";

type Props = {
  purchaseNumber: string;
  onBack: () => void;
  onSaveDraft?: () => void;
  onSavePrint?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  mode?: "create" | "edit" | "view";
};

export default function CreatePurchaseHeader({
  purchaseNumber,
  onBack,
  onSaveDraft,
  onSavePrint,
  onSave, 
  isSaving = false,
  mode = "create",
}: Props) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-4">
      <div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-md border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight text-gray-900 sm:text-lg">
            {mode === "create" ? "Create Purchase" : mode === "edit" ? "Edit Purchase" : "View Purchase"}
          </h1>
          <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 sm:mt-0 sm:hidden">
            {mode === "create" ? <span>PURCHASE-</span> : null}
            <span className="truncate font-semibold">{purchaseNumber}</span>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 sm:flex">
          {mode === "create" ? "PURCHASE- " : ""}
          <span className="font-semibold">{purchaseNumber}</span>
        </div>
      </div>

      {mode !== "view" && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {mode === "create" && onSaveDraft && (
            <button
              onClick={onSaveDraft}
              disabled={isSaving}
              className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 sm:flex-none"
            >
              Save as Draft
            </button>
          )}
          {mode === "create" && onSavePrint && (
            <button
              onClick={onSavePrint}
              disabled={isSaving}
              className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 sm:flex-none"
            >
              Save and Print
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white sm:flex-none"
            >
              <Save size={14} /> {isSaving ? "Saving..." : (mode === "edit" ? "Update" : "Save")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
