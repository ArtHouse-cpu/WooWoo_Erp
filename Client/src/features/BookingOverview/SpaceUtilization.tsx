import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart2,
  Calendar,
  ChevronRight,
  Clock,
  CreditCard,
  Gift,
  Layers,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SpaceUtilization } from "@/services/apiClient";

const PURPLE = "#7c3aed";
const PAID = "#16a34a";
const FREE = "#94a3b8";
const TYPE_COLORS = ["#7c3aed", "#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#e11d48", "#64748b"];

const hoursLabel = (value: number) => {
  const hours = Math.round((Number(value) || 0) * 100) / 100;
  return Number.isInteger(hours) ? `${hours}h` : `${hours}h`;
};

const inr = (value: number) =>
  `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

const pretty = (ymd?: string) => {
  if (!ymd) return "—";
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) return ymd;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const clock = (value?: string) => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value || "—";
  let hour = Number(match[1]);
  const minute = match[2];
  if (hour === 24) return `12:${minute} AM`;
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${period}`;
};

type SortKey = "bookingCode" | "customerName" | "spaceName" | "spaceType" | "bookingDate" | "durationHours" | "grandTotal";

export default function SpaceUtilizationPanel({
  data,
  cardsOnly = false,
}: {
  data: SpaceUtilization | null;
  cardsOnly?: boolean;
}) {
  const [day, setDay] = useState("");
  const [sort, setSort] = useState<SortKey>("bookingDate");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | "Paid" | "Free">("all");

  const rows = data?.rows || [];
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = rows.filter(row => {
      if (day && row.bookingDate !== day) return false;
      if (category !== "all" && row.category !== category) return false;
      if (!term) return true;
      return [row.bookingCode, row.customerName, row.spaceName, row.spaceType]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
    list.sort((left, right) => {
      const a = left[sort] ?? "";
      const b = right[sort] ?? "";
      const result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
      return order === "asc" ? result : -result;
    });
    return list;
  }, [rows, day, query, category, sort, order]);

  if (!data) {
    if (cardsOnly) return null;
    return (
      <section className="rounded-3xl border border-purple-100/60 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
        Space utilization will appear after bookings load.
      </section>
    );
  }

  const typeHint = data.spaceTypes
    .slice(0, 3)
    .map(item => `${item.spaceType} ${hoursLabel(item.hours)}`)
    .join(" · ");
  const dayCount = Math.max(0, Number(data.days) || 0);
  const dayHours = Number(data.dayHours) || 18;
  const openHours = dayCount * dayHours;
  const bookedShare = openHours > 0 ? Math.round((data.bookedHours / openHours) * 1000) / 10 : 0;
  const openFormula = `${hoursLabel(dayHours)} · ${dayCount} days = ${hoursLabel(openHours)}`;
  const chartDays = data.daysSeries.map(point => ({ ...point, availableHours: dayHours }));

  const kpiGrid = (
    <div className="space-y-3">
      {/* 2x2 Grid of 4 KPI cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Card 1: OPEN HOURS */}
        <div className="flex flex-col justify-between rounded-2xl bg-[#F6F1FE] border border-purple-100/80 p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-purple-200/60 text-[#673DE6]">
              <Clock size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                OPEN HOURS
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-0.5">
                {hoursLabel(openHours)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10.5px] sm:text-[11px] font-semibold text-slate-500 truncate">
            <span className="text-emerald-600 font-bold">↑</span> {openFormula}
          </p>
        </div>

        {/* Card 2: HOURS BOOKED */}
        <div className="flex flex-col justify-between rounded-2xl bg-[#EDF6FE] border border-sky-100/80 p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-sky-200/60 text-[#0284C7]">
              <Calendar size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                HOURS BOOKED
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-0.5">
                {hoursLabel(data.bookedHours)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10.5px] sm:text-[11px] font-semibold text-sky-600 truncate">
            <span className="font-bold">↑</span> {bookedShare}% of open hours
          </p>
        </div>

        {/* Card 3: PAID BOOKINGS */}
        <div className="flex flex-col justify-between rounded-2xl bg-[#EEFBF3] border border-emerald-100/80 p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200/60 text-[#059669]">
              <CreditCard size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                PAID BOOKINGS
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-0.5">
                {hoursLabel(data.paidHours)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10.5px] sm:text-[11px] font-semibold text-emerald-700 truncate">
            <span className="font-bold">↑</span> {data.paidBookings} paid
          </p>
        </div>

        {/* Card 4: FREE BOOKINGS */}
        <div className="flex flex-col justify-between rounded-2xl bg-[#FFF5ED] border border-orange-100/80 p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-orange-200/60 text-[#EA580C]">
              <Gift size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                FREE BOOKINGS
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-0.5">
                {hoursLabel(data.freeHours)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10.5px] sm:text-[11px] font-semibold text-orange-600/80 truncate">
            — {data.freeBookings} free
          </p>
        </div>
      </div>

      {/* Full-width SPACE TYPES card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#F7F2FE] border border-purple-100/80 p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
        {/* Background decorative soft purple waves */}
        <div className="pointer-events-none absolute -right-6 -bottom-8 h-32 w-32 rounded-full bg-purple-200/40" />
        <div className="pointer-events-none absolute -right-2 -bottom-4 h-24 w-24 rounded-full bg-purple-300/30" />

        <div className="relative flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-200/60 text-[#673DE6]">
            <Layers size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              SPACE TYPES
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {data.spaceTypes.length}
            </p>
            <p className="text-xs font-bold text-[#673DE6] truncate mt-0.5">
              {typeHint || "No space types booked"}
            </p>
          </div>
        </div>

        <div className="relative shrink-0 ml-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-200/60 text-[#673DE6] shadow-2xs">
            <ChevronRight size={16} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );

  if (cardsOnly) return kpiGrid;

  return (
    <div className="space-y-3.5">
      {/* 1. Space Booking Utilization Card Container */}
      <article className="rounded-[28px] border border-purple-100/80 bg-white p-4 sm:p-5 shadow-[0_4px_24px_rgba(103,61,230,0.05)] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#673DE6]" />
            <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900">
              Space Booking Utilization
            </h2>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-100/60 text-[#673DE6]">
            <BarChart2 size={16} strokeWidth={2.5} />
          </div>
        </div>
        {kpiGrid}
      </article>

      {/* 2. Day-wise booked hours Card Container */}
      <article className="rounded-[28px] border border-purple-100/80 bg-white p-4 sm:p-5 shadow-[0_4px_24px_rgba(103,61,230,0.05)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-100/60 text-[#673DE6]">
              <BarChart2 size={16} strokeWidth={2.5} />
            </div>
            <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900">
              Day-wise booked hours
            </h2>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-[#673DE6] shadow-2xs">
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </div>
        </div>

        <p className="text-xs font-medium text-slate-500 leading-relaxed">
          Each day is open {hoursLabel(dayHours)} (6:00 AM to midnight). This filler is {openFormula} open, and {hoursLabel(data.bookedHours)} is booked. The purple line is the {hoursLabel(dayHours)} day.
        </p>

        <div className="h-52 sm:h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartDays}
              margin={{ top: 8, right: 6, left: -20, bottom: 0 }}
              onClick={state => {
                const date = state?.activePayload?.[0]?.payload?.date;
                if (date) setDay(current => (current === date ? "" : date));
              }}
            >
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tickFormatter={pretty} tick={{ fontSize: 10, fill: "#334155" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#334155" }} width={28} />
              <Tooltip
                formatter={(value, name) => [hoursLabel(Number(value)), name]}
                labelFormatter={label => pretty(String(label))}
              />
              <Bar dataKey="paidHours" name="Paid hours" stackId="booked" fill={PAID} radius={[0, 0, 0, 0]} />
              <Bar dataKey="freeHours" name="Free hours" stackId="booked" fill={FREE} radius={[3, 3, 0, 0]} />
              <Line dataKey="availableHours" name="Open hours" stroke={PURPLE} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* 3. Space Types distribution pie & booking details table */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <article className="rounded-2xl border border-purple-100/80 bg-white p-3.5 sm:p-4 shadow-xs">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900">Space Types Breakdown</h3>
          <p className="text-[10px] sm:text-[11px] text-slate-500">Share of booked hours</p>
          {data.spaceTypes.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">No bookings in this period.</p>
          ) : (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] items-center gap-2">
              <div className="h-32 sm:h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.spaceTypes} dataKey="hours" nameKey="spaceType" innerRadius={34} outerRadius={52} paddingAngle={2}>
                      {data.spaceTypes.map((item, index) => (
                        <Cell key={item.spaceType} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [hoursLabel(Number(value)), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 max-h-48 sm:max-h-none overflow-y-auto">
                {data.spaceTypes.map((item, index) => (
                  <li key={item.spaceType} className="text-[10px] sm:text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-700">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TYPE_COLORS[index % TYPE_COLORS.length] }} />
                        <span className="truncate">{item.spaceType}</span>
                      </span>
                      <span className="shrink-0 font-bold text-slate-700">{item.share}%</span>
                    </div>
                    <p className="pl-3.5 text-slate-500 truncate">
                      {(item.spaces || []).join(', ') || item.spaceType}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-purple-100/80 bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-100 p-2.5 sm:px-3 sm:py-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 shrink-0">
              {day ? `Bookings on ${pretty(day)}` : "Booking Details"}
            </h3>
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search booking..."
                className="h-8 flex-1 rounded-xl border border-slate-200 px-2.5 text-xs outline-none focus:border-purple-500"
              />
              <select
                value={category}
                onChange={event => setCategory(event.target.value as "all" | "Paid" | "Free")}
                className="h-8 shrink-0 rounded-xl border border-slate-200 px-2 text-xs font-semibold text-slate-700"
              >
                <option value="all">All</option>
                <option value="Paid">Paid</option>
                <option value="Free">Free</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-purple-50/50 text-[10px] uppercase tracking-wide text-slate-500 font-bold">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Booking</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Space</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Hours</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.slice(0, 15).map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-800">{row.bookingCode}</td>
                    <td className="px-3 py-2">{row.customerName || "—"}</td>
                    <td className="px-3 py-2">{row.spaceName || "—"}</td>
                    <td className="px-3 py-2">{pretty(row.bookingDate)}</td>
                    <td className="px-3 py-2 font-bold text-purple-700">{hoursLabel(row.durationHours)}</td>
                    <td className="px-3 py-2 font-semibold">{inr(row.grandTotal)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.category === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {row.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length === 0 ? <p className="px-3 py-6 text-center text-xs text-slate-400">No bookings in this view.</p> : null}
        </article>
      </div>
    </div>
  );
}
