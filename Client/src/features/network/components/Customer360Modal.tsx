import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Phone,
  Mail,
  Building2,
  Wallet,
  CalendarDays,
  Crown,
  Receipt,
  CalendarPlus,
  FilePlus2,
  MoreVertical,
  LayoutDashboard,
  ShoppingBag,
  Award,
  Calendar,
  History,
  MessageCircle,
  MapPin,
  Sparkles,
  Scale,
  User,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import CreatePosScreen from "@/features/sales/pages/CreatePosScreen";
import {
  handleGetCustomer360,
  type Customer360Booking,
  type Customer360Membership,
  type Customer360Purchase,
  type Customer360Response,
  type Customer360CspProgram,
  type Customer360TimelineItem,
  type Customer360WalletTx,
} from "@/services/apiClient";
import { closeIfConfirmed } from "@/utils/confirmClose";
import { usePersistedDateFilter } from "@/utils/rememberDateFilter";

type Tab = "overview" | "purchases" | "program" | "bookings" | "memberships" | "wallet" | "timeline";
type ProgramTab = "csp" | "hap";
type CreatedSort = "newest" | "oldest";
type DateRange = "" | "today" | "this-week" | "this-month" | "last-month" | "this-year" | "last-year";

// Tab config will be dynamically built inside the component with counts and icons

const money = (value?: number | null) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const when = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const timeOf = (value?: string | null) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
};

const whenStamp = (dateValue?: string | null, timeValue?: string | null) => {
  const dateText = when(dateValue || timeValue);
  if (dateText === "—") return "—";
  const clock = timeOf(timeValue || dateValue);
  return clock ? `${dateText}, ${clock}` : dateText;
};

const monthOf = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const rangeBounds = (range: DateRange) => {
  if (!range) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (range === "today") return { start, end };
  if (range === "this-week") {
    const mondayOffset = (now.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    return { start, end };
  }
  if (range === "this-month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (range === "last-month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  if (range === "this-year") {
    return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
  }
  return {
    start: new Date(now.getFullYear() - 1, 0, 1),
    end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
  };
};

const inDateRange = (value: string | null | undefined, range: DateRange) => {
  const bounds = rangeBounds(range);
  if (!bounds) return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= bounds.start && date <= bounds.end;
};

const createdStamp = (value?: string | null) => {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

function sortByCreated<T>(rows: T[], pick: (row: T) => string | null | undefined, order: CreatedSort) {
  return [...rows].sort((left, right) => {
    const diff = createdStamp(pick(left)) - createdStamp(pick(right));
    return order === "oldest" ? diff : -diff;
  });
}

export default function Customer360Modal({
  customerId,
  customerName,
  onClose,
}: {
  customerId: string;
  customerName?: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { canPath } = usePermission();
  const [tab, setTab] = useState<Tab>("overview");
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<CreatedSort>("newest");
  const { datePreset: dateRange, setDatePreset: setDateRange } =
    usePersistedDateFilter<DateRange>(
      "customer-360",
      "",
      ["", "today", "this-week", "this-month", "last-month", "this-year", "last-year"],
      () => ({ from: "", to: "" }),
    );
  const [sale, setSale] = useState<Customer360Purchase | null>(null);
  const [data, setData] = useState<Customer360Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posOpen, setPosOpen] = useState(false);

  useEffect(() => {
    if (!actionsOpen) return;
    const close = (event: MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setActionsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [actionsOpen]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void handleGetCustomer360(customerId, controller.signal)
      .then((response) => setData(response))
      .catch((err: { name?: string; response?: { data?: { message?: string } } }) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.response?.data?.message || "Could not load this customer.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [customerId]);

  const customer = data?.customer;
  const summary = data?.summary;
  const purchases = useMemo(
    () =>
      sortByCreated(
        (data?.purchases || []).filter((row) => inDateRange(row.invoiceDate || row.createdAt, dateRange)),
        (row) => row.createdAt || row.invoiceDate,
        sort,
      ),
    [data?.purchases, sort, dateRange],
  );
  const bookings = useMemo(
    () =>
      sortByCreated(
        (data?.bookings || []).filter((row) => inDateRange(row.bookingDate || row.createdAt, dateRange)),
        (row) => row.createdAt || row.bookingDate,
        sort,
      ),
    [data?.bookings, sort, dateRange],
  );
  const currentMembership = data?.summary?.currentMembership || null;
  const memberships = useMemo(() => {
    const filtered = sortByCreated(
      (data?.memberships || []).filter((row) => inDateRange(row.startDate || row.invoiceDate || row.createdAt, dateRange)),
      (row) => row.createdAt || row.startDate,
      sort,
    );
    if (currentMembership && !filtered.some((row) => row.id === currentMembership.id)) {
      return [currentMembership, ...filtered];
    }
    return filtered;
  }, [data?.memberships, sort, dateRange, currentMembership]);
  const walletRows = useMemo(
    () =>
      sortByCreated(
        (data?.walletTransactions || []).filter((row) => inDateRange(row.createdAt, dateRange)),
        (row) => row.createdAt,
        sort,
      ),
    [data?.walletTransactions, sort, dateRange],
  );
  const timeline = useMemo(
    () =>
      sortByCreated(
        (data?.timeline || []).filter((row) => inDateRange(row.createdAt || row.at, dateRange)),
        (row) => row.createdAt || row.at,
        sort,
      ),
    [data?.timeline, sort, dateRange],
  );

  const openBooking = (kind: "full" | "express") => {
    const params = new URLSearchParams({ create: "true", customerId });
    const name = customer?.name || customerName || "";
    if (name) params.set("customerName", name);
    if (customer?.mobile) params.set("customerPhone", customer.mobile);
    if (customer?.email) params.set("customerEmail", customer.email);
    if (customer?.membershipType) params.set("membershipType", customer.membershipType);
    navigate(kind === "full" ? `/allBookings?${params}` : `/spaceBooking?${params}`);
  };

  const openSales = purchases.filter((row) => !["cancelled", "draft"].includes(row.status.toLowerCase()));
  const openBookings = bookings.filter((row) => !["cancelled", "draft", "expired"].includes(row.status.toLowerCase()));

  const tabsConfig = [
    {
      id: "overview" as const,
      label: "Overview",
      Icon: LayoutDashboard,
      activeClass:
        "bg-sky-100 text-sky-800 border-2 border-sky-400/80 shadow-xs ring-1 ring-sky-200",
      inactiveClass:
        "bg-sky-50/70 text-sky-700/80 border border-sky-200/70 hover:bg-sky-100/70",
      badge: null,
    },
    {
      id: "purchases" as const,
      label: "Shopping",
      Icon: ShoppingBag,
      activeClass:
        "bg-emerald-100 text-emerald-800 border-2 border-emerald-400/80 shadow-xs ring-1 ring-emerald-200",
      inactiveClass:
        "bg-emerald-50/70 text-emerald-700/80 border border-emerald-200/70 hover:bg-emerald-100/70",
      badge: purchases.length || null,
    },
    {
      id: "program" as const,
      label: "Program",
      Icon: Award,
      activeClass:
        "bg-amber-100 text-amber-800 border-2 border-amber-400/80 shadow-xs ring-1 ring-amber-200",
      inactiveClass:
        "bg-amber-50/70 text-amber-700/80 border border-amber-200/70 hover:bg-amber-100/70",
      badge: null,
    },
    {
      id: "bookings" as const,
      label: "Bookings",
      Icon: Calendar,
      activeClass:
        "bg-indigo-100 text-indigo-800 border-2 border-indigo-400/80 shadow-xs ring-1 ring-indigo-200",
      inactiveClass:
        "bg-indigo-50/70 text-indigo-700/80 border border-indigo-200/70 hover:bg-indigo-100/70",
      badge: bookings.length || null,
    },
    {
      id: "memberships" as const,
      label: "Memberships",
      Icon: Crown,
      activeClass:
        "bg-purple-100 text-purple-800 border-2 border-purple-400/80 shadow-xs ring-1 ring-purple-200",
      inactiveClass:
        "bg-purple-50/70 text-purple-700/80 border border-purple-200/70 hover:bg-purple-100/70",
      badge: memberships.length || null,
    },
    {
      id: "wallet" as const,
      label: "Wallet",
      Icon: Wallet,
      activeClass:
        "bg-teal-100 text-teal-800 border-2 border-teal-400/80 shadow-xs ring-1 ring-teal-200",
      inactiveClass:
        "bg-teal-50/70 text-teal-700/80 border border-teal-200/70 hover:bg-teal-100/70",
      badge: walletRows.length || null,
    },
    {
      id: "timeline" as const,
      label: "Activity",
      Icon: History,
      activeClass:
        "bg-orange-100 text-orange-800 border-2 border-orange-400/80 shadow-xs ring-1 ring-orange-200",
      inactiveClass:
        "bg-orange-50/70 text-orange-700/80 border border-orange-200/70 hover:bg-orange-100/70",
      badge: timeline.length || null,
    },
  ];

  const cards = [
    {
      label: "Shopping",
      value: money(openSales.reduce((sum, row) => sum + row.amount, 0)),
      hint: `${openSales.length} bills`,
      icon: ShoppingBag,
      bg: "bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border-emerald-200/80",
      iconBg: "bg-emerald-100/90",
      iconColor: "text-emerald-600",
      textColor: "text-emerald-950",
    },
    {
      label: "Due on bills",
      value: money(openSales.reduce((sum, row) => sum + row.dueAmount, 0)),
      hint: "Still payable",
      icon: Scale,
      bg: "bg-gradient-to-br from-rose-50/90 via-pink-50/50 to-white border-rose-200/80",
      iconBg: "bg-rose-100/90",
      iconColor: "text-rose-600",
      textColor: "text-rose-950",
    },
    {
      label: "Bookings",
      value: money(openBookings.reduce((sum, row) => sum + row.amount, 0)),
      hint: `${openBookings.length} bookings`,
      icon: Calendar,
      bg: "bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-white border-blue-200/80",
      iconBg: "bg-blue-100/90",
      iconColor: "text-blue-600",
      textColor: "text-blue-950",
    },
    {
      label: "Memberships",
      value: String(
        memberships.filter(
          (row) => !["cancelled", "draft", "expired"].includes(row.status.toLowerCase()),
        ).length,
      ),
      hint:
        currentMembership?.status === "active"
          ? currentMembership.plan || customer?.membershipType || "none"
          : "none",
      icon: Crown,
      bg: "bg-gradient-to-br from-purple-50/90 via-violet-50/50 to-white border-purple-200/80",
      iconBg: "bg-purple-100/90",
      iconColor: "text-purple-600",
      textColor: "text-purple-950",
    },
    {
      label: "Wallet",
      value: money(summary?.walletBalance),
      hint: `Credit ${money(
        walletRows
          .filter((row) => row.type === "credit")
          .reduce((sum, row) => sum + row.amount, 0),
      )} · Debit ${money(
        walletRows
          .filter((row) => row.type === "debit")
          .reduce((sum, row) => sum + row.amount, 0),
      )}`,
      icon: Wallet,
      bg: "bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white border-amber-200/80",
      iconBg: "bg-amber-100/90",
      iconColor: "text-amber-600",
      textColor: "text-amber-950",
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-slate-900/60 p-0 backdrop-blur-2xs sm:items-center sm:p-4 animate-in fade-in duration-200">
      <div className="flex h-dvh w-full max-w-6xl flex-col overflow-hidden bg-[#F8FAFC] sm:h-[92vh] sm:rounded-2xl sm:shadow-2xl">
        {/* Modal Header */}
        <header className="border-b border-slate-200 bg-white px-3.5 sm:px-5 py-2.5 sm:py-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-700">
                <Building2 size={11} /> Customer 360 View
              </span>
              <h2 className="truncate text-base sm:text-xl font-black text-slate-900 mt-1">
                {customer?.name || customerName || "Customer"}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                {customer?.companyName ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                    <Building2 size={11} className="text-slate-400" />
                    {customer.companyName}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400">
                    No company
                  </span>
                )}
                {customer?.mobile ? (
                  <a
                    href={`tel:${customer.mobile}`}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/90 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Phone size={11} className="text-emerald-600" /> {customer.mobile}
                  </a>
                ) : null}
                {customer?.whatsappNumber ? (
                  <a
                    href={`https://wa.me/${String(customer.whatsappNumber).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200/90 px-2.5 py-0.5 text-[11px] font-bold text-teal-700 hover:bg-teal-100 transition shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <MessageCircle size={11} className="text-teal-600" /> WhatsApp
                  </a>
                ) : null}
                {customer?.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200/90 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 hover:bg-sky-100 transition shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Mail size={11} className="text-sky-600" /> Email
                  </a>
                ) : null}
              </div>
            </div>

            {/* Actions & Close Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Mobile 3-dot actions */}
              <div ref={actionsRef} className="relative sm:hidden">
                <button
                  type="button"
                  aria-label="Actions menu"
                  onClick={() => setActionsOpen((open) => !open)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 border border-violet-200/90 text-violet-700 hover:bg-violet-100 shadow-2xs active:scale-95 transition cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>

                {actionsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs"
                      onClick={() => setActionsOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-xl animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col gap-2">
                        {canPath("/create-pos") || canPath("/pos") || canPath("/create-invoice") ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActionsOpen(false);
                              setPosOpen(true);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl bg-blue-50 border border-blue-200/90 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 shadow-2xs active:scale-95 transition text-left cursor-pointer"
                          >
                            <FilePlus2 size={15} className="text-blue-600 shrink-0" />
                            <span>Create POS Bill</span>
                          </button>
                        ) : null}
                        {canPath("/spaceBooking") ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActionsOpen(false);
                              openBooking("express");
                            }}
                            className="flex w-full items-center gap-2 rounded-xl bg-purple-50 border border-purple-200/90 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 shadow-2xs active:scale-95 transition text-left cursor-pointer"
                          >
                            <CalendarPlus size={15} className="text-purple-600 shrink-0" />
                            <span>Express Booking</span>
                          </button>
                        ) : null}
                        {canPath("/allBookings") ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActionsOpen(false);
                              openBooking("full");
                            }}
                            className="flex w-full items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/90 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-2xs active:scale-95 transition text-left cursor-pointer"
                          >
                            <CalendarDays size={15} className="text-emerald-600 shrink-0" />
                            <span>Full Booking</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => void closeIfConfirmed(onClose)}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-rose-50 border border-rose-200/90 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <X size={14} className="text-rose-600" /> Close
              </button>
            </div>
          </div>

          {/* Quick Action buttons row (scrollable on mobile) */}
          <div className="mt-2.5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none sm:mt-3 sm:flex-wrap">
            {canPath("/create-pos") || canPath("/pos") || canPath("/create-invoice") ? (
              <button
                type="button"
                onClick={() => setPosOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200/90 px-3 py-1.5 sm:py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <FilePlus2 size={13} className="text-blue-600" /> Create POS Bill
              </button>
            ) : null}
            {canPath("/spaceBooking") ? (
              <button
                type="button"
                onClick={() => openBooking("express")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-purple-50 border border-purple-200/90 px-3 py-1.5 sm:py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 hover:border-purple-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <CalendarPlus size={13} className="text-purple-600" /> Express Booking
              </button>
            ) : null}
            {canPath("/allBookings") ? (
              <button
                type="button"
                onClick={() => openBooking("full")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200/90 px-3 py-1.5 sm:py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <CalendarDays size={13} className="text-emerald-600" /> Full Booking
              </button>
            ) : null}
          </div>
        </header>

        {/* Colorful Tabs Bar */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 sm:px-4 py-2 scrollbar-none shrink-0">
          {tabsConfig.map((item) => {
            const isActive = tab === item.id;
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-95 ${
                  isActive ? item.activeClass : item.inactiveClass
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span>{item.label}</span>
                {item.badge != null && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-black leading-none ${
                      isActive ? "bg-white/80 text-slate-800 shadow-2xs" : "bg-white/60 text-slate-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-white px-3 sm:px-4 py-2 shrink-0">
          <p className="text-xs font-bold text-slate-500">
            {dateRange ? "Showing the selected period" : "Showing all dates"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as DateRange)}
              className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="">All dates</option>
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="this-year">This year</option>
              <option value="last-year">Last year</option>
            </select>
            {tab !== "overview" ? (
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as CreatedSort)}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
              >
                <option value="newest">Newest created</option>
                <option value="oldest">Oldest created</option>
              </select>
            ) : null}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-sm font-semibold text-slate-500">Loading customer details…</p>
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          {!loading && data && tab === "overview" ? (
            <div className="space-y-3.5">
              {/* Colorful Metric Cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                {cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <article
                      key={card.label}
                      className={`relative overflow-hidden rounded-2xl border p-3 sm:p-4 shadow-2xs transition hover:shadow-xs ${card.bg}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="truncate text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                          {card.label}
                        </p>
                        <span
                          className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}
                        >
                          <Icon size={14} className={card.iconColor} />
                        </span>
                      </div>
                      <p
                        className={`mt-1.5 truncate text-base sm:text-xl font-black ${card.textColor}`}
                      >
                        {card.value}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] sm:text-xs font-medium text-slate-500">
                        {card.hint}
                      </p>
                    </article>
                  );
                })}
              </div>

              {/* Profile Card with Details Card System */}
              <article className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Profile Details
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Customer contact and account information
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    {
                      label: "PHONE",
                      value: customer?.mobile,
                      Icon: Phone,
                      iconBg: "bg-purple-100/90",
                      iconColor: "text-purple-600",
                      cardBg: "bg-gradient-to-br from-purple-50/70 to-white border-purple-200/80",
                      link: customer?.mobile ? `tel:${customer.mobile}` : undefined,
                    },
                    {
                      label: "WHATSAPP",
                      value: customer?.whatsappNumber,
                      Icon: MessageCircle,
                      iconBg: "bg-teal-100/90",
                      iconColor: "text-teal-600",
                      cardBg: "bg-gradient-to-br from-teal-50/70 to-white border-teal-200/80",
                      link: customer?.whatsappNumber
                        ? `https://wa.me/${String(customer.whatsappNumber).replace(/\D/g, "")}`
                        : undefined,
                    },
                    {
                      label: "EMAIL",
                      value: customer?.email,
                      Icon: Mail,
                      iconBg: "bg-sky-100/90",
                      iconColor: "text-sky-600",
                      cardBg: "bg-gradient-to-br from-sky-50/70 to-white border-sky-200/80",
                      link: customer?.email ? `mailto:${customer.email}` : undefined,
                    },
                    {
                      label: "MEMBERSHIP",
                      value:
                        currentMembership?.status === "active"
                          ? currentMembership.plan || customer?.membershipType || "none"
                          : customer?.membershipType || "none",
                      Icon: Crown,
                      iconBg: "bg-amber-100/90",
                      iconColor: "text-amber-600",
                      cardBg: "bg-gradient-to-br from-amber-50/70 to-white border-amber-200/80",
                    },
                    {
                      label: "COMPANY",
                      value: customer?.companyName,
                      Icon: Building2,
                      iconBg: "bg-indigo-100/90",
                      iconColor: "text-indigo-600",
                      cardBg: "bg-gradient-to-br from-indigo-50/70 to-white border-indigo-200/80",
                    },
                    {
                      label: "REFERRAL CODE",
                      value: customer?.referralCode,
                      Icon: Sparkles,
                      iconBg: "bg-pink-100/90",
                      iconColor: "text-pink-600",
                      cardBg: "bg-gradient-to-br from-pink-50/70 to-white border-pink-200/80",
                    },
                    {
                      label: "JOINED DATE",
                      value: whenStamp(customer?.createdAt),
                      Icon: Calendar,
                      iconBg: "bg-blue-100/90",
                      iconColor: "text-blue-600",
                      cardBg: "bg-gradient-to-br from-blue-50/70 to-white border-blue-200/80",
                    },
                    {
                      label: "ADDRESS",
                      value: [
                        customer?.address,
                        customer?.city,
                        customer?.state,
                        customer?.pincode,
                      ]
                        .filter(Boolean)
                        .join(", "),
                      Icon: MapPin,
                      iconBg: "bg-emerald-100/90",
                      iconColor: "text-emerald-600",
                      cardBg: "bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200/80",
                    },
                  ].map((item) => {
                    const Icon = item.Icon;
                    return (
                      <div
                        key={item.label}
                        className={`flex items-start gap-2.5 rounded-2xl border p-3 shadow-2xs transition hover:shadow-xs ${item.cardBg}`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.iconBg} ${item.iconColor}`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {item.label}
                          </p>
                          {item.link && item.value && item.value !== "—" ? (
                            <a
                              href={item.link}
                              target={item.link.startsWith("http") ? "_blank" : undefined}
                              rel="noreferrer"
                              className="mt-0.5 block truncate text-xs font-bold text-slate-800 hover:text-blue-600 transition"
                            >
                              {item.value}
                            </a>
                          ) : (
                            <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                              {item.value || "—"}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              {/* Active Membership Card */}
              {currentMembership ? (
                <article className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/60 via-purple-50/30 to-white p-3.5 sm:p-4 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
                        <Crown size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold capitalize text-slate-900">
                          {currentMembership.plan || "Membership"}
                        </h3>
                        <p className="text-[11px] text-slate-500">Active Membership Plan</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        currentMembership.status === "active"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-rose-100 text-rose-600 border border-rose-200"
                      }`}
                    >
                      {currentMembership.status || "Active"}
                    </span>
                  </div>

                  <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-xl border border-violet-100 bg-white p-2.5 text-center shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Date</p>
                      <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                        {whenStamp(currentMembership.startDate, currentMembership.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-violet-100 bg-white p-2.5 text-center shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiry Date</p>
                      <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                        {currentMembership.term === "lifetime" ? "Lifetime" : when(currentMembership.endDate)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-violet-100 bg-white p-2.5 text-center shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</p>
                      <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                        {currentMembership.months ? `${currentMembership.months} Months` : currentMembership.term === "lifetime" ? "Lifetime" : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-violet-100 bg-white p-2.5 text-center shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plan Amount</p>
                      <p className="mt-0.5 truncate text-xs font-black text-emerald-700">
                        {money(currentMembership.amount)}
                      </p>
                    </div>
                  </div>
                </article>
              ) : null}
            </div>
          ) : null}

          {!loading && data && tab !== "overview" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              {tab === "purchases" ? <PurchaseList rows={purchases} onOpen={setSale} /> : null}
              {tab === "program" ? (
                <ProgramPanel
                  key={customerId}
                  program={data.program?.csp}
                  dateRange={dateRange}
                  sort={sort}
                />
              ) : null}
              {tab === "bookings" ? <BookingList rows={bookings} /> : null}
              {tab === "memberships" ? <MembershipList rows={memberships} /> : null}
              {tab === "wallet" ? <WalletList rows={walletRows} /> : null}
              {tab === "timeline" ? <TimelineList rows={timeline} /> : null}
            </section>
          ) : null}
        </div>
      </div>
      {sale ? <SaleDetail sale={sale} onClose={() => setSale(null)} /> : null}
      <CreatePosScreen
        open={posOpen}
        onClose={() => setPosOpen(false)}
        overlayClassName="z-[120]"
        initialCustomer={{
          id: customerId,
          name: customer?.name || customerName || "",
          phone: customer?.mobile || "",
          membership: customer?.membershipType || "none",
        }}
      />
    </div>
  );
}

function ProgramPanel({
  program,
  dateRange,
  sort,
}: {
  program?: Customer360CspProgram | null;
  dateRange: DateRange;
  sort: CreatedSort;
}) {
  const [programTab, setProgramTab] = useState<ProgramTab>("csp");
  const products = sortByCreated(
    (program?.products || []).filter((row) => inDateRange(row.createdAt, dateRange)),
    (row) => row.createdAt,
    sort,
  );
  const sales = sortByCreated(
    (program?.sales || []).filter((row) => inDateRange(row.at, dateRange)),
    (row) => row.at,
    sort,
  );
  const payouts = sortByCreated(
    (program?.payouts || []).filter((row) => inDateRange(row.at, dateRange)),
    (row) => row.at,
    sort,
  );
  const timeline = sortByCreated(
    (program?.timeline || []).filter((row) => inDateRange(row.at, dateRange)),
    (row) => row.at,
    sort,
  );
  const status = programStatus(program);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(
          [
            ["csp", "CSP"],
            ["hap", "HAP"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setProgramTab(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              programTab === id ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {programTab === "hap" ? (
        <Empty text="No House Affiliate Program record for this customer." />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">CSP</p>
              <p className="text-sm font-semibold text-slate-800">
                {program?.brandName || "Creative Seller Partner"}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}>
              {status.label}
            </span>
          </div>
          {program?.applicationStatus === "rejected" && program.rejectionReason ? (
            <p className="text-sm text-rose-600">Reason: {program.rejectionReason}</p>
          ) : null}
          {!program?.enrolled && program?.applicationStatus !== "under_review" && program?.applicationStatus !== "rejected" ? (
            <p className="text-sm text-slate-500">This customer has not enrolled in CSP.</p>
          ) : null}
              <ProgramBlock title="Products">
                {products.length === 0 ? (
                  <Empty text="No CSP products for this customer." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {products.map((row) => (
                      <li key={row.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{row.name || "Product"}</p>
                          <p className="text-xs text-slate-500">
                            {row.category || "No category"}
                            {` · ${row.sold} sold`}
                            {row.createdAt ? ` · ${when(row.createdAt)}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{money(row.price)}</p>
                          <p className="text-xs text-slate-500">Sales {money(row.sales)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </ProgramBlock>
              <ProgramBlock title="Sales">
                {sales.length === 0 ? (
                  <Empty text="No CSP sales for this customer." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {sales.map((row) => (
                      <li key={row.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{row.title || "Sale"}</p>
                          <p className="text-xs text-slate-500">
                            {whenStamp(row.at)}
                            {row.detail ? ` · ${row.detail}` : ""}
                          </p>
                        </div>
                        <p className="font-bold text-slate-900">{money(row.amount)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </ProgramBlock>
              <ProgramBlock title="Payout">
                <p className="mb-2 text-xs text-slate-500">
                  Pending {money(program?.performance?.pendingPayout)} · Completed {money(program?.performance?.completedPayout)} · Available {money(program?.performance?.availableBalance)}
                </p>
                {payouts.length === 0 ? (
                  <Empty text="No payout requests for this customer." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {payouts.map((row) => (
                      <li key={row.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                        <div>
                          <p className="font-bold capitalize text-slate-900">{row.status?.replace(/_/g, " ") || "Payout"}</p>
                          <p className="text-xs text-slate-500">
                            {whenStamp(row.at)}
                            {row.method ? ` · ${row.method.toUpperCase()}` : ""}
                          </p>
                        </div>
                        <p className="font-bold text-slate-900">{money(row.amount)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </ProgramBlock>
              <ProgramBlock title="Timeline">
                {timeline.length === 0 ? (
                  <Empty text="No CSP sales or payouts in this period." />
                ) : (
                  <ol className="space-y-2">
                    {timeline.map((row, index) => (
                      <li key={row.id || `${row.kind}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">
                              {row.kind === "payout" ? "Payout" : "Sale"}
                            </p>
                            <p className="text-sm font-bold text-slate-900">{row.title}</p>
                            <p className="text-xs text-slate-500">
                              {whenStamp(row.at)}
                              {row.detail ? ` · ${row.detail}` : ""}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-bold text-slate-900">{money(row.amount)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </ProgramBlock>
        </div>
      )}
    </div>
  );
}

function programStatus(program?: Customer360CspProgram | null) {
  const application = String(program?.applicationStatus || "").toLowerCase();
  const enrollment = String(program?.status || "").toLowerCase();
  if (program?.enrolled && enrollment === "active") {
    return { label: "Active", className: "bg-emerald-100 text-emerald-700" };
  }
  if (program?.enrolled) {
    return { label: "Inactive", className: "bg-slate-100 text-slate-600" };
  }
  if (application === "under_review") {
    return { label: "Under review", className: "bg-amber-100 text-amber-700" };
  }
  if (application === "rejected") {
    return { label: "Rejected", className: "bg-rose-100 text-rose-700" };
  }
  return { label: "Not enrolled", className: "bg-slate-100 text-slate-600" };
}

function ProgramBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-bold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

function PurchaseList({
  rows,
  onOpen,
}: {
  rows: Customer360Purchase[];
  onOpen: (row: Customer360Purchase) => void;
}) {
  if (!rows.length) return <Empty text="No product sales for this customer." />;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={row.id}>
          <button type="button" onClick={() => onOpen(row)} className="flex w-full items-start justify-between gap-3 py-3 text-left text-sm hover:bg-violet-50/60">
            <div className="min-w-0">
              <p className="flex items-center gap-1 font-bold text-violet-700"><Receipt size={14} /> {row.code || "Invoice"}</p>
              <p className="mt-0.5 text-xs text-slate-600">
                {(row.items || []).map((item) => item.name).filter(Boolean).join(", ") || "No products"}
              </p>
              <p className="text-xs text-slate-500">
                {whenStamp(row.invoiceDate, row.createdAt)}
                {monthOf(row.invoiceDate) ? ` · ${monthOf(row.invoiceDate)}` : ""}
                {` · Discount ${money(row.discountTotal)}`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-bold text-slate-900">{money(row.amount)}</p>
              <p className="text-xs text-slate-500">Paid {money(row.paidAmount)} · Due {money(row.dueAmount)}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function BookingList({ rows }: { rows: Customer360Booking[] }) {
  if (!rows.length) return <Empty text="No bookings for this customer." />;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={`${row.kind}-${row.id}`} className="flex items-start justify-between gap-3 py-3 text-sm">
          <div>
            <p className="flex items-center gap-1 font-bold text-slate-900">
              <CalendarDays size={14} /> {row.title}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{row.kind}</span>
            </p>
            <p className="text-xs text-slate-500">
              {whenStamp(row.bookingDate, row.createdAt)}
              {row.startTime ? ` · ${row.startTime}${row.endTime ? `–${row.endTime}` : ""}` : ""}
              {row.status ? ` · ${row.status}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900">{money(row.amount)}</p>
            <p className="text-xs text-slate-500">Paid {money(row.paidAmount)} · Due {money(row.dueAmount)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MembershipList({ rows }: { rows: Customer360Membership[] }) {
  if (!rows.length) return <Empty text="No memberships for this customer." />;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-3 py-3 text-sm">
          <div>
            <p className="flex items-center gap-1 font-bold capitalize text-slate-900">
              <Crown size={14} /> {row.plan || "Membership"}
              {row.current || row.code === "Current" ? (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">Current</span>
              ) : null}
            </p>
            <p className="text-xs text-slate-500">
              {row.code ? `${row.code} · ` : ""}
              {whenStamp(row.startDate || row.invoiceDate, row.createdAt)}
              {row.months ? ` · ${row.months} months` : row.term === "lifetime" ? " · Lifetime" : ""}
              {row.endDate ? ` – ${when(row.endDate)}` : ""}
              {row.status ? ` · ${row.status}` : ""}
            </p>
          </div>
          <p className="font-bold text-slate-900">{money(row.amount)}</p>
        </li>
      ))}
    </ul>
  );
}

function WalletList({ rows }: { rows: Customer360WalletTx[] }) {
  if (!rows.length) return <Empty text="No wallet credits or debits in this period." />;
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">Wallet only. Credits add money. Debits spend it. Product sales stay in Sell Product and Activity.</p>
      <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-3 py-3 text-sm">
          <div>
            <p className="flex items-center gap-1 font-bold capitalize text-slate-900"><Wallet size={14} /> {row.type} · {row.reason || row.walletType || "Wallet"}</p>
            <p className="text-xs text-slate-500">
              {whenStamp(row.createdAt)}
              {row.note ? ` · ${row.note}` : ""}
              {row.by ? ` · ${row.by}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-bold ${row.type === "debit" ? "text-rose-600" : "text-emerald-700"}`}>
              {row.type === "debit" ? "−" : "+"}{money(row.amount)}
            </p>
            <p className="text-xs text-slate-500">Balance {money(row.balanceAfter)}</p>
          </div>
        </li>
      ))}
    </ul>
    </div>
  );
}
function TimelineList({ rows }: { rows: Customer360TimelineItem[] }) {
  if (!rows.length) return <Empty text="No activity in this period." />;
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Activity is the history. A product sale, a payment, a membership, a booking, and a wallet credit or debit each show their own details.
      </p>
      <ol className="space-y-3">
        {rows.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">{activityLabel(item.type)}</p>
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{whenStamp(item.createdAt || item.at, item.createdAt || item.at)}</p>
              </div>
              {item.amount ? <p className="shrink-0 text-sm font-bold text-slate-900">{money(item.amount)}</p> : null}
            </div>
            <ActivityFacts item={item} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function activityLabel(type: string) {
  if (type === "sale") return "Product sale";
  if (type === "payment") return "Payment";
  if (type === "wallet") return "Wallet";
  if (type === "membership") return "Membership";
  if (type === "booking") return "Booking";
  return "Activity";
}

function ActivityFacts({ item }: { item: Customer360TimelineItem }) {
  if (item.type === "sale") {
    return (
      <p className="mt-1 text-xs text-slate-600">
        Products: {item.products?.length ? item.products.join(", ") : "—"}
        {` · Discount ${money(item.discount)}`}
        {` · Paid ${money(item.paidAmount)} · Due ${money(item.dueAmount)}`}
      </p>
    );
  }
  if (item.type === "payment") {
    return (
      <p className="mt-1 text-xs text-slate-600">
        Payment activity{item.paymentMode ? ` · ${item.paymentMode}` : ""}
        {item.detail ? ` · ${item.detail}` : ""}
      </p>
    );
  }
  if (item.type === "wallet") {
    return (
      <p className="mt-1 text-xs text-slate-600">
        {item.credit ? `Credit ${money(item.credit)}` : `Debit ${money(item.debit)}`}
        {item.detail ? ` · ${item.detail}` : ""}
      </p>
    );
  }
  if (item.type === "membership") {
    return (
      <p className="mt-1 text-xs text-slate-600">
        {item.months ? `${item.months} months` : "Lifetime"}
        {item.detail ? ` · ${item.detail}` : ""}
      </p>
    );
  }
  return item.detail ? <p className="mt-1 text-xs text-slate-600">{item.detail}</p> : null;
}

function SaleDetail({ sale, onClose }: { sale: Customer360Purchase; onClose: () => void }) {
  const discounts = [
    ["Line and bill discount", sale.discountTotal],
    ["Membership discount", sale.membershipDiscount],
    ["Coupon", sale.couponDiscount],
    ["Referral", sale.referralDiscount],
    ["Manual discount", sale.manualDiscount],
  ].filter(([, amount]) => Number(amount) > 0);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">Shopping</p>
            <h3 className="text-lg font-bold text-slate-900">{sale.code || "Invoice"}</h3>
            <p className="text-xs text-slate-500">
              {whenStamp(sale.invoiceDate, sale.createdAt)}
              {monthOf(sale.invoiceDate) ? ` · ${monthOf(sale.invoiceDate)}` : ""}
              {sale.membershipType ? ` · ${sale.membershipType}` : ""}
            </p>
          </div>
          <button type="button" onClick={() => void closeIfConfirmed(onClose)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            Close
          </button>
        </div>

        <h4 className="mt-4 text-sm font-bold text-slate-900">Products</h4>
        <ul className="mt-2 divide-y divide-slate-100">
          {(sale.items || []).length === 0 ? <li className="py-2 text-sm text-slate-500">No products on this invoice.</li> : null}
          {(sale.items || []).map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-slate-800">{item.name || "Product"}</p>
                <p className="text-xs text-slate-500">Qty {item.qty} · {money(item.unitPrice)} · Discount {money(item.discount)}</p>
              </div>
              <p className="font-semibold text-slate-900">{money(item.lineTotal)}</p>
            </li>
          ))}
        </ul>

        <h4 className="mt-4 text-sm font-bold text-slate-900">Discount</h4>
        {discounts.length === 0 ? <p className="mt-1 text-sm text-slate-500">No discount</p> : (
          <ul className="mt-1 space-y-1 text-sm text-slate-600">
            {discounts.map(([label, amount]) => (
              <li key={String(label)} className="flex justify-between">
                <span>{label}</span>
                <span>{money(Number(amount))}</span>
              </li>
            ))}
          </ul>
        )}

        <h4 className="mt-4 text-sm font-bold text-slate-900">Payment summary</h4>
        <ul className="mt-1 space-y-1 text-sm text-slate-600">
          <li className="flex justify-between"><span>Subtotal</span><span>{money(sale.subTotal)}</span></li>
          <li className="flex justify-between"><span>Bill total</span><span>{money(sale.amount)}</span></li>
          <li className="flex justify-between"><span>Cash</span><span>{money(sale.payment?.cash)}</span></li>
          <li className="flex justify-between"><span>UPI</span><span>{money(sale.payment?.upi)}</span></li>
          <li className="flex justify-between"><span>Card</span><span>{money(sale.payment?.card)}</span></li>
          <li className="flex justify-between"><span>Wallet</span><span>{money(sale.payment?.wallet)}</span></li>
          <li className="flex justify-between font-semibold text-slate-900"><span>Paid</span><span>{money(sale.paidAmount)}</span></li>
          <li className="flex justify-between font-semibold text-slate-900"><span>Due</span><span>{money(sale.dueAmount)}</span></li>
        </ul>
        {(sale.paymentHistory || []).length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {sale.paymentHistory.map((payment, index) => (
              <li key={`${payment.date}-${index}`}>
                Payment · {whenStamp(payment.date)} · {payment.mode || "—"} · {money(payment.amount)}
                {payment.receivedBy ? ` · ${payment.receivedBy}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
