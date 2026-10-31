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
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const navigate = useNavigate();

  const fetchInventory = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await handleGetInventories(signal);
      setData(Array.isArray(response?.inventories) ? response.inventories : []);
      setSummary(response?.summary ?? initialSummary);
    } catch (error: any) {
      setData([]);
      setSummary(initialSummary);
      setFetchError(error?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

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
      bgColor: "#fef8f8",
      borderColor: "border-rose-100",
      textColor: "text-rose-700",
      icon: <AlertTriangle className="text-rose-600" size={18} />,
    },
    {
      title: "Positive Stock",
      value: `${summary.positiveStock.items} Items`,
      sub: `${summary.positiveStock.qty} Qty`,
      bgColor: "#e6f3ee",
      borderColor: "border-emerald-100",
      textColor: "text-emerald-700",
      icon: <CheckCircle2 className="text-emerald-600" size={18} />,
    },
    {
      title: "Sales Value",
      value: `₹ ${Number(summary.stockValueSalesPrice ?? 0).toLocaleString("en-IN")}`,
      sub: "Selling Price",
      bgColor: "#e5f2ff",
      borderColor: "border-blue-100",
      textColor: "text-blue-700",
      icon: <TrendingUp className="text-blue-600" size={18} />,
    },
    {
      title: "Cost Value",
      value: `₹ ${Number(summary.stockValuePurchasePrice ?? 0).toLocaleString("en-IN")}`,
      sub: "Purchase Price",
      bgColor: "#fdf0e6",
      borderColor: "border-amber-100",
      textColor: "text-amber-700",
      icon: <ShoppingCart className="text-amber-600" size={18} />,
    },
  ];

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
      { accessorKey: "id", header: "ID", size: 90 },
      { accessorKey: "item", header: "Item" },
      { accessorKey: "qty", header: "Qty" },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ row }: { row: any }) => {
          const qty = Number(row.original.qty ?? 0);
          const isLowStock = qty <= 0;
          return (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isLowStock
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isLowStock ? "Low Stock" : "In Stock"}
            </span>
          );
        },
      },
      { accessorKey: "purchase_price", header: "Purchase Price" },
      { accessorKey: "sale_price", header: "Sale Price" },
      { accessorKey: "last_updated", header: "Last Updated" },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data,
    state: { isLoading: loading },
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Inventory List
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Qty updates from purchases (in) and sales / returns (out). Add stock
            by creating a purchase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="self-start rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          Back
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
            className="rounded-2xl border p-3 sm:p-4 shadow-xs transition duration-200 hover:shadow-sm"
            style={{
              backgroundColor: item.bgColor,
              borderColor: "rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 truncate mr-1">
                {item.title}
              </span>
              <div className="shrink-0">{item.icon}</div>
            </div>

            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              {item.value}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 truncate">
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Card Form View (block md:hidden) */}
      <div className="block md:hidden space-y-3">
        {/* Mobile Search Input */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search item name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* Mobile Cards List */}
        <div className="space-y-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5"
              />
            ))
          ) : filteredMobileData.length > 0 ? (
            filteredMobileData.map((item) => {
              const qty = Number(item.qty ?? 0);
              const isLowStock = qty <= 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                >
                  {/* Card Top Section */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Item Name */}
                      <h3 className="truncate text-base font-bold text-slate-900">
                        {item.item}
                      </h3>
                      {/* Item ID */}
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        <span className="font-semibold text-blue-600">
                          ID #{item.id}
                        </span>
                      </div>
                    </div>

                    {/* Right: Status Badge & Qty */}
                    <div className="flex shrink-0 flex-col items-end">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isLowStock
                            ? "border border-rose-200 bg-rose-50 text-rose-700"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isLowStock ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        />
                        {isLowStock ? "Low Stock" : "In Stock"}
                      </span>

                      <div className="mt-1 text-right">
                        <span className="text-base font-bold text-slate-900">
                          {qty} Units
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subtle Divider */}
                  <div className="my-2.5 border-t border-slate-100" />

                  {/* Card Bottom Section */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex min-w-0 items-center gap-2 truncate">
                      <span className="truncate">
                        Sale:{" "}
                        <strong className="text-slate-800">
                          {item.sale_price}
                        </strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="truncate">
                        Cost:{" "}
                        <strong className="text-slate-800">
                          {item.purchase_price}
                        </strong>
                      </span>
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                        title="View Details"
                        aria-label="View Details"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <Package size={24} />
              </div>
              <h4 className="mt-3 text-sm font-semibold text-slate-800">
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
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Inventory Item Details
                  </h3>
                  <p className="text-xs text-slate-400">ID #{selectedItem.id}</p>
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
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
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
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      Number(selectedItem.qty ?? 0) <= 0
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {Number(selectedItem.qty ?? 0) <= 0
                      ? "Low Stock"
                      : "In Stock"}
                  </span>
                </div>

                {/* Metric Tiles */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Quantity
                    </span>
                    <span
                      className={`text-base font-extrabold ${
                        Number(selectedItem.qty ?? 0) <= 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {selectedItem.qty}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Sale Price
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {selectedItem.sale_price}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Cost Price
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {selectedItem.purchase_price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Stock Information
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Item Identifier</span>
                    <span className="font-semibold text-slate-800">
                      ID #{selectedItem.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Stock Status</span>
                    <span className="font-semibold text-slate-800">
                      {Number(selectedItem.qty ?? 0) <= 0
                        ? "Low Stock (Reorder)"
                        : "Available In Stock"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Last Updated</span>
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
                className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-98"
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
