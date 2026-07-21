import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Minus } from "lucide-react";
import type { InvoiceItem } from "./types";
import {
  handleCatalogueLookup,
  handleCreateProduct,
  type CatalogueLookupItem,
} from "@/services/apiClient";
import CreateProductModal from "./Modal/CreateProductModal";
import Swal from "sweetalert2";

type DraftItem = {
  name: string;
  qty: string;
  price: string;
  discount: string;
  image?: string;
  category?: string;
  cashback: string;
};

type Props = {
  draft: DraftItem;
  items: InvoiceItem[];
  onDraftChange: (field: keyof DraftItem, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: number) => void;
  onUpdateItemQty: (id: number, newQty: number) => void;
  onUpdateItemDiscount: (id: number, newDiscount: number) => void;
  onUpdateItemCashback: (id: number, newCashback: number) => void;
  membershipType?: string;
  membershipPlans?: any[];
  membershipPlanId?: string | null;
};

const inputStyle =
  "h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-500";

const SOURCE_BADGE: Record<
  CatalogueLookupItem["sourceType"],
  { label: string; className: string }
> = {
  product: { label: "Product", className: "bg-slate-100 text-slate-700" },
  service: { label: "Service", className: "bg-indigo-50 text-indigo-700" },
  space: { label: "Space", className: "bg-emerald-50 text-emerald-700" },
  food: { label: "Food", className: "bg-amber-50 text-amber-800" },
};

function isAbortError(error: unknown) {
  return (
    (error as { name?: string; code?: string })?.name === "CanceledError" ||
    (error as { name?: string; code?: string })?.name === "AbortError" ||
    (error as { code?: string })?.code === "ERR_CANCELED"
  );
}

export default function ProductsServicesSection({
  draft,
  items,
  onDraftChange,
  onAddItem,
  onRemoveItem,
  onUpdateItemQty,
  onUpdateItemDiscount,
  onUpdateItemCashback,
  membershipType = "none",
  membershipPlans = [],
  membershipPlanId = null,
}: Props) {
  const [catalogueItems, setCatalogueItems] = useState<CatalogueLookupItem[]>([]);
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

  const fetchCatalogue = async (searchText = "", signal?: AbortSignal) => {
    try {
      setLoadingProducts(true);
      const response = await handleCatalogueLookup(searchText, signal);
      setCatalogueItems(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      if (!isAbortError(error)) setCatalogueItems([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!dropdownOpen) return;
    const term = draft.name.trim();

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetchCatalogue(term, controller.signal);
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [draft.name, dropdownOpen]);

  const resolveMembershipPlan = () =>
    membershipPlans.find(
      (p) =>
        (membershipPlanId && p._id === membershipPlanId) ||
        p.planId?.toLowerCase() === membershipType.toLowerCase() ||
        p.planType?.toLowerCase() === membershipType.toLowerCase() ||
        p.displayName?.toLowerCase() === membershipType.toLowerCase(),
    );

  const applyItemToDraft = (item: CatalogueLookupItem | any) => {
    const qty = Number(draft.qty || 1);
    const sellingPrice = Number(item.sellingPrice ?? 0);
    const membershipCategory = item.category || "General";
    const lineCategory = item.lineCategory || item.sourceType || "product";

    let calculatedDiscount = 0;
    let calculatedCashback = 0;
    const plan = resolveMembershipPlan();

    if (
      plan?.usageLimits &&
      (plan.usageLimits[membershipCategory] || plan.usageLimits.General)
    ) {
      const limit =
        plan.usageLimits[membershipCategory] || plan.usageLimits.General;
      if (limit.discount) {
        calculatedDiscount = (sellingPrice * qty * limit.discount) / 100;
      }
      if (limit.cashback) {
        calculatedCashback = (sellingPrice * qty * limit.cashback) / 100;
      }
    } else {
      const dValue = Number(item.discountValue ?? 0);
      const dType = item.discountType ?? "flat";
      if (dType === "percentage") {
        calculatedDiscount = (sellingPrice * qty * dValue) / 100;
      } else {
        calculatedDiscount = dValue * qty;
      }
    }

    const displayName = item.productName || item.name || "";
    // Set category first (parent may recalculate membership), then lock discount/cashback.
    onDraftChange("category", lineCategory);
    onDraftChange("name", displayName);
    onDraftChange("price", String(sellingPrice));
    onDraftChange("discount", String(calculatedDiscount));
    onDraftChange("cashback", String(calculatedCashback));
    onDraftChange(
      "image",
      item.imageUrl || (item.images && item.images[0]) || "",
    );
  };

  const handleSelectProduct = (item: CatalogueLookupItem) => {
    if (item.trackStock && Number(item.stockQty ?? 0) <= 0) {
      Swal.fire(
        "Out of stock",
        `${item.productName || item.name} is currently out of stock.`,
        "warning",
      );
      return;
    }

    applyItemToDraft(item);
    setDropdownOpen(false);
  };

  const handleAddToBill = () => {
    const name = draft.name.trim();
    const qty = Number(draft.qty || 0);
    const selected = catalogueItems.find(
      (p) =>
        String(p?.productName ?? p?.name ?? "")
          .trim()
          .toLowerCase() === name.toLowerCase(),
    );

    if (selected?.trackStock && Number(selected.stockQty ?? 0) <= 0) {
      Swal.fire(
        "Out of stock",
        `${selected.productName} is currently out of stock.`,
        "warning",
      );
      return;
    }

    if (
      selected?.trackStock &&
      qty > Number(selected.stockQty ?? 0)
    ) {
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
        applyItemToDraft({
          ...prod,
          productName: prod.productName,
          sellingPrice: prod.sellingPrice,
          category: prod.category || "General",
          lineCategory: "product",
          sourceType: "product",
          trackStock: true,
          discountType: prod.discountType,
          discountValue: prod.discountValue,
          imageUrl: prod.imageUrl || prod.images?.[0],
        });
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
            placeholder="Search product, space, service, food..."
            className={inputStyle}
          />
          {dropdownOpen && (
            <div className="absolute left-0 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg z-10">
              {loadingProducts ? (
                <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
              ) : catalogueItems.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No items found</div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {catalogueItems.map((p) => {
                    const badge = SOURCE_BADGE[p.sourceType] || SOURCE_BADGE.product;
                    const stockLabel =
                      p.trackStock && p.stockQty != null
                        ? ` | Qty: ${p.stockQty}`
                        : "";
                    return (
                      <div
                        key={`${p.sourceType}-${p._id}`}
                        onClick={() => handleSelectProduct(p)}
                        className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-gray-800 truncate">
                            {p.productName || p.name}
                          </div>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          ₹{p.sellingPrice}
                          {stockLabel}
                        </div>
                      </div>
                    );
                  })}
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
        <input
          value={draft.discount}
          onChange={(e) => onDraftChange("discount", e.target.value)}
          type="number"
          min={0}
          placeholder="Discount"
          className={`${inputStyle} md:col-span-1`}
        />
        <input
          value={draft.cashback}
          onChange={(e) => onDraftChange("cashback", e.target.value)}
          type="number"
          min={0}
          placeholder="Cashback"
          className={`${inputStyle} md:col-span-1`}
        />
        <button
          onClick={handleAddToBill}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white md:col-span-2"
        >
          <Plus size={14} /> Add
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
              <th className="px-3 py-2 text-right">Cashback</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
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
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end">
                        <input
                          type="number"
                          min={0}
                          value={item.discount}
                          onChange={(e) => onUpdateItemDiscount(item.id, Number(e.target.value))}
                          className="w-20 rounded border border-gray-200 px-2 py-1 text-right text-sm outline-none focus:border-blue-500"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end">
                        <input
                          type="number"
                          min={0}
                          value={item.cashback}
                          onChange={(e) => onUpdateItemCashback(item.id, Number(e.target.value))}
                          className="w-20 rounded border border-gray-200 px-2 py-1 text-right text-sm outline-none focus:border-blue-500"
                        />
                      </div>
                    </td>
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
