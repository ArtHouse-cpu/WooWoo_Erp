
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";

import {
  Eye,
  Award,
  CircleDollarSign,
  TrendingUp,
  Sparkles,
  Receipt,
  Calendar,
  Search,
  Phone,
  Mail,
  User,
  Check,
  ChevronDown,
} from "lucide-react";

import CommissionLedgerModal, {
  type Staff,
  parseInvoiceDate,
} from "./Modal/CommissionLedgerModal";

import {
  type DatePreset,
  DATE_PRESET_OPTIONS,
  rangeForPreset,
} from "../../utils/datePresets";

import { usePersistedDateFilter } from "@/utils/rememberDateFilter";

import {
  handleGetStaffCommission,
  handleGetSubscriptions,
} from "@/services/apiClient";

import SetCommissionRuleModal from "./Modal/SetCommissionRuleModal";

const StaffCommissionScreen = () => {
  const [data, setData] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);

  // Date Filter
  const {
    datePreset,
    setDatePreset,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
  } = usePersistedDateFilter(
    "staff-commission",
    "month",
    DATE_PRESET_OPTIONS.map((opt) => opt.value),
    rangeForPreset
  );

  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDateDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDateDropdown]);

  const dateFilterLabel = useMemo(() => {
    const opt = DATE_PRESET_OPTIONS.find((o) => o.value === datePreset);
    return opt ? opt.label : "This Month";
  }, [datePreset]);

  // Fetch Commission and Subscription Data
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [commissionRes, subscriptionRes] = await Promise.all([
          handleGetStaffCommission(
            fromDate,
            toDate,
            controller.signal
          ),
          handleGetSubscriptions(
            "",
            5000,
            controller.signal,
            1,
            fromDate,
            toDate
          ),
        ]);

        // Staff Commission
        const rawList = Array.isArray(commissionRes?.data)
          ? commissionRes.data
          : [];

        const normalized = rawList.map((staff: any) => ({
          ...staff,
          invoices: Array.isArray(staff.invoices)
            ? [...staff.invoices].sort(
                (a, b) =>
                  parseInvoiceDate(b.date, b.rawDate) -
                  parseInvoiceDate(a.date, a.rawDate)
              )
            : [],
        }));

        setData(normalized);

        // Subscriptions
        const subscriptionList = Array.isArray(
          subscriptionRes?.subscriptions
        )
          ? subscriptionRes.subscriptions
          : [];

        setSubscriptions(subscriptionList);

      } catch (err: any) {
        if (
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }

        console.error(err);

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load data"
        );

        setData([]);
        setSubscriptions([]);

      } finally {
        setLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [fromDate, toDate]);

  const filteredData = data;

  const [mobileSearch, setMobileSearch] = useState("");
  const mobileFilteredData = useMemo(() => {
    if (!mobileSearch.trim()) return filteredData;
    const q = mobileSearch.toLowerCase();
    return filteredData.filter(
      (s) =>
        s.staffName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
    );
  }, [filteredData, mobileSearch]);

  // Top Earner
  const topEarner = useMemo(() => {
    if (!filteredData.length) return null;

    const sorted = [...filteredData].sort(
      (a, b) => b.commission - a.commission
    );

    return sorted[0].commission > 0 ? sorted[0] : null;
  }, [filteredData]);

  // Total Commission
  const totalCommission = useMemo(() => {
    return filteredData.reduce(
      (sum, item) => sum + (item.commission || 0),
      0
    );
  }, [filteredData]);

  // Total Sales
  const totalSales = useMemo(() => {
    return filteredData.reduce(
      (sum, item) => sum + (item.totalSales || 0),
      0
    );
  }, [filteredData]);

  // Total Orders
  const totalOrders = useMemo(() => {
    return filteredData.reduce(
      (sum, item) => sum + (item.totalOrders || 0),
      0
    );
  }, [filteredData]);

  // Net Sales
  const netSalesGrandTotal = useMemo(() => {
    return subscriptions.reduce(
      (sum, sub) => sum + (sub.grandTotal || 0),
      0
    );
  }, [subscriptions]);

  // Table Columns
  const columns = useMemo<MRT_ColumnDef<Staff>[]>(
    () => [
      {
        accessorKey: "staffName",
        header: "Staff Name",
        Cell: ({ row }) => {
          const isTop = topEarner?.id === row.original.id;

          return (
            <div className="py-1">
              <p className="font-semibold text-gray-900 flex items-center gap-1.5 text-sm">
                {row.original.staffName}

                {isTop && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                    ★ Top
                  </span>
                )}
              </p>

              <p className="text-xs text-gray-400">
                {row.original.email}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "phone",
        header: "Phone",
        Cell: ({ cell }) => (
          <span className="text-sm text-gray-700">
            {cell.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "totalOrders",
        header: "Orders",
        Cell: ({ cell }) => (
          <span className="text-sm font-medium text-gray-800">
            {cell.getValue<number>()}
          </span>
        ),
      },
      {
        accessorKey: "totalSales",
        header: "Total Sales",
        Cell: ({ cell }) => (
          <span className="text-sm font-semibold text-gray-900">
            ₹{(cell.getValue<number>() || 0).toLocaleString("en-IN")}
          </span>
        ),
      },
      {
        accessorKey: "commission",
        header: "Commission",
        Cell: ({ cell }) => (
          <span className="text-sm font-bold text-emerald-700">
            ₹{(cell.getValue<number>() || 0).toLocaleString("en-IN")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Ledger",
        Cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelectedStaff(row.original)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition"
          >
            <Eye size={14} />
            View
          </button>
        ),
      },
    ],
    [topEarner]
  );

  // Material React Table
  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    enableSorting: true,
    enablePagination: true,
    enableColumnFilters: true,
    state: { isLoading: loading },
    initialState: {
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    },
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 font-sans bg-gray-50/50 min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">

        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <CircleDollarSign
              className="w-5 h-5 sm:w-7 sm:h-7 text-violet-600 shrink-0"
            />
            <span>Staff Commission &amp; Performance</span>
          </h1>
        </div>

        {/* ACTION BUTTONS AND DATE FILTER */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">

          {/* 50-50 RATIO ON MOBILE ROW, AUTO ON DESKTOP */}
          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:items-center sm:w-auto">

            {/* SET COMMISSION (50% ON MOBILE) */}
            <button
              type="button"
              onClick={() => setIsCommissionModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-white font-semibold cursor-pointer transition-all duration-200 shadow-sm active:scale-95"
            >
              <Calendar size={14} className="text-white shrink-0" />
              <span className="whitespace-nowrap">
                Set Commission
              </span>
            </button>

            {/* PERIOD FILTER DROPDOWN (50% ON MOBILE) */}
            <div className="relative w-full sm:w-auto" ref={dateMenuRef}>
              <button
                type="button"
                onClick={() => setShowDateDropdown((prev) => !prev)}
                className="w-full sm:w-auto inline-flex items-center justify-between gap-1.5 bg-white px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-800 shadow-sm hover:border-gray-300 transition-colors cursor-pointer active:scale-95"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <Calendar size={14} className="text-indigo-500 shrink-0" />
                  <span className="truncate">{dateFilterLabel}</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 shrink-0 transition-transform duration-200 ${
                    showDateDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* DROPDOWN MENU */}
              {showDateDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-48 sm:w-44 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                  {DATE_PRESET_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const preset = opt.value;
                        setDatePreset(preset);

                        if (preset === "all") {
                          setFromDate("");
                          setToDate("");
                        } else if (preset === "custom") {
                          // Keep current custom dates
                        } else {
                          const range = rangeForPreset(preset);
                          setFromDate(range.from);
                          setToDate(range.to);
                        }
                        if (preset !== "custom") setShowDateDropdown(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        datePreset === opt.value
                          ? "bg-indigo-50 font-bold text-indigo-700"
                          : "font-medium text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {datePreset === opt.value && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                      )}
                    </button>
                  ))}

                  {datePreset === "custom" && (
                    <div className="mt-1 space-y-2 border-t border-gray-100 px-3 py-2 bg-gray-50/60 rounded-b-xl">
                      <label className="block text-[11px] font-semibold text-gray-500">
                        From
                        <input
                          type="date"
                          value={fromDate}
                          max={toDate || undefined}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-indigo-400"
                        />
                      </label>
                      <label className="block text-[11px] font-semibold text-gray-500">
                        To
                        <input
                          type="date"
                          value={toDate}
                          min={fromDate || undefined}
                          onChange={(e) => setToDate(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-indigo-400"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CUSTOM DATE RANGE (WHEN CLOSED & SELECTED) */}
          {datePreset === "custom" && !showDateDropdown && (
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs shadow-sm w-full sm:w-auto">

              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-gray-700 outline-none text-xs flex-1 sm:flex-none min-w-0"
              />

              <span className="text-gray-400 font-medium shrink-0">
                to
              </span>

              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-gray-700 outline-none text-xs flex-1 sm:flex-none min-w-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">

        {/* TOTAL COMMISSION */}
        <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">

          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] sm:text-xs font-semibold text-blue-700 truncate">
              Total Commission
            </p>

            <div className="rounded-lg bg-blue-100 p-1.5 shrink-0">
              <Award size={15} className="text-blue-600" />
            </div>
          </div>

          <p className="mt-2 text-sm sm:text-2xl font-extrabold text-blue-950 truncate">
            ₹{totalCommission.toLocaleString("en-IN")}
          </p>

          <div className="absolute -bottom-7 -right-5 h-20 w-20 rounded-full bg-blue-200/40 pointer-events-none" />
        </div>

        {/* TOTAL SALES */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-green-100 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">

          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] sm:text-xs font-semibold text-emerald-700 truncate">
              Total Sales
            </p>

            <div className="rounded-lg bg-emerald-100 p-1.5 shrink-0">
              <TrendingUp size={15} className="text-emerald-600" />
            </div>
          </div>

          <p className="mt-2 text-sm sm:text-2xl font-extrabold text-emerald-950 truncate">
            ₹{totalSales.toLocaleString("en-IN")}
          </p>

          <p className="mt-1 inline-flex rounded-md bg-emerald-100/80 px-1.5 py-1 text-[9px] sm:text-xs font-medium text-emerald-800 max-w-full truncate">
            Net Sales:
            <span className="ml-1 font-bold">
              ₹{netSalesGrandTotal.toLocaleString("en-IN")}
            </span>
          </p>

          <div className="absolute -bottom-7 -right-5 h-20 w-20 rounded-full bg-emerald-200/40 pointer-events-none" />
        </div>

        {/* TOTAL ORDERS */}
        <div className="relative overflow-hidden rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">

          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] sm:text-xs font-semibold text-orange-700 truncate">
              Total Orders
            </p>

            <div className="rounded-lg bg-orange-100 p-1.5 shrink-0">
              <Receipt size={15} className="text-orange-600" />
            </div>
          </div>

          <p className="mt-2 text-sm sm:text-2xl font-extrabold text-orange-950">
            {totalOrders}
          </p>

          <div className="absolute -bottom-7 -right-5 h-20 w-20 rounded-full bg-orange-200/40 pointer-events-none" />
        </div>

        {/* TOP EARNER */}
        <div className="relative overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-violet-100 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">

          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] sm:text-xs font-semibold text-purple-700 truncate">
              Top Earner
            </p>

            <div className="rounded-lg bg-purple-100 p-1.5 shrink-0">
              <Sparkles size={15} className="text-purple-600" />
            </div>
          </div>

          <p className="mt-2 text-xs sm:text-xl font-extrabold text-purple-950 truncate">
            {topEarner?.staffName || "—"}
          </p>

          {topEarner && (
            <p className="mt-1 inline-flex rounded-md bg-purple-100 px-2 py-1 text-[10px] sm:text-xs font-bold text-purple-800">
              ₹{topEarner.commission.toLocaleString("en-IN")}
            </p>
          )}

          <div className="absolute -bottom-7 -right-5 h-20 w-20 rounded-full bg-purple-200/40 pointer-events-none" />
        </div>

      </div>

      {/* MOBILE STAFF COMMISSION CARDS */}
      <div className="block md:hidden space-y-3">
        {/* Mobile Search & Count Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              placeholder="Search staff by name or phone..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>
          <span className="text-xs font-semibold text-gray-500 shrink-0 bg-white px-2.5 py-2 rounded-xl border border-gray-200 shadow-2xs">
            {mobileFilteredData.length} Staff
          </span>
        </div>

        {/* Card List */}
        {loading && !filteredData.length ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-400 shadow-2xs">
            Loading staff commission records...
          </div>
        ) : mobileFilteredData.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-400 shadow-2xs">
            No staff records match your criteria.
          </div>
        ) : (
          mobileFilteredData.map((staff) => {
            const isTop = topEarner?.id === staff.id;
            return (
              <div
                key={staff.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-3 transition hover:shadow-xs"
              >
                {/* Staff Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-sm shadow-xs">
                      {staff.staffName?.charAt(0)?.toUpperCase() || "S"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {staff.staffName}
                        </span>
                        {isTop && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200/80 inline-flex items-center">
                            ★ Top
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {staff.email || "No email"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStaff(staff)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 hover:bg-indigo-100 active:scale-95 transition shrink-0 cursor-pointer"
                  >
                    <Eye size={13} />
                    Ledger
                  </button>
                </div>

                {/* Phone contact */}
                {staff.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50/80 px-2.5 py-1.5 rounded-xl">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-700">{staff.phone}</span>
                  </div>
                )}

                {/* Performance Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                  <div className="rounded-xl bg-slate-50/90 border border-slate-100/90 p-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Orders
                    </p>
                    <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-800">
                      {staff.totalOrders || 0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50/60 border border-blue-100/70 p-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      Total Sales
                    </p>
                    <p className="mt-0.5 text-xs sm:text-sm font-bold text-blue-900 truncate">
                      ₹{(staff.totalSales || 0).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-100/80 p-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      Commission
                    </p>
                    <p className="mt-0.5 text-xs sm:text-sm font-black text-emerald-700 truncate">
                      ₹{(staff.commission || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP STAFF COMMISSION TABLE */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <MaterialReactTable table={table} />
      </div>

      {/* COMMISSION LEDGER MODAL */}
      <CommissionLedgerModal
        isOpen={!!selectedStaff}
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
      />

      {/* SET COMMISSION MODAL */}
      <SetCommissionRuleModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
      />

    </div>
  );
};

export default StaffCommissionScreen;
