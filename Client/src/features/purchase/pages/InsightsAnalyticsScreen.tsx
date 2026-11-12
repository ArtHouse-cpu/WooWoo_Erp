import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeIndianRupee,
  BarChart3,
  Building2,
  Calendar,
  Download,
  Lightbulb,
  Package,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
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

type Preset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "quarter"
  | "year"
  | "custom";

type Grouping = "daily" | "weekly" | "monthly";
type CustomerSort = "billed" | "invoices" | "due";
type VendorSort = "purchase" | "txns" | "due";
type ProductMode = "qty" | "revenue";

const PRESETS: { id: Preset; label: string; factor: number }[] = [
  { id: "today", label: "Today", factor: 0.045 },
  { id: "yesterday", label: "Yesterday", factor: 0.038 },
  { id: "last7", label: "Last 7 Days", factor: 0.24 },
  { id: "last30", label: "Last 30 Days", factor: 1 },
  { id: "thisMonth", label: "This Month", factor: 0.86 },
  { id: "lastMonth", label: "Last Month", factor: 0.94 },
  { id: "quarter", label: "This Quarter", factor: 2.55 },
  { id: "year", label: "This Year", factor: 9.4 },
  { id: "custom", label: "Custom Date Range", factor: 1 },
];

const BRANCHES = ["All branches", "Main Studio", "Warehouse"];

const inr = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;

const pct = (current: number, previous: number) => {
  if (!(previous > 0)) return 0;
  return ((current - previous) / previous) * 100;
};

const scale = (value: number, factor: number) => Math.round(value * factor);

type CustomerRow = {
  name: string;
  code: string;
  billed: number;
  invoices: number;
  paid: number;
  due: number;
};

type VendorRow = {
  name: string;
  code: string;
  purchase: number;
  txns: number;
  paid: number;
  due: number;
};

type ProductRow = {
  name: string;
  sku: string;
  category: string;
  type: string;
  qty: number;
  revenue: number;
  invoices: number;
  stock: number;
};

type ExpenseRow = {
  title: string;
  category: string;
  amount: number;
  date: string;
  method: string;
};

const BASE_CUSTOMERS: CustomerRow[] = [
  { name: "Aarav Mehta", code: "CUS-0142", billed: 128400, invoices: 14, paid: 110200, due: 18200 },
  { name: "Studio North", code: "CUS-0088", billed: 96400, invoices: 9, paid: 96400, due: 0 },
  { name: "Kavya Iyer", code: "CUS-0210", billed: 81250, invoices: 11, paid: 64000, due: 17250 },
  { name: "Bright Classroom", code: "CUS-0061", billed: 73800, invoices: 7, paid: 50000, due: 23800 },
  { name: "Rohan Das", code: "CUS-0304", billed: 54200, invoices: 8, paid: 54200, due: 0 },
  { name: "Paper Lane", code: "CUS-0119", billed: 48600, invoices: 6, paid: 32000, due: 16600 },
  { name: "Meera Shah", code: "CUS-0177", billed: 39400, invoices: 5, paid: 39400, due: 0 },
  { name: "City Workshop", code: "CUS-0044", billed: 33100, invoices: 4, paid: 20000, due: 13100 },
  { name: "Anika Rao", code: "CUS-0266", billed: 27800, invoices: 6, paid: 27800, due: 0 },
  { name: "Oak & Ink", code: "CUS-0093", billed: 19050, invoices: 3, paid: 12000, due: 7050 },
];

const BASE_VENDORS: VendorRow[] = [
  { name: "Creative Art Supply", code: "VEN-0041", purchase: 142600, txns: 11, paid: 98000, due: 44600 },
  { name: "Metro Papers", code: "VEN-0018", purchase: 98600, txns: 8, paid: 98600, due: 0 },
  { name: "Colour House", code: "VEN-0072", purchase: 76400, txns: 6, paid: 40000, due: 36400 },
  { name: "Frame Works", code: "VEN-0033", purchase: 52100, txns: 5, paid: 52100, due: 0 },
  { name: "Ink & Fibre", code: "VEN-0090", purchase: 41800, txns: 4, paid: 25000, due: 16800 },
  { name: "Studio Tools", code: "VEN-0055", purchase: 28600, txns: 3, paid: 28600, due: 0 },
  { name: "PackRight", code: "VEN-0112", purchase: 19400, txns: 2, paid: 10000, due: 9400 },
  { name: "Light Grid", code: "VEN-0027", purchase: 15200, txns: 2, paid: 15200, due: 0 },
  { name: "Canvas Co.", code: "VEN-0084", purchase: 10800, txns: 1, paid: 0, due: 10800 },
];

const BASE_PRODUCTS: ProductRow[] = [
  { name: "Velvet black", sku: "PRD-110", category: "Supplies", type: "Paint", qty: 186, revenue: 20460, invoices: 42, stock: 24 },
  { name: "Sketch pad A3", sku: "PRD-088", category: "Paper", type: "Paper", qty: 154, revenue: 23100, invoices: 31, stock: 60 },
  { name: "Acrylic set", sku: "PRD-214", category: "Supplies", type: "Paint", qty: 97, revenue: 48500, invoices: 28, stock: 12 },
  { name: "Brush pack", sku: "PRD-056", category: "Tools", type: "Tool", qty: 88, revenue: 17600, invoices: 22, stock: 40 },
  { name: "Canvas 16x20", sku: "PRD-301", category: "Canvas", type: "Surface", qty: 64, revenue: 32000, invoices: 19, stock: 8 },
  { name: "Ink bottle", sku: "PRD-077", category: "Supplies", type: "Ink", qty: 59, revenue: 8850, invoices: 17, stock: 33 },
  { name: "Palette knife", sku: "PRD-142", category: "Tools", type: "Tool", qty: 41, revenue: 6150, invoices: 14, stock: 15 },
  { name: "Gold leaf", sku: "PRD-190", category: "Supplies", type: "Finish", qty: 28, revenue: 16800, invoices: 9, stock: 6 },
];

const BASE_EXPENSES: ExpenseRow[] = [
  { title: "Studio rent", category: "Rent", amount: 28000, date: "02 Nov 2026", method: "Bank" },
  { title: "Electricity bill", category: "Electricity", amount: 6400, date: "06 Nov 2026", method: "UPI" },
  { title: "Staff salary", category: "Salary", amount: 32000, date: "01 Nov 2026", method: "Bank" },
  { title: "Delivery van", category: "Transportation", amount: 4800, date: "09 Nov 2026", method: "Cash" },
  { title: "Instagram ads", category: "Marketing", amount: 3500, date: "11 Nov 2026", method: "Card" },
  { title: "AC service", category: "Maintenance", amount: 2200, date: "08 Nov 2026", method: "UPI" },
  { title: "Printer paper", category: "Office Supplies", amount: 1600, date: "04 Nov 2026", method: "Cash" },
];

const TREND_WEIGHTS = [0.62, 0.7, 0.66, 0.84, 0.9, 1, 0.78, 0.88, 0.95, 0.72, 0.81, 0.93];
const AXIS = { fontSize: 11, fill: "#94a3b8" };
const GRID = "#eef2f6";

const InsightsAnalyticsScreen = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<Preset>("last30");
  const [fromDate, setFromDate] = useState("2026-10-12");
  const [toDate, setToDate] = useState("2026-11-11");
  const [compare, setCompare] = useState(true);
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [grouping, setGrouping] = useState<Grouping>("weekly");
  const [customerSort, setCustomerSort] = useState<CustomerSort>("billed");
  const [vendorSort, setVendorSort] = useState<VendorSort>("purchase");
  const [productMode, setProductMode] = useState<ProductMode>("qty");
  const [productCategory, setProductCategory] = useState("All");
  const [productType, setProductType] = useState("All");
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  const factor = useMemo(() => {
    if (preset !== "custom") return PRESETS.find((item) => item.id === preset)?.factor ?? 1;
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T00:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0;
    const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    return Math.min(12, Math.max(0.02, days / 30));
  }, [preset, fromDate, toDate]);

  const branchFactor = branch === "Main Studio" ? 0.62 : branch === "Warehouse" ? 0.38 : 1;
  const amountFactor = factor * branchFactor;
  const empty = factor === 0;

  const data = useMemo(() => {
    const customers = BASE_CUSTOMERS.map((row) => ({
      ...row,
      billed: scale(row.billed, amountFactor),
      invoices: Math.max(1, scale(row.invoices, Math.max(amountFactor, 0.2))),
      paid: scale(row.paid, amountFactor),
      due: scale(row.due, amountFactor),
    }));
    const vendors = BASE_VENDORS.map((row) => ({
      ...row,
      purchase: scale(row.purchase, amountFactor),
      txns: Math.max(1, scale(row.txns, Math.max(amountFactor, 0.25))),
      paid: scale(row.paid, amountFactor),
      due: scale(row.due, amountFactor),
    }));
    const products = BASE_PRODUCTS.map((row) => ({
      ...row,
      qty: Math.max(1, scale(row.qty, amountFactor)),
      revenue: scale(row.revenue, amountFactor),
      invoices: Math.max(1, scale(row.invoices, Math.max(amountFactor, 0.3))),
    }));
    const expenses = BASE_EXPENSES.map((row) => ({
      ...row,
      amount: scale(row.amount, amountFactor),
    }));
    const sales = customers.reduce((sum, row) => sum + row.billed, 0);
    const purchase = vendors.reduce((sum, row) => sum + row.purchase, 0);
    const cashIn = scale(540000, amountFactor);
    const cashOut = scale(398000, amountFactor);
    const expenseTotal = expenses.reduce((sum, row) => sum + row.amount, 0);
    const previous = 0.91;
    return {
      customers,
      vendors,
      products,
      expenses,
      sales,
      salesCount: customers.reduce((sum, row) => sum + row.invoices, 0),
      purchase,
      purchaseCount: vendors.reduce((sum, row) => sum + row.txns, 0),
      cashIn,
      cashInCount: Math.max(1, scale(71, Math.max(amountFactor, 0.2))),
      cashOut,
      cashOutCount: Math.max(1, scale(54, Math.max(amountFactor, 0.2))),
      expenseTotal,
      expenseCount: expenses.length,
      previous,
    };
  }, [amountFactor]);

  const trend = (value: number, drift: number) => pct(value, value * data.previous * drift);

  const points = useMemo(() => {
    const labels =
      grouping === "daily"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]
        : grouping === "monthly"
          ? ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]
          : ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"];
    return labels.map((label, index) => {
      const weight = TREND_WEIGHTS[index] ?? 1;
      const purchase = scale(data.purchase / labels.length, weight);
      const txns = Math.max(0, Math.round((data.purchaseCount / labels.length) * weight));
      const cashIn = scale(data.cashIn / labels.length, weight);
      const cashOut = scale(data.cashOut / labels.length, TREND_WEIGHTS[(index + 3) % 12] ?? 1);
      const expense = scale(data.expenseTotal / labels.length, TREND_WEIGHTS[(index + 5) % 12] ?? 1);
      return {
        label,
        purchase,
        previousPurchase: Math.round(purchase * data.previous),
        txns,
        cashIn,
        cashOut,
        net: cashIn - cashOut,
        expense,
      };
    });
  }, [grouping, data]);

  const expenseSlices = useMemo(() => {
    const totals = new Map<string, number>();
    data.expenses.forEach((row) => {
      totals.set(row.category, (totals.get(row.category) || 0) + row.amount);
    });
    const colors = ["#2563eb", "#7c3aed", "#ea580c", "#dc2626", "#059669", "#0891b2", "#ca8a04", "#64748b"];
    return [...totals.entries()].map(([name, value], index) => ({
      name,
      value,
      fill: colors[index % colors.length],
    }));
  }, [data.expenses]);

  const paymentSlices = useMemo(() => {
    const paid = data.vendors.reduce((sum, row) => sum + row.paid, 0);
    const due = data.vendors.reduce((sum, row) => sum + row.due, 0);
    const partial = Math.round(due * 0.42);
    const unpaid = Math.max(0, due - partial);
    return [
      { name: "Paid", value: paid, fill: "#059669" },
      { name: "Partial", value: partial, fill: "#ea580c" },
      { name: "Unpaid", value: unpaid, fill: "#dc2626" },
    ];
  }, [data.vendors]);

  const purchaseCategories = useMemo(() => {
    const shares = [
      ["Paper", 0.32, "#2563eb"],
      ["Paint", 0.28, "#7c3aed"],
      ["Canvas", 0.18, "#0891b2"],
      ["Tools", 0.12, "#ea580c"],
      ["Packaging", 0.1, "#64748b"],
    ] as const;
    return shares.map(([name, share, fill]) => ({
      name,
      value: Math.round(data.purchase * share),
      fill,
    }));
  }, [data.purchase]);

  const sortedCustomers = useMemo(() => {
    const rows = [...data.customers];
    rows.sort((a, b) =>
      customerSort === "invoices" ? b.invoices - a.invoices : customerSort === "due" ? b.due - a.due : b.billed - a.billed,
    );
    return rows;
  }, [data.customers, customerSort]);

  const sortedVendors = useMemo(() => {
    const rows = [...data.vendors];
    rows.sort((a, b) =>
      vendorSort === "txns" ? b.txns - a.txns : vendorSort === "due" ? b.due - a.due : b.purchase - a.purchase,
    );
    return rows;
  }, [data.vendors, vendorSort]);

  const productCategories = ["All", ...new Set(BASE_PRODUCTS.map((row) => row.category))];
  const productTypes = ["All", ...new Set(BASE_PRODUCTS.map((row) => row.type))];
  const filteredProducts = useMemo(() => {
    const rows = data.products.filter(
      (row) =>
        (productCategory === "All" || row.category === productCategory) &&
        (productType === "All" || row.type === productType),
    );
    rows.sort((a, b) => (productMode === "qty" ? b.qty - a.qty : b.revenue - a.revenue));
    return rows;
  }, [data.products, productCategory, productType, productMode]);

  const insights = useMemo(() => {
    if (empty || !(data.sales > 0)) return [];
    const topCustomer = sortedCustomers[0];
    const topVendor = sortedVendors[0];
    const topProduct = [...data.products].sort((a, b) => b.qty - a.qty)[0];
    const topCategory = [...expenseSlices].sort((a, b) => b.value - a.value)[0];
    const lines = [
      `${topCustomer.name} contributed ${Math.round((topCustomer.billed / data.sales) * 100)}% of total billing.`,
      `${topVendor.name} accounts for ${Math.round((topVendor.purchase / data.purchase) * 100)}% of total purchases.`,
      `${topProduct.name} is the highest-selling product in this period, with ${topProduct.qty.toLocaleString("en-IN")} units sold.`,
      data.cashOut > data.cashIn
        ? "Cash out exceeded cash in during the selected period."
        : `Net cash flow is positive at ${inr(data.cashIn - data.cashOut)}.`,
      `${topCategory?.name || "Expenses"} is the largest expense category at ${inr(topCategory?.value || 0)}.`,
      `Outstanding vendor payables are ${inr(data.vendors.reduce((sum, row) => sum + row.due, 0))}.`,
    ];
    return lines;
  }, [empty, data, sortedCustomers, sortedVendors, expenseSlices]);

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setUpdatedAt(new Date());
      setRefreshing(false);
    }, 400);
  };

  const exportReport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Purchase", String(data.purchase)],
      ["Total Sales", String(data.sales)],
      ["Cash In", String(data.cashIn)],
      ["Cash Out", String(data.cashOut)],
      ["Expenses", String(data.expenseTotal)],
      ["Net Cash Flow", String(data.cashIn - data.cashOut)],
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "purchase-insights-sample.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const highestCashIn = [...points].sort((a, b) => b.cashIn - a.cashIn)[0];
  const highestCashOut = [...points].sort((a, b) => b.cashOut - a.cashOut)[0];
  const net = data.cashIn - data.cashOut;

  const periodLabel = PRESETS.find((item) => item.id === preset)?.label ?? "Custom";

  return (
    <div className={`space-y-4 pb-8 transition-opacity ${refreshing ? "opacity-70" : ""}`}>
      <header className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-5 text-white sm:px-6">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-indigo-500/30 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-16 w-40 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-100">
                <Sparkles size={12} />
                Sample data
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[28px]">
                Purchase Insights & Analytics
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-300">
                Track purchasing performance, sales trends, cash flow, and business expenses.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-slate-200">
                {periodLabel} · Updated {updatedAt.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
              </p>
              <button type="button" onClick={refresh} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <button type="button" onClick={exportReport} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900">
                <Download size={14} />
                Export report
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 bg-slate-50/80 px-3 py-3 sm:px-4">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreset(item.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  preset === item.id ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
            >
              {BRANCHES.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600">
              <input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} className="accent-indigo-600" />
              Compare previous period
            </label>
            {preset === "custom" ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <Calendar size={14} />
                <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="rounded-full border border-slate-200 bg-white px-2 py-1" />
                <span>to</span>
                <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="rounded-full border border-slate-200 bg-white px-2 py-1" />
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">
          Choose a valid date range to see sample analytics.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Kpi title="Total Purchase" value={inr(data.purchase)} hint={`${data.purchaseCount} purchases`} change={trend(data.purchase, 1)} compare={compare} icon={<ShoppingCart size={16} />} tone="blue" spark={points.map((point) => point.purchase)} />
            <Kpi title="Total Sales" value={inr(data.sales)} hint={`${data.salesCount} invoices`} change={trend(data.sales, 0.97)} compare={compare} icon={<TrendingUp size={16} />} tone="indigo" spark={points.map((point) => Math.round(point.purchase * (data.sales / Math.max(data.purchase, 1))))} />
            <Kpi title="Net Cash Flow" value={inr(net)} hint={net >= 0 ? "More came in than went out" : "More went out than came in"} change={trend(net, 0.94)} compare={compare} icon={<ArrowUpRight size={16} />} tone={net >= 0 ? "green" : "red"} spark={points.map((point) => point.net)} featured />
            <Kpi title="Cash In" value={inr(data.cashIn)} hint={`${data.cashInCount} receipts`} change={trend(data.cashIn, 1.02)} compare={compare} icon={<Wallet size={16} />} tone="green" spark={points.map((point) => point.cashIn)} />
            <Kpi title="Cash Out" value={inr(data.cashOut)} hint={`${data.cashOutCount} payments`} change={trend(data.cashOut, 1.05)} compare={compare} icon={<BadgeIndianRupee size={16} />} tone="red" spark={points.map((point) => point.cashOut)} />
            <Kpi title="Total Expenses" value={inr(data.expenseTotal)} hint={`${data.expenseCount} expenses`} change={trend(data.expenseTotal, 1.08)} compare={compare} icon={<BarChart3 size={16} />} tone="amber" spark={points.map((point) => point.expense)} />
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <RankingSection
              title="Top Customers by Billing"
              kicker="Billing"
              chart={sortedCustomers.slice(0, 8).map((row) => ({ name: row.name.split(" ")[0], value: row.billed }))}
              color="#7c3aed"
              sort={
                <SortSelect
                  value={customerSort}
                  onChange={(value) => setCustomerSort(value as CustomerSort)}
                  options={[
                    ["billed", "Highest billed"],
                    ["invoices", "Invoice count"],
                    ["due", "Outstanding"],
                  ]}
                />
              }
            >
              <RankTable
                headers={["Customer", "Billed", "Share"]}
                rows={sortedCustomers.map((row, index) => ({
                  key: row.code,
                  rank: index + 1,
                  onClick: () => navigate("/customers"),
                  cells: [
                    <Identity key={row.code} name={row.name} code={`${row.code} · ${row.invoices} invoices`} tone="bg-violet-100 text-violet-700" />,
                    <span key="amt" className="block"><span className="block font-semibold tabular-nums text-slate-900">{inr(row.billed)}</span><span className="block text-[10px] text-slate-400">Paid {inr(row.paid)} · Due {inr(row.due)}</span></span>,
                    <ShareMeter key="share" value={data.sales ? Math.round((row.billed / data.sales) * 100) : 0} color="#7c3aed" />,
                  ],
                }))}
              />
            </RankingSection>
            <RankingSection
              title="Top Vendors by Purchase Value"
              kicker="Purchasing"
              chart={sortedVendors.slice(0, 8).map((row) => ({ name: row.name.split(" ")[0], value: row.purchase }))}
              color="#2563eb"
              sort={
                <SortSelect
                  value={vendorSort}
                  onChange={(value) => setVendorSort(value as VendorSort)}
                  options={[
                    ["purchase", "Highest purchase"],
                    ["txns", "Most transactions"],
                    ["due", "Highest payable"],
                  ]}
                />
              }
            >
              <RankTable
                headers={["Vendor", "Purchase", "Payable"]}
                rows={sortedVendors.map((row, index) => ({
                  key: row.code,
                  rank: index + 1,
                  onClick: () => navigate("/vendors"),
                  cells: [
                    <Identity key={row.code} name={row.name} code={`${row.code} · ${row.txns} bills`} tone="bg-blue-100 text-blue-700" />,
                    <span key="amt" className="font-semibold tabular-nums text-slate-900">{inr(row.purchase)}</span>,
                    <span key="due" className={row.due > 0 ? "font-semibold text-orange-600" : "text-emerald-600"}>{row.due > 0 ? inr(row.due) : "Clear"}</span>,
                  ],
                }))}
              />
            </RankingSection>
          </section>

          <Panel
            kicker="Catalogue"
            title="Top Selling Products"
            extra={
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setProductMode("qty")} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${productMode === "qty" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"}`}>Most sold</button>
                <button type="button" onClick={() => setProductMode("revenue")} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${productMode === "revenue" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"}`}>Highest revenue</button>
                <select value={productCategory} onChange={(event) => setProductCategory(event.target.value)} className="rounded-full border border-slate-200 px-3 py-1 text-[11px]">
                  {productCategories.map((name) => <option key={name}>{name}</option>)}
                </select>
                <select value={productType} onChange={(event) => setProductType(event.target.value)} className="rounded-full border border-slate-200 px-3 py-1 text-[11px]">
                  {productTypes.map((name) => <option key={name}>{name}</option>)}
                </select>
              </div>
            }
          >
            <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-white p-2">
              <ChartBox height={260}>
                <BarChart data={filteredProducts.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={108} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip content={(props) => <ChartTip {...props} money={productMode === "revenue"} suffix={productMode === "qty" ? " sold" : ""} />} />
                  <Bar dataKey={productMode === "qty" ? "qty" : "revenue"} radius={[0, 8, 8, 0]} barSize={14}>
                    {filteredProducts.slice(0, 8).map((row, index) => (
                      <Cell key={row.sku} fill={index === 0 ? "#4f46e5" : "#93c5fd"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartBox>
            </div>
            <RankTable
              headers={["Product", "Sold", "Revenue", "Avg", "Stock"]}
              rows={filteredProducts.map((row, index) => ({
                key: row.sku,
                rank: index + 1,
                onClick: () => navigate("/products"),
                cells: [
                  <Identity key={row.sku} name={row.name} code={`${row.sku} · ${row.category}`} tone="bg-indigo-100 text-indigo-700" icon={<Package size={13} />} />,
                  row.qty.toLocaleString("en-IN"),
                  inr(row.revenue),
                  inr(row.qty ? row.revenue / row.qty : 0),
                  <span key="stock" className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.stock < 15 ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600"}`}>{row.stock} in stock</span>,
                ],
              }))}
            />
          </Panel>

          <section className="grid gap-3 xl:grid-cols-5">
            <Panel className="xl:col-span-3" kicker="Purchasing" title="Purchase Amount Trend" extra={<GroupingSwitch value={grouping} onChange={setGrouping} />}>
              <ChartBox height={280}>
                <ComposedChart data={points}>
                  <defs>
                    <linearGradient id="purchaseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip content={(props) => <ChartTip {...props} />} />
                  <Area type="monotone" dataKey="purchase" name="This period" stroke="#4f46e5" strokeWidth={2.5} fill="url(#purchaseFill)" />
                  {compare ? <Line type="monotone" dataKey="previousPurchase" name="Previous" stroke="#94a3b8" strokeDasharray="5 5" dot={false} strokeWidth={1.5} /> : null}
                </ComposedChart>
              </ChartBox>
            </Panel>
            <Panel className="xl:col-span-2" kicker="Volume" title="Purchase Transactions">
              <ChartBox height={280}>
                <BarChart data={points}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={(props) => <ChartTip {...props} money={false} />} />
                  <Bar dataKey="txns" name="Purchases" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartBox>
            </Panel>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <Panel kicker="Mix" title="Purchase by Category">
              <Donut data={purchaseCategories} center={inr(data.purchase)} caption="Purchases" />
            </Panel>
            <Panel kicker="Payables" title="Payment Status">
              <Donut data={paymentSlices} center={inr(data.vendors.reduce((sum, row) => sum + row.due, 0))} caption="Still due" />
            </Panel>
          </section>

          <Panel kicker="Treasury" title="Cash Flow Analysis" extra={<GroupingSwitch value={grouping} onChange={setGrouping} />}>
            <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
              <Mini label="Cash in" value={inr(data.cashIn)} tone="green" />
              <Mini label="Cash out" value={inr(data.cashOut)} tone="red" />
              <Mini label="Net" value={inr(net)} tone={net >= 0 ? "green" : "red"} />
              <Mini label="Peak cash in" value={highestCashIn ? `${highestCashIn.label} · ${inr(highestCashIn.cashIn)}` : "—"} />
              <Mini label="Peak cash out" value={highestCashOut ? `${highestCashOut.label} · ${inr(highestCashOut.cashOut)}` : "—"} />
            </div>
            <ChartBox height={300}>
              <ComposedChart data={points}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip content={(props) => <ChartTip {...props} />} />
                <Bar dataKey="cashIn" name="Cash in" fill="#10b981" radius={[7, 7, 0, 0]} />
                <Bar dataKey="cashOut" name="Cash out" fill="#f43f5e" radius={[7, 7, 0, 0]} />
                <Line type="monotone" dataKey="net" name="Net cash flow" stroke="#0f172a" strokeWidth={2.4} dot={false} />
              </ComposedChart>
            </ChartBox>
          </Panel>

          <section className="grid gap-3 xl:grid-cols-5">
            <Panel className="xl:col-span-2" kicker="Spend" title="Expense Analysis">
              <div className="mb-3 grid grid-cols-3 gap-2">
                <Mini label="Total" value={inr(data.expenseTotal)} />
                <Mini label="Records" value={String(data.expenseCount)} />
                <Mini label="Average" value={inr(data.expenseCount ? data.expenseTotal / data.expenseCount : 0)} />
              </div>
              <Donut data={expenseSlices} center={inr(data.expenseTotal)} caption="Expenses" />
            </Panel>
            <Panel className="xl:col-span-3" kicker="Spend" title="Expense Trend">
              <ChartBox height={280}>
                <ComposedChart data={points}>
                  <defs>
                    <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e11d48" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip content={(props) => <ChartTip {...props} />} />
                  <Area type="monotone" dataKey="expense" name="Expenses" stroke="#e11d48" strokeWidth={2.5} fill="url(#expenseFill)" />
                </ComposedChart>
              </ChartBox>
              <RankTable
                headers={["Expense", "Category", "Amount", "When"]}
                rows={[...data.expenses]
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 4)
                  .map((row) => ({
                    key: row.title,
                    onClick: () => navigate("/expenses"),
                    cells: [
                      <Identity key={row.title} name={row.title} code={row.method} tone="bg-rose-100 text-rose-700" />,
                      row.category,
                      inr(row.amount),
                      row.date,
                    ],
                  }))}
              />
            </Panel>
          </section>

          <Panel kicker="Highlights" title="Business Insights">
            <div className="grid gap-2.5 md:grid-cols-2">
              {insights.map((line, index) => (
                <article key={line} className="flex gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {index === 0 ? <Users size={16} /> : index === 1 ? <Building2 size={16} /> : index === 2 ? <Package size={16} /> : <Lightbulb size={16} />}
                  </span>
                  <p className="text-sm leading-5 text-slate-700">{line}</p>
                </article>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
};

const TONES = {
  blue: { icon: "bg-blue-50 text-blue-700", line: "#2563eb", wash: "from-blue-50/80" },
  indigo: { icon: "bg-indigo-50 text-indigo-700", line: "#4f46e5", wash: "from-indigo-50/80" },
  green: { icon: "bg-emerald-50 text-emerald-700", line: "#059669", wash: "from-emerald-50/80" },
  red: { icon: "bg-rose-50 text-rose-700", line: "#e11d48", wash: "from-rose-50/70" },
  amber: { icon: "bg-amber-50 text-amber-700", line: "#d97706", wash: "from-amber-50/80" },
};

const Kpi = ({
  title,
  value,
  hint,
  change,
  compare,
  icon,
  tone,
  spark,
  featured,
}: {
  title: string;
  value: string;
  hint: string;
  change: number;
  compare: boolean;
  icon: ReactNode;
  tone: keyof typeof TONES;
  spark: number[];
  featured?: boolean;
}) => {
  const up = change >= 0;
  const palette = TONES[tone];
  return (
    <article className={`relative overflow-hidden rounded-[14px] border p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${featured ? "border-transparent bg-gradient-to-br from-slate-900 to-indigo-900 text-white" : "border-slate-200/80 bg-gradient-to-br to-white " + palette.wash}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${featured ? "text-indigo-200" : "text-slate-500"}`}>{title}</p>
          <p className={`mt-2 text-[22px] font-semibold tracking-tight tabular-nums sm:text-2xl ${featured ? "text-white" : "text-slate-950"}`}>{value}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${featured ? "bg-white/10 text-white" : palette.icon}`}>{icon}</span>
      </div>
      <div className="mt-3 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={spark.map((point, index) => ({ index, point }))}>
            <Area type="monotone" dataKey="point" stroke={featured ? "#a5b4fc" : palette.line} fill={featured ? "rgba(165,180,252,0.18)" : palette.line} fillOpacity={featured ? 1 : 0.12} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className={`text-[11px] ${featured ? "text-slate-300" : "text-slate-500"}`}>{hint}</p>
        {compare ? (
          <p className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${featured ? "bg-white/10 text-white" : up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change).toFixed(1)}%
          </p>
        ) : null}
      </div>
    </article>
  );
};

const Panel = ({
  title,
  kicker,
  extra,
  children,
  className = "",
}: {
  title: string;
  kicker?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5 ${className}`}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        {kicker ? <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{kicker}</p> : null}
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">{title}</h2>
      </div>
      {extra}
    </div>
    {children}
  </section>
);

const ChartBox = ({ children, height = 240 }: { children: ReactElement; height?: number }) => (
  <div className="w-full" style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </div>
);

const GroupingSwitch = ({ value, onChange }: { value: Grouping; onChange: (value: Grouping) => void }) => (
  <div className="flex rounded-full bg-slate-100 p-0.5">
    {(["daily", "weekly", "monthly"] as Grouping[]).map((item) => (
      <button
        key={item}
        type="button"
        onClick={() => onChange(item)}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${value === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
      >
        {item}
      </button>
    ))}
  </div>
);

const SortSelect = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) => (
  <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
    {options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
  </select>
);

const ChartTip = ({
  active,
  payload,
  label,
  money = true,
  suffix = "",
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
  money?: boolean;
  suffix?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      {label ? <p className="mb-1 text-[11px] font-semibold text-slate-400">{label}</p> : null}
      {payload.map((item) => (
        <p key={String(item.name)} className="text-xs font-semibold text-slate-800">
          <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: item.color || "#4f46e5" }} />
          {item.name}: {money ? inr(Number(item.value)) : `${item.value}${suffix}`}
        </p>
      ))}
    </div>
  );
};

const RankingSection = ({
  title,
  kicker,
  chart,
  color,
  sort,
  children,
}: {
  title: string;
  kicker?: string;
  chart: { name: string; value: number }[];
  color: string;
  sort: ReactNode;
  children: ReactNode;
}) => (
  <section className="rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        {kicker ? <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{kicker}</p> : null}
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">{title}</h2>
      </div>
      {sort}
    </div>
    <ChartBox height={210}>
      <BarChart data={chart} layout="vertical" margin={{ left: 4, right: 12 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={72} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={(props) => <ChartTip {...props} />} />
        <Bar dataKey="value" name="Amount" radius={[0, 8, 8, 0]} barSize={12}>
          {chart.map((row, index) => (
            <Cell key={row.name} fill={color} fillOpacity={1 - index * 0.08} />
          ))}
        </Bar>
      </BarChart>
    </ChartBox>
    {children}
  </section>
);

const RankTable = ({
  headers,
  rows,
}: {
  headers: string[];
  rows: { key: string; cells: ReactNode[]; rank?: number; onClick?: () => void }[];
}) => (
  <div className="mt-3 overflow-x-auto">
    <table className="w-full min-w-[460px] text-left text-xs">
      <thead>
        <tr className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
          <th className="px-2 py-2 font-semibold">#</th>
          {headers.map((header) => <th key={header} className="px-2 py-2 font-semibold">{header}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={row.key}
            onClick={row.onClick}
            className={`border-t border-slate-100 ${row.onClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
          >
            <td className="px-2 py-2.5">
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-slate-200 text-slate-700" : index === 2 ? "bg-orange-100 text-orange-700" : "text-slate-400"}`}>
                {row.rank ?? index + 1}
              </span>
            </td>
            {row.cells.map((cell, cellIndex) => (
              <td key={`${row.key}-${cellIndex}`} className="px-2 py-2.5 text-slate-700">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Identity = ({ name, code, tone, icon }: { name: string; code: string; tone: string; icon?: ReactNode }) => (
  <div className="flex items-center gap-2.5">
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tone}`}>
      {icon ?? name.slice(0, 1)}
    </span>
    <span className="min-w-0">
      <span className="block truncate font-semibold text-slate-900">{name}</span>
      <span className="block truncate text-[10px] text-slate-400">{code}</span>
    </span>
  </div>
);

const ShareMeter = ({ value, color }: { value: number; color: string }) => (
  <div className="flex min-w-[92px] items-center gap-2">
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
    <span className="w-8 text-right text-[11px] font-semibold tabular-nums text-slate-600">{value}%</span>
  </div>
);

const Donut = ({
  data,
  center,
  caption,
}: {
  data: { name: string; value: number; fill: string }[];
  center: string;
  caption: string;
}) => {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  return (
    <div>
      <div className="relative">
        <ChartBox height={210}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={84} paddingAngle={3} stroke="none">
              {data.map((slice) => <Cell key={slice.name} fill={slice.fill} />)}
            </Pie>
            <Tooltip content={(props) => <ChartTip {...props} />} />
          </PieChart>
        </ChartBox>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold tabular-nums text-slate-950">{center}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{caption}</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((slice) => (
          <div key={slice.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: slice.fill }} />
            <span className="flex-1 text-slate-600">{slice.name}</span>
            <span className="font-semibold tabular-nums text-slate-800">{inr(slice.value)}</span>
            <span className="w-8 text-right text-slate-400">{total ? Math.round((slice.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Mini = ({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) => (
  <div className={`rounded-2xl px-3 py-2.5 ${tone === "green" ? "bg-emerald-50" : tone === "red" ? "bg-rose-50" : "bg-slate-50"}`}>
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
    <p className={`mt-1 text-sm font-semibold tabular-nums ${tone === "green" ? "text-emerald-800" : tone === "red" ? "text-rose-800" : "text-slate-900"}`}>{value}</p>
  </div>
);

export default InsightsAnalyticsScreen;
