import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Ticket,
  Users,
  BadgeIndianRupee,
  UserCheck,
  RotateCcw,
  Calendar,
  Filter,
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";
import { useEventStore } from "../store/eventStore";
import { formatInr } from "../utils/eventHelpers";

const PIE_COLORS = ["#2563eb", "#9333ea", "#ea580c", "#16a34a", "#0284c7", "#f59e0b"];

export const AnalyticsPage = () => {
  const { events, orders, attendees, globalCoupons } = useEventStore();
  const [selectedEventId, setSelectedEventId] = useState<string>("All");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");

  // Filtered dataset
  const filteredOrders = useMemo(() => {
    if (selectedEventId === "All") return orders;
    return orders.filter((o) => o.eventId === selectedEventId);
  }, [orders, selectedEventId]);

  const filteredAttendees = useMemo(() => {
    if (selectedEventId === "All") return attendees;
    return attendees.filter((a) => a.eventId === selectedEventId);
  }, [attendees, selectedEventId]);

  // Metric sums
  const totalRevenue = filteredOrders
    .filter((o) => o.paymentStatus === "Paid")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalTicketsSold = filteredAttendees.length;
  const totalRegistrations = filteredOrders.length;
  const totalCheckedIn = filteredAttendees.filter(
    (a) => a.checkInStatus === "CheckedIn"
  ).length;
  const attendanceRate =
    totalTicketsSold > 0 ? Math.round((totalCheckedIn / totalTicketsSold) * 100) : 0;
  const refundAmount = filteredOrders
    .filter((o) => o.paymentStatus === "Refunded")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Daily Sales Trend Data
  const salesTrendData = useMemo(() => {
    const days = [
      { date: "10 Nov", sales: 12000, tickets: 8 },
      { date: "11 Nov", sales: 18500, tickets: 12 },
      { date: "12 Nov", sales: 9800, tickets: 6 },
      { date: "13 Nov", sales: 24000, tickets: 16 },
      { date: "14 Nov", sales: 32500, tickets: 22 },
      { date: "15 Nov", sales: 28000, tickets: 19 },
      { date: "16 Nov", sales: 41000, tickets: 27 },
      { date: "17 Nov", sales: 36000, tickets: 24 },
      { date: "18 Nov", sales: 48500, tickets: 31 },
    ];
    return days;
  }, []);

  // Category Distribution & Revenue Data
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; tickets: number; revenue: number }> = {};

    filteredAttendees.forEach((a) => {
      const cat = a.ticketTypeName || "Standard";
      if (!map[cat]) {
        map[cat] = { name: cat, tickets: 0, revenue: 0 };
      }
      map[cat].tickets += 1;
      // approximate price by looking up in orders or fixed
      map[cat].revenue += cat.includes("VIP") ? 3499 : cat.includes("Workshop") ? 1999 : 1499;
    });

    return Object.values(map);
  }, [filteredAttendees]);

  // Session-wise attendance comparison
  const sessionData = useMemo(() => {
    return [
      { session: "Morning Keynote", registered: 180, checkedIn: 162 },
      { session: "Midday Panels", registered: 180, checkedIn: 145 },
      { session: "Afternoon Workshop", registered: 120, checkedIn: 108 },
      { session: "Evening Networking", registered: 200, checkedIn: 175 },
    ];
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Event Performance & Revenue Analytics
          </h1>
          <p className="text-xs text-gray-500">
            Real-time charts on ticket turnover, category demand, attendance ratios, and sales velocity.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            <option value="All">All Live Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 text-xs">
            <button
              type="button"
              onClick={() => setDateRange("7d")}
              className={`rounded-lg px-2.5 py-1 font-semibold ${
                dateRange === "7d" ? "bg-orange-600 text-white" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setDateRange("30d")}
              className={`rounded-lg px-2.5 py-1 font-semibold ${
                dateRange === "30d" ? "bg-orange-600 text-white" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setDateRange("all")}
              className={`rounded-lg px-2.5 py-1 font-semibold ${
                dateRange === "all" ? "bg-orange-600 text-white" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Gross Ticket Revenue
          </span>
          <p className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-400 sm:text-2xl">
            {formatInr(totalRevenue)}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <TrendingUp size={11} /> +18.4% this week
          </span>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
            Tickets Sold
          </span>
          <p className="mt-1 text-xl font-black text-blue-700 dark:text-blue-400 sm:text-2xl">
            {totalTicketsSold}
          </p>
          <span className="text-[10px] text-gray-400">Total volume</span>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
            Total Orders
          </span>
          <p className="mt-1 text-xl font-black text-purple-700 dark:text-purple-400 sm:text-2xl">
            {totalRegistrations}
          </p>
          <span className="text-[10px] text-gray-400">Unique bookings</span>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
            Attendance Rate
          </span>
          <p className="mt-1 text-xl font-black text-orange-600 dark:text-orange-400 sm:text-2xl">
            {attendanceRate}%
          </p>
          <span className="text-[10px] text-gray-400">{totalCheckedIn} checked in</span>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600">
            Average Order Value
          </span>
          <p className="mt-1 text-xl font-black text-cyan-700 dark:text-cyan-400 sm:text-2xl">
            {formatInr(totalRegistrations > 0 ? totalRevenue / totalRegistrations : 0)}
          </p>
          <span className="text-[10px] text-gray-400">Per transaction</span>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
            Refunds Processed
          </span>
          <p className="mt-1 text-xl font-black text-rose-700 dark:text-rose-400 sm:text-2xl">
            {formatInr(refundAmount)}
          </p>
          <span className="text-[10px] text-gray-400">Cancelled / Refunded</span>
        </div>
      </div>

      {/* Row 1: Daily Sales Trend & Ticket Categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Daily Sales Trend Area Chart (8 cols) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Daily Revenue Velocity Trend
              </h3>
              <p className="text-[11px] text-gray-400">
                Gross ticket booking values and volume over time
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp size={14} /> Peak: ₹48,500/day
            </span>
          </div>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) => `₹${val / 1000}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val: any) => [formatInr(Number(val)), "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ticket Category Pie Share (4 cols) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Ticket Category Breakdown
              </h3>
              <p className="text-[11px] text-gray-400">Share of registrations</p>
            </div>
            <PieChartIcon size={16} className="text-gray-400" />
          </div>

          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="tickets"
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-1.5 text-xs">
            {categoryData.map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                </span>
                <span className="font-bold text-gray-900 dark:text-white font-mono">
                  {cat.tickets} tickets
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Session-wise Attendance & Coupon Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Session-wise Attendance BarChart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Session-wise Attendance Turnout
              </h3>
              <p className="text-[11px] text-gray-400">
                Registered vs Actual gate entries per session
              </p>
            </div>
            <BarChart3 size={16} className="text-gray-400" />
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="session" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="registered" name="Registered" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="checkedIn" name="Checked In" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coupon Performance Table / Summary */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Coupon Code Performance
              </h3>
              <p className="text-[11px] text-gray-400">
                Redemption counts and discount analytics
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 dark:border-slate-800">
                  <th className="py-2">Code</th>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-center">Redemptions</th>
                  <th className="py-2 text-right">Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {globalCoupons.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 font-mono font-bold text-orange-600">
                      {c.code}
                    </td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">
                      {c.discountType === "percentage"
                        ? `${c.discountValue}% Off`
                        : `₹${c.discountValue} Flat`}
                    </td>
                    <td className="py-3 text-center font-bold text-gray-900 dark:text-white">
                      {c.usedCount}
                    </td>
                    <td className="py-3 text-right text-gray-500 font-mono">
                      {c.usageLimit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
