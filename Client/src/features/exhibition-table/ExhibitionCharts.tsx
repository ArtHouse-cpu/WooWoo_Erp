import { useMemo } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ExhibitionPassRecord } from "@/services/apiClient";
import { buildExhibitionStats, type ChartSlice } from "./exhibitionStats";

type PieCardProps = {
  title: string;
  subtitle?: string;
  slices: ChartSlice[];
  centerLabel: string;
};

const percent = (value: number, total: number) =>
  total ? Math.round((value / total) * 100) : 0;

const PieCard = ({ title, subtitle, slices, centerLabel }: PieCardProps) => {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="flex w-[85%] shrink-0 snap-center flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:w-[55%] md:w-[44%] xl:w-auto xl:shrink">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="truncate text-[11px] text-gray-400">{subtitle}</p>}
      </div>

      {total === 0 ? (
        <div className="flex h-28 items-center justify-center text-sm text-gray-400">
          No data yet
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative h-28 w-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  stroke="none"
                />
                <Tooltip
                  formatter={(value) => {
                    const n = Number(value);
                    return `${n} (${percent(n, total)}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Total in the donut hole */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold leading-none text-gray-800">{total}</span>
              <span className="mt-0.5 text-[10px] text-gray-500">{centerLabel}</span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1">
            {slices.map((slice) => (
              <li key={slice.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.fill }}
                />
                <span className="min-w-0 flex-1 leading-tight text-gray-700">
                  {slice.name}
                </span>
                <span className="font-semibold text-gray-800">{slice.value}</span>
                <span className="w-9 text-right text-gray-400">
                  {percent(slice.value, total)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

type Props = {
  passes: ExhibitionPassRecord[];
};

const ExhibitionCharts = ({ passes }: Props) => {
  const stats = useMemo(() => buildExhibitionStats(passes), [passes]);

  return (
    <div className="-mx-3 mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:-mx-4 sm:px-4 md:-mx-5 md:px-5 xl:mx-0 xl:grid xl:grid-cols-3 xl:gap-4 xl:overflow-visible xl:px-0 xl:pb-0 [&::-webkit-scrollbar]:hidden">
      <PieCard title="Gender" slices={stats.gender} centerLabel="visitors" />
      <PieCard title="Age Group" slices={stats.age} centerLabel="visitors" />
      <PieCard
        title="Interests"
        subtitle="Visitors can pick more than one"
        slices={stats.interests}
        centerLabel="selections"
      />
    </div>
  );
};

export default ExhibitionCharts;