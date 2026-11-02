import { useNavigate } from "react-router-dom";

export type SalesSubcategory =
  | "invoice"
  | "sales"
  | "creditnotes"
  | "quotations"
  | "subscriptions";

interface SalesHeaderNavProps {
  activeSubcategory: SalesSubcategory;
  onOpenMore?: () => void;
}

const TABS: Array<{ id: SalesSubcategory; label: string; path: string }> = [
  { id: "invoice", label: "Sales", path: "/pos" },
  { id: "creditnotes", label: "Credit Notes", path: "/creditnotes" },
  { id: "quotations", label: "Quotations", path: "/quotations" },
  { id: "subscriptions", label: "Subscription", path: "/subscriptions" },
];

export default function SalesHeaderNav({
  activeSubcategory,
}: SalesHeaderNavProps) {
  const navigate = useNavigate();

  return (
    <div className="-mx-1 border-b border-slate-200 bg-white px-2">
      <div className="hide-scrollbar flex items-center gap-6 overflow-x-auto pt-1">
        {TABS.map((tab) => {
          const isActive =
            activeSubcategory === tab.id ||
            (tab.id === "invoice" && activeSubcategory === "sales");
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (!isActive) navigate(tab.path);
              }}
              className={`relative shrink-0 pb-2.5 pt-1 text-sm transition whitespace-nowrap ${
                isActive
                  ? "font-bold text-blue-600"
                  : "font-medium text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => navigate("/purchase")}
          className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800 whitespace-nowrap"
        >
         Purchases
        </button>
      </div>
    </div>
  );
}
