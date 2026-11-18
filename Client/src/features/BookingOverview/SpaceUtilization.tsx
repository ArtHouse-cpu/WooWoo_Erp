import { useMemo, useState } from "react";
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

type SortKey = "bookingDate" | "customerName" | "spaceName" | "durationHours" | "grandTotal";

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

  const toggle = (key: SortKey) => {
    if (sort === key) setOrder(current => (current === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setOrder(key === "bookingDate" ? "desc" : "asc");
    }
  };

  if (!data) {
    if (cardsOnly) return null;
    return (
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
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
  const openFormula = `${hoursLabel(dayHours)} × ${dayCount} day${dayCount === 1 ? "" : "s"} = ${hoursLabel(openHours)}`;
  const cards = [
    { label: "Open hours", value: hoursLabel(openHours), hint: openFormula },
    { label: "Hours booked", value: hoursLabel(data.bookedHours), hint: `${bookedShare}% of open hours · ${data.rows.length} bookings` },
    { label: "Paid bookings", value: hoursLabel(data.paidHours), hint: `${data.paidBookings} paid` },
    { label: "Free bookings", value: hoursLabel(data.freeHours), hint: `${data.freeBookings} free` },
    { label: "Space types", value: String(data.spaceTypes.length), hint: typeHint || "None booked" },
  ];
  const chartDays = data.daysSeries.map(point => ({ ...point, availableHours: dayHours }));

  const kpiGrid = (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      {cards.map(card => (
        <article key={card.label} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{card.label}</p>
          <p className="mt-1 text-xl font-black tracking-tight text-slate-900">{card.value}</p>
          <p className="mt-0.5 text-[11px] font-medium leading-snug text-violet-700" title={card.hint}>{card.hint}</p>
        </article>
      ))}
    </div>
  );

  if (cardsOnly) return kpiGrid;

  return (
    <section className="space-y-3">
      {kpiGrid}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Day-wise booked hours</h3>
              <p className="text-[11px] text-slate-500">
                Each day is open {hoursLabel(dayHours)} (6:00 AM to midnight). This filter is {openFormula} open, and {hoursLabel(data.bookedHours)} is booked. The purple line is the {hoursLabel(dayHours)} day. Green is paid, grey is free.
              </p>
            </div>
            {day ? (
              <button type="button" onClick={() => setDay("")} className="text-xs font-semibold text-violet-700">
                Clear {pretty(day)}
              </button>
            ) : null}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartDays}
                onClick={state => {
                  const date = state?.activePayload?.[0]?.payload?.date;
                  if (date) setDay(current => (current === date ? "" : date));
                }}
              >
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tickFormatter={pretty} tick={{ fontSize: 10, fill: "#64748b" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={36} />
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

        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Space types</h3>
          <p className="text-[11px] text-slate-500">Share of booked hours</p>
          {data.spaceTypes.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">No bookings in this period.</p>
          ) : (
            <div className="mt-2 grid grid-cols-[140px_minmax(0,1fr)] items-center gap-2">
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.spaceTypes} dataKey="hours" nameKey="spaceType" innerRadius={38} outerRadius={58} paddingAngle={2}>
                      {data.spaceTypes.map((item, index) => (
                        <Cell key={item.spaceType} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [hoursLabel(Number(value)), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5">
                {data.spaceTypes.map((item, index) => (
                  <li key={item.spaceType} className="text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-700">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TYPE_COLORS[index % TYPE_COLORS.length] }} />
                        <span className="truncate">{item.spaceType}</span>
                      </span>
                      <span className="shrink-0 text-slate-500">{item.share}%</span>
                    </div>
                    <p className="pl-3.5 text-slate-500">
                      {(item.spaces || []).join(', ') || item.spaceType}
                    </p>
                    <p className="pl-3.5 text-slate-400">
                      {item.bookings} bookings · {hoursLabel(item.hours)} · {hoursLabel(item.paidHours)} paid · {hoursLabel(item.freeHours)} free
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </div>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          <h3 className="text-sm font-bold text-slate-900">
            {day ? `Bookings on ${pretty(day)}` : "Booking details"}
          </h3>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search customer, space, or booking"
            className="h-8 min-w-[180px] flex-1 rounded-lg border border-slate-200 px-2 text-xs outline-none focus:border-violet-400"
          />
          <select
            value={category}
            onChange={event => setCategory(event.target.value as "all" | "Paid" | "Free")}
            className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700"
          >
            <option value="all">Paid and free</option>
            <option value="Paid">Paid</option>
            <option value="Free">Free</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-2 py-2">#</th>
                {([
                  ["bookingCode", "Booking"],
                  ["customerName", "Customer"],
                  ["spaceName", "Space"],
                  ["spaceType", "Type"],
                  ["bookingDate", "Date"],
                  ["durationHours", "Hours"],
                  ["grandTotal", "Amount"],
                ] as Array<[SortKey | "bookingCode" | "spaceType", string]>).map(([key, label]) => (
                  <th key={label} className="px-2 py-2">
                    {key === "spaceType" || key === "bookingCode" ? (
                      label
                    ) : (
                      <button type="button" onClick={() => toggle(key as SortKey)} className="font-semibold">
                        {label}
                      </button>
                    )}
                  </th>
                ))}
                <th className="px-2 py-2">Start</th>
                <th className="px-2 py-2">End</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-2 py-2 text-slate-400">{index + 1}</td>
                  <td className="px-2 py-2 font-semibold text-slate-800">{row.bookingCode}</td>
                  <td className="px-2 py-2">{row.customerName || "—"}</td>
                  <td className="px-2 py-2">{row.spaceName || "—"}</td>
                  <td className="px-2 py-2">{row.spaceType || "—"}</td>
                  <td className="px-2 py-2">{pretty(row.bookingDate)}</td>
                  <td className="px-2 py-2">{hoursLabel(row.durationHours)}</td>
                  <td className="px-2 py-2">{inr(row.grandTotal)}</td>
                  <td className="px-2 py-2 text-slate-500">{clock(row.startTime)}</td>
                  <td className="px-2 py-2 text-slate-500">{clock(row.endTime)}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.category === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {row.category}
                    </span>
                  </td>
                  <td className="px-2 py-2">{row.paymentStatus || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? <p className="px-3 py-8 text-center text-xs text-slate-400">No bookings in this view.</p> : null}
      </article>
    </section>
  );
}
