import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { handleGetInventories, type InventorySummary } from "@/services/apiClient";
import { useNavigate } from "react-router-dom";

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
  const [data, setData] = useState<any[]>([]);
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
  });

  return (
    <div className="min-w-0 p-1">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Inventory List</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Qty updates from purchases (in) and sales / returns (out). Add stock
            by creating a purchase.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-md bg-red-200 px-3 py-1.5 text-sm transition hover:bg-red-300"
        >
          Back
        </button>
      </div>
      {fetchError && <p className="mb-2 text-sm text-red-600">{fetchError}</p>}
      <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((item, index) => (
          <div
            key={index}
            className="cursor-pointer rounded-lg p-4 transition duration-300 hover:shadow-sm"
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
    </div>
  );
}
