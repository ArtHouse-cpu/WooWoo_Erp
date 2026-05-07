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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? "Create Purchase" : mode === "edit" ? "Edit Purchase" : "View Purchase"}
          </h1>
          <p className="text-xs text-gray-500">WOO WOO ART HOUSE, Bhilai</p>
        </div>
        <div className="ml-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
        {mode === "create" ? "PURCHASE- " : ""}
          <span className="font-semibold">{purchaseNumber}</span>
        </div>
      </div>

      {mode !== "view" && (
        <div className="flex items-center gap-2">
          {mode === "create" && onSaveDraft && (
            <button
              onClick={onSaveDraft}
              disabled={isSaving}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
            >
              Save as Draft
            </button>
          )}
          {mode === "create" && onSavePrint && (
            <button
              onClick={onSavePrint}
              disabled={isSaving}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
            >
              Save and Print
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            >
              <Save size={14} /> {isSaving ? "Saving..." : (mode === "edit" ? "Update" : "Save")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
