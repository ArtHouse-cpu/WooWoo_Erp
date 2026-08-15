import type { LucideIcon } from "lucide-react";


export type KpiBreakdownItem = {
  label: string;
  value: string;
  colorClass: string;
};

type RevenueCardProps = {
  title: string;
  period?: string;
  value: string;
  icon: LucideIcon;
  iconWrapClass: string;
  iconClass?: string;
  breakdown?: KpiBreakdownItem[];
  loading?: boolean;
};


export default function RevenueCard({
  title,
  period,
  value,
  icon: Icon,
  iconWrapClass,
  iconClass = "text-white",
  breakdown = [],
  loading = false,
}: RevenueCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800">{title}</p>
          {period ? (
            <p className="mt-0.5 text-xs text-gray-400">{period}</p>
          ) : null}
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}
        >
          <Icon size={18} className={iconClass} />
        </span>
      </div>

      {loading ? (
        <div className="mb-3 h-9 w-36 animate-pulse rounded-md bg-gray-100" />
      ) : (
        <p className="mb-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px]">
          {value}
        </p>
      )}

      {loading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className="h-4 w-16 animate-pulse rounded bg-gray-100"
            />
          ))}
        </div>
      ) : breakdown.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {breakdown.map((item) => (
            <span key={item.label} className="text-[11px] font-medium leading-tight">
              <span className="text-gray-400">{item.label} </span>
              <span className={item.colorClass}>{item.value}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
