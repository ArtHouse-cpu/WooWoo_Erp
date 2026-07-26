import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  ChevronRight,
  Crown,
  FilePlus2,
  Package,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
  Utensils
} from "lucide-react";
import { axiosInstance } from "@/services/axiosInstance";
import { usePermission } from "@/hooks/usePermission";
import RevenueCard from "@/features/home/components/RevenueCard";

type FilterKey = "all" | "customers" | "products" | "services";

type RecentBill = {
  id: string;
  customer: string;
  invoiceCode: string;
  billedBy: string;
  amount: number;
  status: "Paid" | "Unpaid" | "Pending" | "Cancelled" | "Draft";
  createdAt: Date | null;
};

const AVATAR_TONES = [
  { bg: "bg-blue-50", text: "text-blue-600" },
  { bg: "bg-orange-50", text: "text-orange-600" },
  { bg: "bg-emerald-50", text: "text-emerald-600" },
  { bg: "bg-violet-50", text: "text-violet-600" },
  { bg: "bg-sky-50", text: "text-sky-600" },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatMoney(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatBillDate(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function statusStyles(status: RecentBill["status"]) {
  if (status === "Paid") {
    return {
      amount: "text-emerald-600",
      pill: "bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    };
  }
  if (status === "Unpaid" || status === "Pending") {
    return {
      amount: "text-orange-600",
      pill: "bg-orange-50 text-orange-700",
      dot: "bg-orange-500",
    };
  }
  return {
    amount: "text-gray-700",
    pill: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  };
}

function toStatus(raw: unknown, dueAmount: number): RecentBill["status"] {
  const v = String(raw ?? "").toLowerCase();
  if (v === "cancelled") return "Cancelled";
  if (v === "draft") return "Draft";
  if (v === "pending") return "Pending";
  if (v === "unpaid" || dueAmount > 0) return "Unpaid";
  return "Paid";
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { canPath } = usePermission();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [bills, setBills] = useState<RecentBill[]>([]);
  const [loading, setLoading] = useState(true);

  const quickBillPath = canPath("/create-invoice")
    ? "/create-invoice"
    : canPath("/create-pos")
      ? "/create-pos"
      : "/pos";

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!canPath("/pos") && !canPath("/invoices")) {
        if (alive) {
          setBills([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const response = await axiosInstance.get("/invoice");
        const invoices = Array.isArray(response.data?.invoices)
          ? response.data.invoices
          : [];
        const mapped: RecentBill[] = invoices
          .slice(0, 20)
          .map((invoice: any, index: number) => {
            const due = Number(
              invoice?.pendingAmount ??
                invoice?.paymentBreakdown?.dueAmount ??
                0,
            );
            return {
              id: String(invoice?._id ?? index),
              customer: String(invoice?.customerName || "Walk-in customer"),
              invoiceCode: String(
                invoice?.invoiceCode ??
                  `INV-${invoice?.invoiceNumber ?? index + 1}`,
              ),
              billedBy: String(
                invoice?.createdBy?.m_staff_id ||
                  invoice?.salesPersonName ||
                  invoice?.createdBy?.m_staff_name ||
                  "—",
              ),
              amount: Number(invoice?.grandTotal ?? 0),
              status: toStatus(invoice?.status, due),
              createdAt: invoice?.createdAt
                ? new Date(invoice.createdAt)
                : invoice?.invoiceDate
                  ? new Date(invoice.invoiceDate)
                  : null,
            };
          });
        if (alive) setBills(mapped);
      } catch {
        if (alive) setBills([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [canPath]);

  const filteredBills = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bills.filter((bill) => {
      if (!term) return true;
      return (
        bill.customer.toLowerCase().includes(term) ||
        bill.invoiceCode.toLowerCase().includes(term) ||
        bill.billedBy.toLowerCase().includes(term)
      );
    });
  }, [bills, search]);

  const onFilterClick = (key: FilterKey) => {
    setFilter(key);
  };

  const filters: {
    key: FilterKey;
    label: string;
    icon?: typeof Users;
  }[] = [
    { key: "all", label: "Bills" },
    { key: "customers", label: "Customers", icon: Users },
    { key: "products", label: "Products", icon: Package },
    { key: "services", label: "Services", icon: Briefcase },
  ];

  const showBills = filter === "all" || filter === "customers";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 font-sans">
      {/* Quick actions */}
     <section className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
  <button
    type="button"
    onClick={() => navigate("/foodBill")}
    className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-2 sm:p-3 md:p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
  >
    <span className="flex h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2F6FED]">
      <Utensils size={20} className="sm:w-6 sm:h-6" />
    </span>
    <span className="mt-2 text-center text-[10px] sm:text-xs md:text-sm font-semibold text-gray-800 leading-tight">
      Food Bill
    </span>
  </button>

  <button
    type="button"
    onClick={() => navigate(quickBillPath)}
    className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-2 sm:p-3 md:p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
  >
    <span className="flex h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2F6FED]">
      <FilePlus2 size={20} className="sm:w-6 sm:h-6" />
    </span>
    <span className="mt-2 text-center text-[10px] sm:text-xs md:text-sm font-semibold text-gray-800 leading-tight">
      Quick Bill
    </span>
  </button>

  <button
    type="button"
    onClick={() => navigate("/customers")}
    className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-2 sm:p-3 md:p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
  >
    <span className="flex h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
      <UserPlus size={20} className="sm:w-6 sm:h-6" />
    </span>
    <span className="mt-2 text-center text-[10px] sm:text-xs md:text-sm font-semibold text-gray-800 leading-tight">
      Add Customer
    </span>
  </button>

  <button
    type="button"
    onClick={() =>
      navigate(canPath("/membership") ? "/membership" : "/manage-plans")
    }
    className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-2 sm:p-3 md:p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
  >
    <span className="flex h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
      <Crown size={20} className="sm:w-6 sm:h-6" />
    </span>
    <span className="mt-2 text-center text-[10px] sm:text-xs md:text-sm font-semibold text-gray-800 leading-tight">
      Activate Membership
    </span>
  </button>
</section>
      {/* Search + filters */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="shrink-0 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers, products, services..."
            className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            className="shrink-0 rounded-full p-1.5 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
            aria-label="Filters"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {filters.map((item) => {
            const Icon = item.icon;
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onFilterClick(item.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "border-blue-200 bg-blue-50 text-[#2F6FED]"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {Icon ? <Icon size={15} /> : null}
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Recent bills */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-lg font-bold text-gray-900">Recent Bills</h2>
            <button
              type="button"
              onClick={() => navigate(canPath("/pos") ? "/pos" : "/invoices")}
              className="inline-flex items-center gap-0.5 text-sm font-semibold text-[#2F6FED] transition hover:underline"
            >
              View All
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="space-y-2.5">
            {!showBills ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
                <p className="text-sm text-gray-500">
                  Browse {filter === "products" ? "products" : "services"} in
                  catalogue.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigate(filter === "products" ? "/products" : "/services")
                  }
                  className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white"
                >
                  Open {filter === "products" ? "Products" : "Services"}
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[76px] animate-pulse rounded-2xl border border-gray-100 bg-white"
                />
              ))
            ) : filteredBills.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                No recent bills found.
              </div>
            ) : (
              filteredBills.slice(0, 8).map((bill, index) => {
                const tone = AVATAR_TONES[index % AVATAR_TONES.length];
                const styles = statusStyles(bill.status);
                return (
                  <button
                    key={bill.id}
                    type="button"
                    onClick={() =>
                      navigate(canPath("/pos") ? "/pos" : "/invoices")
                    }
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-3 text-left shadow-sm transition hover:border-blue-100 hover:shadow-md sm:gap-4 sm:px-4"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tone.bg} ${tone.text}`}
                    >
                      {initials(bill.customer)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-gray-900">
                        {bill.customer}
                      </p>
                      <p className="truncate text-xs text-gray-500 sm:text-[13px]">
                        {bill.invoiceCode}
                      </p>
                      <p className="truncate text-[11px] text-gray-400 sm:text-xs">
                        {formatBillDate(bill.createdAt)}
                      </p>
                    </div>

                    <div className="hidden min-w-[7rem] shrink-0 text-center md:block">
                      <p className="text-[11px] text-gray-400">Billed by</p>
                      <p className="truncate text-xs font-medium text-gray-700">
                        ID: {bill.billedBy}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-bold sm:text-[15px] ${styles.amount}`}
                      >
                        {formatMoney(bill.amount)}
                      </p>
                      <span
                        className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles.pill}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}
                        />
                        {bill.status === "Pending" ? "Unpaid" : bill.status}
                      </span>
                    </div>

                    <ChevronRight
                      size={18}
                      className="hidden shrink-0 text-gray-300 sm:block"
                    />
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Desktop summary cards */}
        <aside className="hidden space-y-4 lg:block">
          <RevenueCard
            title="Revenue"
            amount="₹90,000.00"
            date="This month"
            stats={{
              Store: "50,000",
              Membership: "10,000",
              Event: "20,000",
              Space: "10,000",
            }}
          />
          <RevenueCard
            title="Network"
            amount="₹40,000.00"
            date="This month"
            stats={{
              Vendor: "10,000",
              Customer: "15,000",
              Partner: "8,000",
              Guest: "7,000",
            }}
          />
        </aside>
      </div>
    </div>
  );
}
