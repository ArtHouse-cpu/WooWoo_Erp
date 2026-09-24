import { useEffect, useMemo, useState } from "react";
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
import { handleGetStaffCommission ,handleGetSubscriptions} from "@/services/apiClient";
import SetCommissionRuleModal from "./Modal/SetCommissionRuleModal";

const StaffCommissionScreen = () => {
  const [data, setData] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState<string>(
    () => rangeForPreset("month").from
  );
  const [toDate, setToDate] = useState<string>(
    () => rangeForPreset("month").to
  );
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);

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
    const subscriptions = Array.isArray(subscriptionRes?.subscriptions)
      ? subscriptionRes.subscriptions
      : [];

    setSubscriptions(subscriptions);

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

  const topEarner = useMemo(() => {
    if (!filteredData.length) return null;
    const sorted = [...filteredData].sort(
      (a, b) => b.commission - a.commission,
    );
    return sorted[0].commission > 0 ? sorted[0] : null;
  }, [filteredData]);

  const totalCommission = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.commission || 0), 0);
  }, [filteredData]);

  const totalSales = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.totalSales || 0), 0);
  }, [filteredData]);

  const totalOrders = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.totalOrders || 0), 0);
  }, [filteredData]);

  const netSalesGrandTotal = useMemo(() => {
    return subscriptions.reduce((sum, sub) => sum + ((sub.grandTotal) ||  0), 0);
  }, [subscriptions]);

  // console.log("net",netSalesGrandTotal)

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
              <p className="text-xs text-gray-400">{row.original.email}</p>
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
      // {
      //   accessorKey: "rate",
      //   header: "Rate %",
      //   Cell: ({ cell }) => (
      //     <span className="text-sm text-indigo-700 font-semibold">
      //       {cell.getValue<number>()}%
      //     </span>
      //   ),
      // },
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
    [topEarner],
  );

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <CircleDollarSign className="text-indigo-600" size={28} />
            Staff Commission & Performance
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-blue-300 text-sm text-gray-700 hover:text-blue-600 font-medium cursor-pointer transition-all duration-200 shadow-sm" 
            onClick={() => setIsCommissionModalOpen(true)}>
      
            <Calendar size={15} className="text-blue-500 shrink-0" />
            <span>Set Commission</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200/80 text-xs">
            <Calendar size={14} className="text-gray-400 shrink-0" />
            <span className="text-gray-500 font-medium">Period:</span>
            <select
              value={datePreset}
              onChange={(e) => {
                const preset = e.target.value as DatePreset;
                setDatePreset(preset);
                if (preset === "all") {
                  setFromDate("");
                  setToDate("");
                } else if (preset === "custom") {
                  // keep current custom dates
                } else {
                  const range = rangeForPreset(preset);
                  setFromDate(range.from);
                  setToDate(range.to);
                }
              }}
              className="text-xs font-semibold text-gray-800 bg-transparent outline-none cursor-pointer pr-1"
            >
              {DATE_PRESET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200/80 text-xs">
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-gray-700 outline-none text-xs"
              />
              <span className="text-gray-400 font-medium">to</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-gray-700 outline-none text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">
              Total Commission
            </p>
            <Award className="text-amber-500" size={18} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            ₹{totalCommission.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Total Sales</p>
            <TrendingUp className="text-emerald-500" size={18} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            ₹{totalSales.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium bg-gray-50 inline-block px-2 py-0.5 rounded">
            Net Sales: <span className="text-gray-700 font-semibold">₹{netSalesGrandTotal.toLocaleString("en-IN")}</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Total Orders</p>
            <Receipt className="text-indigo-500" size={18} />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Top Earner</p>
            <Sparkles className="text-purple-500" size={18} />
          </div>
          <p className="mt-2 text-lg font-bold text-gray-900 truncate">
            {topEarner?.staffName || "—"}
          </p>
          {topEarner && (
            <p className="text-xs text-gray-500 mt-0.5">
              ₹{topEarner.commission.toLocaleString("en-IN")}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <MaterialReactTable table={table} />
      </div>

      <CommissionLedgerModal
        isOpen={!!selectedStaff}
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
      />
      <SetCommissionRuleModal
      isOpen={isCommissionModalOpen}
      onClose={() => setIsCommissionModalOpen(false)}
      />
    </div>
  );
};

export default StaffCommissionScreen;
