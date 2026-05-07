import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { CircleMinus, CirclePlus } from "lucide-react";
import StockInModal from "@/features/purchase/components/StockInModal";
import StockOutModal from "@/features/purchase/components/StockOutModal";
import { handleGetInventories, type InventorySummary } from "@/services/apiClient";
import { useNavigate } from "react-router-dom";

const initialSummary: InventorySummary = {
  lowStock: { items: 0, qty: 0 },
  positiveStock: { items: 0, qty: 0 },
  stockValueSalesPrice: 0,
  stockValuePurchasePrice: 0,
};
export default function InventoryScreen() {
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [summary, setSummary] = useState<InventorySummary>(initialSummary);
  const [data, setData] = useState<any[]>([]);
  const navigate=useNavigate()

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
      setFetchError(error?.response?.data?.message );
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
      value: `${summary.lowStock.items} Items (${summary.lowStock.qty} Qty)`,
      bgColor: "#fef8f8",
    },
    {
      title: "Positive Stock",
      value: `${summary.positiveStock.items} Items (${summary.positiveStock.qty} Qty)`,
      bgColor: "#e6f3ee",
    },
    {
      title: "Stock Value Sales Price",
      value: `₹ ${Number(summary.stockValueSalesPrice ?? 0).toLocaleString("en-IN")}`,
      bgColor: "#e5f2ff",
    },

    {
      title: "Stock Value With Purchase Price",
      value: `₹ ${Number(summary.stockValuePurchasePrice ?? 0).toLocaleString("en-IN")}`,
      bgColor: "#fdf0e6",
    },
  ];
  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "ID", size: 90 },
      { accessorKey: "item", header: "Item" },
      { accessorKey: "qty", header: "Qty" },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ row }) => {
          const qty = Number(row.original.qty ?? 0);
          const isLowStock = qty <= 0;
          return (
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                isLowStock ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
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

      {
        header: "Actions",
        accessorKey: "actions",
        size: 200,
        Cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              className="flex items-center px-3 py-1.5 text-sm bg-green-100 rounded hover:bg-green-200 cursor-pointer gap-1"
              onClick={() => setShowStockInModal(true)}
            >
              <CirclePlus color="green" size={16} />
              <span className="text-green-700 text-[12px] font-medium">
                Stock In
              </span>
            </button>

            <button
              className="flex items-center px-3 py-1.5 text-sm bg-red-100 rounded hover:bg-red-200 cursor-pointer gap-1"
              onClick={() => setShowStockOutModal(true)}
            >
              <CircleMinus color="red" size={16} />
              <span className="text-red-600 text-[12px] font-medium">
                Stock Out
              </span>
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data,
    state: { isLoading: loading },
    muiPaperProps: {
      elevation: 0,
      square: true,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
      },
    },
  });

  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold ">Inventory List</h1>
          <button
    onClick={() => navigate(-1)}
    className="px-3 py-1.5 bg-red-200 hover:bg-red-300 text-sm rounded-md transition"
  >
     Back
  </button>
      </div>
      {fetchError && <p className="mb-2 text-sm text-red-600">{fetchError}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
        {cards.map((item, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 hover:shadow-sm transition duration-300 cursor-pointer`}
            style={{ backgroundColor: item.bgColor }}
          >
            <div className="flex items-center gap-2 text-black">
              <span className="font-medium">{item.title}</span>
            </div>

            <div className="mt-2 text-base font-semibold">{item.value}</div>
          </div>
        ))}
      </div>

      <MaterialReactTable table={table} />

      {showStockInModal && (
        <StockInModal onClose={() => setShowStockInModal(false)} />
      )}

      {showStockOutModal && (
        <StockOutModal onClose={() => setShowStockOutModal(false)} />
      )}
    </div>
  );
}
