import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import SetOffersScreen from "@/features/marketing/pages/SetOffersScreen";
import BuyOneGetOneScreen from "@/features/sales/pages/BuyOneGetOneScreen";

type OfferTab = "space" | "food";

const TABS: { id: OfferTab; label: string; permission: string }[] = [
  { id: "space", label: "Space offer", permission: PERMISSIONS.COUPON_READ },
  { id: "food", label: "Food Offer", permission: PERMISSIONS.FOOD_READ },
];

export default function OffersAndDiscountsScreen() {
  const { can } = usePermission();
  const [params, setParams] = useSearchParams();
  const visibleTabs = TABS.filter((item) => can(item.permission));
  const requested: OfferTab = params.get("tab") === "food" ? "food" : "space";
  const tab: OfferTab = visibleTabs.some((item) => item.id === requested)
    ? requested
    : visibleTabs[0]?.id || "space";
  const [opened, setOpened] = useState<Record<OfferTab, boolean>>({
    space: tab === "space",
    food: tab === "food",
  });

  const select = (next: OfferTab) => {
    setOpened((current) => ({ ...current, [next]: true }));
    const nextParams = new URLSearchParams(params);
    if (next === "space") nextParams.delete("tab");
    else nextParams.set("tab", "food");
    setParams(nextParams, { replace: true });
  };

  return (
    <div className="min-w-0">
      <div className="border-b border-slate-200 bg-white px-3 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item.id)}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${
                  active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      {opened.space && can(PERMISSIONS.COUPON_READ) ? (
        <div className={tab === "space" ? "block" : "hidden"} aria-hidden={tab !== "space"}>
          <SetOffersScreen />
        </div>
      ) : null}
      {opened.food && can(PERMISSIONS.FOOD_READ) ? (
        <div className={tab === "food" ? "block" : "hidden"} aria-hidden={tab !== "food"}>
          <BuyOneGetOneScreen />
        </div>
      ) : null}
    </div>
  );
}
