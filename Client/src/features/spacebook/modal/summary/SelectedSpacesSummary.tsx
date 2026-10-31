export type SummaryBookedSpace = {
  spaceId: string;
  spaceName: string;
  spaceCode?: string;
  spaceDay?: string;
  unitPrice: number;
  lineTotal: number;
};

export function SpaceChargeBreakdown({
  spaces,
}: {
  spaces: SummaryBookedSpace[];
}) {
  if (spaces.length <= 1) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {spaces.map((space) => (
        <div
          key={space.spaceId}
          className="flex items-center justify-between gap-2 text-[11px] text-slate-500"
        >
          <span className="min-w-0 truncate">
            {space.spaceName || "Space"}
            {space.spaceDay ? ` (${space.spaceDay})` : ""}
            {space.unitPrice ? ` · ₹${Number(space.unitPrice).toLocaleString("en-IN")}` : ""}
          </span>
          <span className="shrink-0 font-medium text-slate-700">
            ₹{Number(space.lineTotal || 0).toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SelectedSpacesSummary({
  spaces,
}: {
  spaces: SummaryBookedSpace[];
}) {
  if (spaces.length <= 1) return null;
  return (
    <div className="space-y-2">
      {spaces.map((space) => (
        <div
          key={space.spaceId}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-800">
              {space.spaceName || "Space"}
            </p>
            <p className="truncate text-[11px] font-medium text-slate-400">
              {[space.spaceCode, space.spaceDay].filter(Boolean).join(" · ") ||
                "Selected space"}
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold text-indigo-600">
            ₹{Number(space.lineTotal || 0).toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
}
