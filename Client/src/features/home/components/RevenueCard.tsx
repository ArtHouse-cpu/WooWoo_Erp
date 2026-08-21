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
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-5">
      <div className="mb-2 flex items-start justify-between gap-2 sm:mb-3 sm:gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-gray-800 sm:text-sm">
            {title}
          </p>
          {period ? (
            <p className="mt-0.5 text-[10px] text-gray-400 sm:text-xs">{period}</p>
          ) : null}
        </div>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${iconWrapClass}`}
        >
          <Icon size={16} className={iconClass} />
        </span>
      </div>

      {loading ? (
        <div className="mb-2 h-7 w-24 animate-pulse rounded-md bg-gray-100 sm:mb-3 sm:h-9 sm:w-36" />
      ) : (
        <p className="mb-2 text-lg font-bold tracking-tight text-gray-900 sm:mb-3 sm:text-2xl sm:text-[28px]">
          {value}
        </p>
      )}

      {loading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className="h-3 w-12 animate-pulse rounded bg-gray-100 sm:h-4 sm:w-16"
            />
          ))}
        </div>
      ) : breakdown.length > 0 ? (
        <div className="flex flex-wrap gap-x-2 gap-y-1 sm:gap-x-3 sm:gap-y-1.5">
          {breakdown.map((item) => (
            <span
              key={item.label}
              className="text-[10px] font-medium leading-tight sm:text-[11px]"
            >
              <span className="text-gray-400">{item.label} </span>
              <span className={item.colorClass}>{item.value}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
