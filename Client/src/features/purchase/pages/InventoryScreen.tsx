import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  handleGetInventories,
  type InventorySummary,
  type InventoryItem,
} from "@/services/apiClient";
import { useNavigate } from "react-router-dom";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShoppingCart,
  Eye,
  Search,
  X,
  Calendar,
} from "lucide-react";

const initialSummary: InventorySummary = {
  lowStock: { items: 0, qty: 0 },
  positiveStock: { items: 0, qty: 0 },
  stockValueSalesPrice: 0,
  stockValuePurchasePrice: 0,
};

export default function InventoryScreen() {
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [summary, setSummary] = useState<InventorySummary>(initialSummary);
  const [data, setData] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const navigate = useNavigate();

  const fetchInventory = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await handleGetInventories(signal, { stock: stockFilter });
      setData(Array.isArray(response?.inventories) ? response.inventories : []);
      setSummary(response?.summary ?? initialSummary);
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
      setData([]);
      setSummary(initialSummary);
      setFetchError(error?.response?.data?.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [stockFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchInventory(controller.signal);
    return () => controller.abort();
  }, [fetchInventory]);

  const cards = [
    {
      title: "Low Stock",
      value: `${summary.lowStock.items} Items`,
      sub: `${summary.lowStock.qty} Qty`,
      boxClass: "bg-gradient-to-br from-rose-50 via-rose-50/40 to-white",
      borderClass: "border-2 border-rose-200/90 hover:border-rose-300",
      iconBg: "bg-rose-100 text-rose-600 border border-rose-200",
      titleColor: "text-rose-700",
      valueColor: "text-rose-950",
      subColor: "text-rose-600/80",
      icon: <AlertTriangle size={18} />,
    },
    {
      title: "Positive Stock",
      value: `${summary.positiveStock.items} Items`,
      sub: `${summary.positiveStock.qty} Qty`,
      boxClass: "bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-white",
      borderClass: "border-2 border-emerald-200/90 hover:border-emerald-300",
      iconBg: "bg-emerald-100 text-emerald-600 border border-emerald-200",
      titleColor: "text-emerald-700",
      valueColor: "text-emerald-950",
      subColor: "text-emerald-600/80",
      icon: <CheckCircle2 size={18} />,
    },
    {
      title: "Sales Value",
      value: `₹ ${Number(summary.stockValueSalesPrice ?? 0).toLocaleString("en-IN")}`,
      sub: "Selling Price",
      boxClass: "bg-gradient-to-br from-blue-50 via-blue-50/40 to-white",
      borderClass: "border-2 border-blue-200/90 hover:border-blue-300",
      iconBg: "bg-blue-100 text-blue-600 border border-blue-200",
      titleColor: "text-blue-700",
      valueColor: "text-blue-950",
      subColor: "text-blue-600/80",
      icon: <TrendingUp size={18} />,
    },
    {
      title: "Cost Value",
      value: `₹ ${Number(summary.stockValuePurchasePrice ?? 0).toLocaleString("en-IN")}`,
      sub: "Purchase Price",
      boxClass: "bg-gradient-to-br from-amber-50 via-amber-50/40 to-white",
      borderClass: "border-2 border-amber-200/90 hover:border-amber-300",
      iconBg: "bg-amber-100 text-amber-600 border border-amber-200",
      titleColor: "text-amber-700",
      valueColor: "text-amber-950",
      subColor: "text-amber-600/80",
      icon: <ShoppingCart size={18} />,
    },
  ];

  const getItemTheme = (item: InventoryItem, index: number) => {
    if (item.isLowStock) {
      return {
        cardBox: "bg-gradient-to-br from-rose-50/90 via-white to-rose-50/30",
        cardBorder: "border-2 border-rose-300/90 hover:border-rose-400 shadow-rose-100/50",
        avatarBg: "bg-rose-100 text-rose-700 border border-rose-200",
        badgeBg: "bg-rose-100 text-rose-800 border border-rose-300",
        dotBg: "bg-rose-500",
        idPill: "bg-rose-100/80 text-rose-700 border border-rose-200/60",
        qtyColor: "text-rose-700",
      };
    }

    const themes = [
      {
        cardBox: "bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30",
        cardBorder: "border-2 border-emerald-200/90 hover:border-emerald-300 shadow-emerald-100/40",
        avatarBg: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        badgeBg: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        dotBg: "bg-emerald-500",
        idPill: "bg-emerald-100/70 text-emerald-700 border border-emerald-200/60",
        qtyColor: "text-emerald-700",
      },
      {
        cardBox: "bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/30",
        cardBorder: "border-2 border-blue-200/90 hover:border-blue-300 shadow-blue-100/40",
        avatarBg: "bg-blue-100 text-blue-700 border border-blue-200",
        badgeBg: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        dotBg: "bg-emerald-500",
        idPill: "bg-blue-100/70 text-blue-700 border border-blue-200/60",
        qtyColor: "text-blue-700",
      },
      {
        cardBox: "bg-gradient-to-br from-purple-50/70 via-white to-fuchsia-50/30",
        cardBorder: "border-2 border-purple-200/90 hover:border-purple-300 shadow-purple-100/40",
        avatarBg: "bg-purple-100 text-purple-700 border border-purple-200",
        badgeBg: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        dotBg: "bg-emerald-500",
        idPill: "bg-purple-100/70 text-purple-700 border border-purple-200/60",
        qtyColor: "text-purple-700",
      },
      {
        cardBox: "bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30",
        cardBorder: "border-2 border-amber-200/90 hover:border-amber-300 shadow-amber-100/40",
        avatarBg: "bg-amber-100 text-amber-700 border border-amber-200",
        badgeBg: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        dotBg: "bg-emerald-500",
        idPill: "bg-amber-100/70 text-amber-700 border border-amber-200/60",
        qtyColor: "text-amber-700",
      },
    ];

    return themes[index % themes.length];
  };

  const filteredMobileData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().trim();
    return data.filter((item) => {
      return (
        String(item.item || "").toLowerCase().includes(term) ||
        String(item.id || "").toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 90,
        Cell: ({ cell }: { cell: any }) => (
          <span className="rounded-md border border-indigo-200/80 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">
            #{cell.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "item",
        header: "Item",
        Cell: ({ cell }: { cell: any }) => (
          <span className="font-bold text-slate-900">{cell.getValue()}</span>
        ),
      },
      {
        accessorKey: "qty",
        header: "Qty",
        Cell: ({ row }: { row: any }) => {
          const isLowStock = row.original.isLowStock === true;
          return (
            <span
              className={`font-bold ${
                isLowStock ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              {row.original.qty} Units
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ row }: { row: any }) => {
          const isLowStock = row.original.isLowStock === true;
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
                isLowStock
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLowStock ? "bg-rose-500" : "bg-emerald-500"
                }`}
              />
              {isLowStock ? "Low Stock" : "In Stock"}
            </span>
          );
        },
      },
      {
        accessorKey: "purchase_price",
        header: "Purchase Price",
        Cell: ({ cell }: { cell: any }) => (
          <span className="rounded-md border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {cell.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "sale_price",
        header: "Sale Price",
        Cell: ({ cell }: { cell: any }) => (
          <span className="rounded-md border border-blue-200/70 bg-blue-50/70 px-2 py-0.5 text-xs font-semibold text-blue-800">
            {cell.getValue()}
          </span>
        ),
      },
      { accessorKey: "last_updated", header: "Last Updated" },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredMobileData,
    state: { isLoading: loading },
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "2px solid #e0e7ff",
        borderRadius: "16px",
        overflow: "hidden",
      },
    },
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => setSelectedItem(row.original),
      sx: { cursor: "pointer" },
    }),
  });

  return (
    <div className="min-w-0 p-1 sm:p-6 max-w-7xl mx-auto space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
          Inventory List
        </h1>
        <button
          type="button"
            role="switch"
            aria-checked={stockFilter === "low"}
          onClick={() => setStockFilter((current) => (current === "low" ? "all" : "low"))}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer ${
            stockFilter === "low"
              ? "bg-rose-600 text-white shadow-rose-200 hover:bg-rose-700"
              : "bg-rose-50 text-rose-700 border-2 border-rose-200 hover:bg-rose-100"
          }`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 sm:text-sm"
        >
          <AlertTriangle size={15} />
          <span>Low Stock</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Inventory List
          </h1>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={stockFilter === "low"}
          onClick={() => setStockFilter((current) => (current === "low" ? "all" : "low"))}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 sm:text-sm"
        >
          <span>Low Stock</span>
          <span
            className={`relative h-5 w-9 shrink-0 rounded-full transition ${
              stockFilter === "low" ? "bg-rose-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                stockFilter === "low" ? "left-4" : "left-0.5"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                  stockFilter === "low" ? "left-4" : "left-0.5"
                }`}
              />
            </span>
          {summary.lowStock.items > 0 && (
            <span
              className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                stockFilter === "low"
                  ? "bg-white/20 text-white"
                  : "bg-rose-200/80 text-rose-800"
              }`}
            >
              {summary.lowStock.items}
            </span>
          )}
        </button>
            />
          </span>
        </button>
       
         
        
        
      </div>

      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* Stats Cards: 2-2 in a row on mobile, 4 in a row on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {cards.map((item, index) => (
          <div
            key={index}
            className={`rounded-2xl p-3 sm:p-4 shadow-xs transition duration-200 hover:shadow-sm ${item.boxClass} ${item.borderClass}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate mr-1 ${item.titleColor}`}>
                {item.title}
              </span>
              <div className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl shadow-2xs ${item.iconBg}`}>
                {item.icon}
              </div>
            </div>

            <div className={`text-base sm:text-lg font-extrabold tracking-tight truncate ${item.valueColor}`}>
              {item.value}
            </div>
            <div className={`text-[10px] sm:text-[11px] font-semibold mt-0.5 truncate ${item.subColor}`}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Card Form View (block md:hidden) */}
      <div className="block md:hidden space-y-3">
        {/* Mobile Search Input */}
        <div className="relative rounded-2xl border-2 border-indigo-200/90 bg-gradient-to-r from-blue-50/30 via-white to-indigo-50/30 p-1 shadow-2xs transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
          <div className="relative flex items-center">
            <Search
              className="absolute left-3 text-indigo-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search item name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent pl-9 pr-8 py-2 text-xs sm:text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/70 text-slate-500 hover:bg-slate-300 transition"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Cards List */}
        <div className="space-y-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border-2 border-slate-200/80 bg-slate-50 p-3.5"
              />
            ))
          ) : filteredMobileData.length > 0 ? (
            filteredMobileData.map((item, index) => {
              const qty = Number(item.qty ?? 0);
              const isLowStock = item.isLowStock === true;
              const theme = getItemTheme(item, index);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`cursor-pointer rounded-2xl p-3.5 shadow-xs transition hover:shadow-sm active:scale-[0.99] ${theme.cardBox} ${theme.cardBorder}`}
                >
                  {/* Card Top Section */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs ${theme.avatarBg}`}>
                        <Package size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm sm:text-base font-bold text-slate-900">
                          {item.item}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-block rounded-md px-1.5 py-0.2 font-mono font-bold text-[10px] ${theme.idPill}`}>
                            #{item.id}
                          </span>
                          {item.last_updated && (
                            <span className="text-[10px] text-slate-400 truncate flex items-center gap-0.5">
                              <Calendar size={10} />
                              {item.last_updated}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Badge & Qty */}
                    <div className="flex shrink-0 flex-col items-end">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${theme.badgeBg}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${theme.dotBg}`} />
                        {isLowStock ? "Low Stock" : "In Stock"}
                      </span>

                      <div className="mt-1 text-right">
                        <span className={`text-base font-extrabold ${theme.qtyColor}`}>
                          {qty} Units
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Boxes */}
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/50 pt-2.5 text-xs">
                    <div className="rounded-xl border border-blue-200/70 bg-blue-50/70 px-2.5 py-1.5">
                      <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                        Sale Price
                      </span>
                      <span className="font-extrabold text-slate-900 truncate block">
                        {item.sale_price}
                      </span>
                    </div>
                    <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 px-2.5 py-1.5">
                      <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                        Cost Price
                      </span>
                      <span className="font-extrabold text-slate-900 truncate block">
                        {item.purchase_price}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Section */}
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      {item.lowStockAlertLevel != null && (
                        <span className="rounded-md border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Alert Level: {item.lowStockAlertLevel}
                        </span>
                      )}
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200/80 bg-indigo-50/80 px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-100 transition active:scale-95"
                        title="View Details"
                        aria-label="View Details"
                      >
                        <Eye size={13} />
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-indigo-200/80 bg-gradient-to-b from-indigo-50/30 via-white to-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100/70 text-indigo-600">
                <Package size={24} />
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-800">
                No inventory items found
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Try searching with another name or ID.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View (hidden md:block) */}
      <div className="hidden md:block">
        <MaterialReactTable table={table} />
      </div>

      {/* Inventory Item Details Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border-2 border-indigo-100/80 max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-white to-blue-50/40 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-100/80 text-blue-700 shadow-2xs">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Inventory Item Details
                  </h3>
                  <p className="text-xs font-semibold text-indigo-600">ID #{selectedItem.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Item Card */}
              <div
                className={`rounded-2xl border-2 p-4 ${
                  selectedItem.isLowStock
                    ? "border-rose-200 bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30"
                    : "border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Item Name
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                      {selectedItem.item}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border ${
                      selectedItem.isLowStock
                        ? "border-rose-300 bg-rose-100 text-rose-800"
                        : "border-emerald-300 bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {selectedItem.isLowStock ? "Low Stock" : "In Stock"}
                  </span>
                </div>

                {/* Metric Tiles */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div
                    className={`rounded-xl p-2.5 border-2 shadow-2xs ${
                      selectedItem.isLowStock
                        ? "border-rose-200/80 bg-rose-50/60"
                        : "border-emerald-200/80 bg-emerald-50/60"
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-slate-500 block">
                      Quantity
                    </span>
                    <span
                      className={`text-base font-extrabold ${
                        selectedItem.isLowStock
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {selectedItem.qty}
                    </span>
                    {selectedItem.lowStockAlertLevel != null ? (
                      <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">
                        Alert at {selectedItem.lowStockAlertLevel}
                      </span>
                    ) : null}
                  </div>
                  <div className="rounded-xl bg-blue-50/60 p-2.5 border-2 border-blue-200/80 shadow-2xs">
                    <span className="text-[10px] font-semibold text-blue-600 block">
                      Sale Price
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {selectedItem.sale_price}
                    </span>
                  </div>
                  <div className="rounded-xl bg-amber-50/60 p-2.5 border-2 border-amber-200/80 shadow-2xs">
                    <span className="text-[10px] font-semibold text-amber-600 block">
                      Cost Price
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {selectedItem.purchase_price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="rounded-2xl border-2 border-indigo-100/90 bg-gradient-to-br from-indigo-50/30 via-white to-slate-50/30 p-4 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Stock Information
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Item Identifier</span>
                    <span className="font-bold text-slate-800">
                      ID #{selectedItem.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Stock Status</span>
                    <span className={`font-bold ${
                      Number(selectedItem.qty ?? 0) <= 0 ? "text-rose-600" : "text-emerald-700"
                    }`}>
                      {Number(selectedItem.qty ?? 0) <= 0
                        ? "Low Stock (Reorder)"
                        : "Available In Stock"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-medium">Last Updated</span>
                    <span className="font-semibold text-slate-800">
                      {selectedItem.last_updated || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-4">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-98 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
