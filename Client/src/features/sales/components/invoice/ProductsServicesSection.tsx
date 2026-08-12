import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Minus } from "lucide-react";
import type { InvoiceItem } from "./types";
import {
  handleCatalogueLookup,
  handleCreateProduct,
  type CatalogueLookupItem,
} from "@/services/apiClient";
import {
  calcStackedLineBenefits,
  resolveMembershipPlan,
} from "../../utils/membershipInvoiceUtils";
import {resolveInvoiceLineCategory} from "../../utils/itemClassification";
import CreateProductModal from "./Modal/CreateProductModal";
import CatalogueItemLabel from "@/features/sales/components/CatalogueItemLabel";
import Swal from "sweetalert2";

type DraftItem = {
  name: string;
  qty: string;
  price: string;
  discount: string;
  image?: string;
  category?: string;
  cashback: string;
  /** "true" when selected catalogue product is CSP */
  isCsp?: string;
};

type Props = {
  draft: DraftItem;
  items: InvoiceItem[];
  onDraftChange: (field: keyof DraftItem, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: number) => void;
  onUpdateItemQty: (id: number, newQty: number) => void;
  onUpdateItemDiscount: (id: number, newDiscount: number) => void;
  onUpdateItemCashback?: (id: number, newCashback: number) => void;
  membershipType?: string;
  membershipPlans?: any[];
  membershipPlanId?: string | null;
  onAddDirectItem?: (item: Omit<InvoiceItem, "id">) => void;
  /** View invoice: hide catalogue / add UI; show sold line items only */
  readOnly?: boolean;
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
  onAddDirectItem,
  readOnly = false,
}: Props) {
  const [catalogueItems, setCatalogueItems] = useState<CatalogueLookupItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [gridItems, setGridItems] = useState<CatalogueLookupItem[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  useEffect(() => {
    if (readOnly) return;
    const controller = new AbortController();
    const fetchGridItems = async () => {
      try {
        setLoadingGrid(true);
        const term = draft.name.trim();
        const response = await handleCatalogueLookup(term, controller.signal, {
          page: 1,
          limit: 48,
        });
        setGridItems(Array.isArray(response?.items) ? response.items : []);
      } catch (error) {
        if (!isAbortError(error)) setGridItems([]);
      } finally {
        setLoadingGrid(false);
      }
    };

    const timeout = window.setTimeout(() => {
      fetchGridItems();
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [draft.name, readOnly]);

  const getPlan = () =>
    resolveMembershipPlan(membershipPlans, membershipType, membershipPlanId);

  const getCalculatedItemBenefits = (item: CatalogueLookupItem, qty: number) => {
    const sellingPrice = Number(item.sellingPrice ?? 0);
    const lineCategory = resolveInvoiceLineCategory(item);
    const stacked = calcStackedLineBenefits({
      unitPrice: sellingPrice,
      qty,
      category: lineCategory,
      plan: getPlan(),
      discountType: item.discountType,
      discountValue: item.discountValue,
      isCsp: Boolean(item.isCsp),
    });

    return {
      discount: stacked.discount,
      cashback: stacked.cashback,
      category: lineCategory,
      productDiscountAmount: stacked.productDiscount,
      membershipDiscountAmount: stacked.membershipDiscount,
    };
  };

  const handleAddGridItem = (item: CatalogueLookupItem) => {
    if (item.trackStock && Number(item.stockQty ?? 0) <= 0) {
      Swal.fire(
        "Out of stock",
        `${item.productName || item.name} has no purchased quantity left to sell.`,
        "warning",
      );
      return;
    }

    const {
      discount,
      cashback,
      category,
      productDiscountAmount,
      membershipDiscountAmount,
    } = getCalculatedItemBenefits(item, 1);

    if (onAddDirectItem) {
      onAddDirectItem({
        productName: item.productName || item.name || "",
        qty: 1,
        unitPrice: Number(item.sellingPrice ?? 0),
        discount,
        cashback,
        image: item.imageUrl || (item.images && item.images[0]) || "",
        category,
        isCsp: Boolean(item.isCsp),
        cspLabel: item.cspLabel || null,
        productDiscountType: item.discountType,
        productDiscountValue: Number(item.discountValue ?? 0),
        productDiscountAmount,
        membershipDiscountAmount,
      });
    }
  };

  const handleIncrementGridItem = (item: CatalogueLookupItem, itemInCart: InvoiceItem) => {
    if (item.trackStock && Number(item.stockQty ?? 0) <= itemInCart.qty) {
      Swal.fire(
        "Insufficient stock",
        `${item.productName || item.name} has only ${item.stockQty} qty available from purchases.`,
        "warning",
      );
      return;
    }
    onUpdateItemQty(itemInCart.id, itemInCart.qty + 1);
  };

  const handleDecrementGridItem = (itemInCart: InvoiceItem) => {
    if (itemInCart.qty <= 1) {
      onRemoveItem(itemInCart.id);
    } else {
      onUpdateItemQty(itemInCart.id, itemInCart.qty - 1);
    }
  };

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
      const response = await handleCatalogueLookup(searchText, signal, {
        page: 1,
        limit: 48,
      });
      setCatalogueItems(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      if (!isAbortError(error)) setCatalogueItems([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (readOnly || !dropdownOpen) return;
    const term = draft.name.trim();

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetchCatalogue(term, controller.signal);
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [draft.name, dropdownOpen, readOnly]);

  const applyItemToDraft = (item: CatalogueLookupItem | any) => {
    const qty = Number(draft.qty || 1);
    const sellingPrice = Number(item.sellingPrice ?? 0);
    const lineCategory = resolveInvoiceLineCategory(item);
    const isCsp = Boolean(item.isCsp);
    const stacked = calcStackedLineBenefits({
      unitPrice: sellingPrice,
      qty,
      category: lineCategory,
      plan: getPlan(),
      discountType: item.discountType,
      discountValue: item.discountValue,
      isCsp,
    });

    const displayName = item.productName || item.name || "";
    // Set category first (parent may recalculate membership), then lock discount/cashback.
    onDraftChange("category", lineCategory);
    onDraftChange("name", displayName);
    onDraftChange("price", String(sellingPrice));
    onDraftChange("discount", String(stacked.discount));
    onDraftChange("cashback", String(stacked.cashback));
    onDraftChange("isCsp", isCsp ? "true" : "false");
    onDraftChange(
      "image",
      item.imageUrl || (item.images && item.images[0]) || "",
    );
  };

  const handleSelectProduct = (item: CatalogueLookupItem) => {
    if (item.trackStock && Number(item.stockQty ?? 0) <= 0) {
      Swal.fire(
        "Out of stock",
        `${item.productName || item.name} has no purchased quantity left to sell.`,
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
        `${selected.productName} has no purchased quantity left to sell.`,
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
        `${selected.productName} has only ${selected.stockQty} qty available from purchases.`,
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

  const filteredGridItems = gridItems.filter((item) => {
    if (selectedType === "all") return true;
    return item.sourceType === selectedType;
  });

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">
          {readOnly ? "Sold Products & Items" : "Products & Services"}
        </h2>
        {readOnly && (
          <span className="text-xs text-gray-500">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {!readOnly && (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-4" ref={searchContainerRef}>
          <input
            value={draft.name}
            onChange={(e) => {
              onDraftChange("name", e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search product or variant..."
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
                        <div className="flex items-start justify-between gap-2">
                          <CatalogueItemLabel item={p} className="min-w-0 flex-1" />
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              p.variantName
                                ? "bg-violet-50 text-violet-700"
                                : badge.className
                            }`}
                          >
                            {p.variantName ? "Variant" : badge.label}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
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
          title={
            draft.isCsp === "true"
              ? "Product discount (membership discount does not apply to CSP)"
              : undefined
          }
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
      )}

      {!readOnly && (
      /* Instamart Catalogue Grid */
      <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Quick Select Menu</h3>
            {loadingGrid && <span className="text-xs text-gray-400 animate-pulse">Loading menu...</span>}
          </div>
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "All" },
              { id: "product", label: "Products" },
              { id: "service", label: "Services" },
              { id: "space", label: "Spaces" },
              { id: "food", label: "Foods" },
            ].map((tab) => {
              const isActive = selectedType === tab.id;
              const count = gridItems.filter(i => tab.id === 'all' || i.sourceType === tab.id).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 border ${
                    isActive
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                  }`}
                >
                  {tab.label} <span className={`text-[10px] ml-0.5 ${isActive ? "text-blue-100" : "text-gray-400"}`}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredGridItems.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            {loadingGrid ? "Fetching items from database..." : "No items found in database matching search."}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto p-1 pb-2 custom-scrollbar scroll-smooth whitespace-nowrap">
            {filteredGridItems.map((item) => {
              const badge = SOURCE_BADGE[item.sourceType] || SOURCE_BADGE.product;
              const itemInCart = items.find(
                (i) => i.productName.toLowerCase() === (item.productName || item.name || "").toLowerCase()
              );
              const hasImage = item.imageUrl && !imageErrors[item._id];
              
              return (
                <div
                  key={`${item.sourceType}-${item._id}`}
                  className="flex-shrink-0 w-32 sm:w-36 group relative border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 rounded-xl bg-white p-2.5 flex flex-col justify-between whitespace-normal"
                >
                  {/* Veg / Non-Veg badge */}
                  {item.sourceType === "food" && (
                    <span className="absolute top-1 right-1 p-0.5 bg-white rounded shadow-sm border border-gray-100 flex items-center justify-center z-10">
                      <span
                        className={`w-2.5 h-2.5 border flex items-center justify-center ${
                          item.isVeg !== false ? "border-green-600" : "border-red-600"
                        }`}
                        style={{ padding: "0.5px" }}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            item.isVeg !== false ? "bg-green-600" : "bg-red-600"
                          }`}
                        />
                      </span>
                    </span>
                  )}

                  <div>
                    {/* Item Image with Fallback */}
                    <div className="relative w-full h-16 mb-1 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                      {hasImage ? (
                        <img
                          src={item.imageUrl!}
                          alt={item.name}
                          onError={() => handleImageError(item._id)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-500 font-bold uppercase text-sm select-none">
                          {(item.productName || item.name || "P").charAt(0)}
                        </div>
                      )}
                      
                      {/* Source badge overlay */}
                      <span
                        className={`absolute bottom-0.5 left-0.5 rounded px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider shadow-sm ${
                          item.variantName
                            ? "bg-violet-50 text-violet-700"
                            : badge.className
                        }`}
                      >
                        {item.variantName ? "Variant" : badge.label}
                      </span>
                    </div>

                    {/* Clear product + variant title */}
                    <CatalogueItemLabel
                      item={item}
                      compact
                      className="mt-0.5 group-hover:[&>div]:text-blue-700"
                    />
                    {item.isCsp && (
                      <span className="mt-0.5 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                        {item.cspLabel || "CSP"}
                      </span>
                    )}

                    {/* Category */}
                    <div className="text-[9px] text-gray-400 font-medium mt-0.5">
                      {item.category || "General"}
                    </div>
                  </div>

                  <div className="mt-1">
                    {/* Price and Stock */}
                    <div className="flex items-baseline justify-between gap-1 flex-wrap">
                      <span className="text-[11px] sm:text-xs font-bold text-gray-900">₹{item.sellingPrice}</span>
                      {item.trackStock && item.stockQty != null && (
                        <span
                          className={`text-[8px] sm:text-[9px] font-medium ${
                            Number(item.stockQty) <= 0
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                        >
                          {Number(item.stockQty) <= 0
                            ? "Out"
                            : `Stock: ${item.stockQty}`}
                        </span>
                      )}
                    </div>

                    {/* Add / Qty Control button */}
                    {itemInCart ? (
                      <div className="flex items-center justify-between border border-blue-600 bg-blue-50 rounded-lg h-6 px-1 mt-1 text-blue-600 font-semibold text-xs">
                        <button
                          type="button"
                          onClick={() => handleDecrementGridItem(itemInCart)}
                          className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="px-0.5 text-[10px]">{itemInCart.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleIncrementGridItem(item, itemInCart)}
                          className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddGridItem(item)}
                        disabled={item.trackStock && Number(item.stockQty ?? 0) <= 0}
                        className="w-full mt-1 h-6 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 font-bold text-[10px] transition-all duration-200 flex items-center justify-center gap-0.5 shadow-sm"
                      >
                        <Plus size={10} /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

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
              {!readOnly && (
                <th className="px-3 py-2 text-center">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 6 : 7}
                  className="px-3 py-10 text-center text-gray-500"
                >
                  {readOnly
                    ? "No products were sold on this invoice."
                    : "Search or add products to start creating invoice."}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const lineTotal = item.qty * item.unitPrice - item.discount;
                return (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">
                      <div className="flex flex-col gap-0.5">
                        <span>{item.productName}</span>
                        {item.isCsp && (
                          <span className="inline-flex w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                            {item.cspLabel || "CSP"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {readOnly ? (
                        <div className="text-center font-medium">{item.qty}</div>
                      ) : (
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
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">₹ {item.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      {readOnly ? (
                        <span>₹ {Number(item.discount || 0).toFixed(2)}</span>
                      ) : (
                        <div className="flex justify-end">
                          <input
                            type="number"
                            min={0}
                            value={item.discount}
                            title={
                              item.isCsp
                                ? "Product discount (membership discount does not apply to CSP)"
                                : undefined
                            }
                            onChange={(e) =>
                              onUpdateItemDiscount(item.id, Number(e.target.value))
                            }
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-right text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {readOnly ? (
                        <span>₹ {Number(item.cashback || 0).toFixed(2)}</span>
                      ) : (
                        <div className="flex justify-end">
                          <input
                            type="number"
                            min={0}
                            value={item.cashback}
                            onChange={(e) =>
                              onUpdateItemCashback?.(item.id, Number(e.target.value))
                            }
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-right text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">₹ {lineTotal.toFixed(2)}</td>
                    {!readOnly && (
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="rounded bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && showCreateModal && (
        <CreateProductModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={submitNewProduct}
          loading={creating}
        />
      )}
    </div>
  );
}
