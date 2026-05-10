import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Minus } from "lucide-react";
import type { InvoiceItem } from "./types";
import { handleGetProducts, handleCreateProduct } from "@/services/apiClient";
import CreateProductModal from "./Modal/CreateProductModal";
import Swal from "sweetalert2";

type DraftItem = {
  name: string;
  qty: string;
  price: string;
  discount: string;
  image?: string;
};

type Props = {
  draft: DraftItem;
  items: InvoiceItem[];
  onDraftChange: (field: keyof DraftItem, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: number) => void;
  onUpdateItemQty: (id: number, newQty: number) => void;
};

const inputStyle =
  "h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-500";

export default function ProductsServicesSection({
  draft,
  items,
  onDraftChange,
  onAddItem,
  onRemoveItem,
  onUpdateItemQty,
}: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProducts = async (searchText = "", signal?: AbortSignal) => {
    try {
      setLoadingProducts(true);
      const response = await handleGetProducts(searchText, signal);
      console.log(response);
      setProducts(Array.isArray(response?.products) ? response.products : []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!dropdownOpen) return;
    const term = draft.name.trim();

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetchProducts(term, controller.signal);
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [draft.name, dropdownOpen]);

  const handleSelectProduct = (product: any) => {
    if (Number(product?.stockQty ?? 0) <= 0) {
      Swal.fire("Out of stock", `${product.productName} is currently out of stock.`, "warning");
      return;
    }
    onDraftChange("name", product.productName);
    onDraftChange("price", String(product.sellingPrice ?? 0));
    onDraftChange("image", product.imageUrl || (product.images && product.images[0]) || "");
    setDropdownOpen(false);
  };

  const handleAddToBill = () => {
    const name = draft.name.trim();
    const qty = Number(draft.qty || 0);
    const selected = products.find(
      (p) => String(p?.productName ?? "").trim().toLowerCase() === name.toLowerCase(),
    );

    if (selected && Number(selected.stockQty ?? 0) <= 0) {
      Swal.fire("Out of stock", `${selected.productName} is currently out of stock.`, "warning");
      return;
    }

    if (selected && qty > Number(selected.stockQty ?? 0)) {
      Swal.fire(
        "Insufficient stock",
        `${selected.productName} has only ${selected.stockQty} qty available.`,
        "warning",
      );
      return;
    }

    onAddItem();
  };

  const submitNewProduct = async (formData: FormData) => {
    try {
      setCreating(true);
      const response = await handleCreateProduct(formData);
      const prod = response?.product;
      if (prod) {
        onDraftChange("name", prod.productName);
        onDraftChange("price", String(prod.sellingPrice ?? 0));
        onDraftChange("image", prod.imageUrl || (prod.images && prod.images[0]) || "");
      }
      setShowCreateModal(false);
      Swal.fire("Product created", "Product has been successfully added.", "success");
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.message ?? "Could not create product.", "error");
    } finally {
      setCreating(false);
    }
  };

  const updateDraftQty = (delta: number) => {
    const current = Number(draft.qty) || 0;
    const next = Math.max(1, current + delta);
    onDraftChange("qty", String(next));
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Products & Services</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-4" ref={searchContainerRef}>
          <input
            value={draft.name}
            onChange={(e) => {
              onDraftChange("name", e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search product..."
            className={inputStyle}
          />
          {dropdownOpen && (
            <div className="absolute left-0 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg z-10">
              {loadingProducts ? (
                <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
              ) : products.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No products found</div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {products.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => handleSelectProduct(p)}
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <div className="font-medium text-gray-800">{p.productName}</div>
                      <div className="text-xs text-gray-500">
                        ₹{p.sellingPrice} {p.stockQty ? `|Qty: ${p.stockQty}` : ""}
                      </div>
                    
                    </div>
                  ))}
                </div>
              )}
              <div
                onClick={() => {
                  setDropdownOpen(false);
                  setShowCreateModal(true);
                }}
                className="cursor-pointer border-t border-gray-100 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-gray-50 flex items-center gap-1"
              >
                <Plus size={14} /> Add New Product
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex items-center border rounded-md border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => updateDraftQty(-1)}
            className="h-full px-2 bg-gray-50 hover:bg-gray-100 border-r border-gray-200 text-gray-600"
          >
            <Minus size={14} />
          </button>
          <input
            value={draft.qty}
            onChange={(e) => onDraftChange("qty", e.target.value)}
            type="number"
            min={1}
            placeholder="Qty"
            className="h-full w-full bg-white px-2 text-sm text-center text-gray-700 outline-none"
          />
          <button
            type="button"
            onClick={() => updateDraftQty(1)}
            className="h-full px-2 bg-gray-50 hover:bg-gray-100 border-l border-gray-200 text-gray-600"
          >
            <Plus size={14} />
          </button>
        </div>

        <input
          value={draft.price}
          onChange={(e) => onDraftChange("price", e.target.value)}
          type="number"
          min={0}
          placeholder="Unit Price"
          className={`${inputStyle} md:col-span-2`}
        />
        <button
          onClick={handleAddToBill}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white md:col-span-4 lg:col-span-2"
        >
          <Plus size={14} /> Add to Bill
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Product Name</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2 text-right">Unit Price</th>
              <th className="px-3 py-2 text-right">Discount</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-gray-500">
                  Search or add products to start creating invoice.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const lineTotal = item.qty * item.unitPrice - item.discount;
                return (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">{item.productName}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateItemQty(item.id, item.qty - 1)}
                          className="rounded-full border border-gray-200 p-1 text-gray-600 hover:bg-gray-50"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center font-medium">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateItemQty(item.id, item.qty + 1)}
                          className="rounded-full border border-gray-200 p-1 text-gray-600 hover:bg-gray-50"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">₹ {item.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">₹ {item.discount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-semibold">₹ {lineTotal.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="rounded bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateProductModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={submitNewProduct}
          loading={creating}
        />
      )}
    </div>
  );
}
