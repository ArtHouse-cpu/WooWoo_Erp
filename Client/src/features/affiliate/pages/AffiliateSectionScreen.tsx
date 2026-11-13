import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import HapScreen from "@/features/network/pages/HapScreen";
import AffiliateProgramScreen from "./AffiliateProgramScreen";

type SectionTab = "hap" | "affiliate";

const TABS: { id: SectionTab; label: string }[] = [
  { id: "hap", label: "HAP" },
  { id: "affiliate", label: "Affiliate" },
];

export default function AffiliateSectionScreen() {
  const [params, setParams] = useSearchParams();
  const tab: SectionTab = params.get("tab") === "hap" ? "hap" : "affiliate";
  const [opened, setOpened] = useState<Record<SectionTab, boolean>>({
    hap: tab === "hap",
    affiliate: true,
  });

  const select = (next: SectionTab) => {
    setOpened((current) => ({ ...current, [next]: true }));
    const nextParams = new URLSearchParams(params);
    if (next === "affiliate") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setParams(nextParams, { replace: true });
  };

  return (
    <div className="min-w-0">
      <div className="border-b border-slate-200 bg-white px-3 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((item) => {
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
      {opened.hap ? (
        <div className={tab === "hap" ? "block" : "hidden"} aria-hidden={tab !== "hap"}>
          <HapScreen />
        </div>
      ) : null}
      {opened.affiliate ? (
        <div className={tab === "affiliate" ? "block" : "hidden"} aria-hidden={tab !== "affiliate"}>
          <AffiliateProgramScreen />
        </div>
      ) : null}
    </div>
  );
}
