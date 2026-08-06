import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { InvoiceItem } from "./types";
import {
  handleCatalogueLookup,
  handleCreateProduct,
  type CatalogueLookupItem,
} from "@/services/apiClient";
import CreateProductModal from "@/features/sales/components/invoice/Modal/CreateProductModal";
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
  onUpdateItemQty?: (id: number, newQty: number) => void;
  onUpdateItemDiscount?: (id: number, newDiscount: number) => void;
  onAddDirectItem?: (item: Omit<InvoiceItem, "id">) => void;
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

/** Prefer purchase/cost price for procurement; fall back to selling price. */
function resolvePurchaseUnitPrice(item: CatalogueLookupItem): number {
  const purchase = Number(item.purchasePrice);
  if (Number.isFinite(purchase) && purchase > 0) return purchase;
  return Number(item.sellingPrice ?? 0) || 0;
}

function resolveImage(item: CatalogueLookupItem | any): string {
  return String(
    item?.imageUrl ||
      item?.image ||
      (Array.isArray(item?.images) ? item.images[0] : "") ||
      "",
  ).trim();
}

export default function ProductsServicesSection({
  draft,
  items,
  onDraftChange,
  onAddItem,
  onRemoveItem,
  onUpdateItemQty,
  onUpdateItemDiscount,
  onAddDirectItem,
}: Props) {
  const [catalogueItems, setCatalogueItems] = useState<CatalogueLookupItem[]>(
    [],
  );
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [gridItems, setGridItems] = useState<CatalogueLookupItem[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("product");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
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

    const timeout = window.setTimeout(fetchGridItems, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [draft.name]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setLoadingProducts(true);
        const response = await handleCatalogueLookup(
          draft.name.trim(),
          controller.signal,
          { page: 1, limit: 48, sourceType: "product" },
        );
        const list = Array.isArray(response?.items) ? response.items : [];
        setCatalogueItems(list);
      } catch (error) {
        if (!isAbortError(error)) setCatalogueItems([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [draft.name, dropdownOpen]);

  const filteredGridItems = useMemo(
    () =>
      selectedType === "all"
        ? gridItems
        : gridItems.filter((item) => item.sourceType === selectedType),
    [gridItems, selectedType],
  );

  const applyItemToDraft = (item: CatalogueLookupItem) => {
    onDraftChange("name", item.productName || item.name || "");
    onDraftChange("price", String(resolvePurchaseUnitPrice(item)));
    onDraftChange("image", resolveImage(item));
    onDraftChange("discount", "0");
  };

  const handleSelectProduct = (item: CatalogueLookupItem) => {
    applyItemToDraft(item);
    setDropdownOpen(false);
  };

  const updateDraftQty = (delta: number) => {
    const current = Number(draft.qty) || 0;
    onDraftChange("qty", String(Math.max(1, current + delta)));
  };

  const handleAddGridItem = (item: CatalogueLookupItem) => {
    const unitPrice = resolvePurchaseUnitPrice(item);
    if (onAddDirectItem) {
      onAddDirectItem({
        productName: item.productName || item.name || "",
        qty: 1,
        unitPrice,
        discount: 0,
        image: resolveImage(item),
      });
      return;
    }
    applyItemToDraft(item);
    onDraftChange("qty", "1");
  };

  const handleIncrementGridItem = (
    item: CatalogueLookupItem,
    itemInCart: InvoiceItem,
  ) => {
    if (!onUpdateItemQty) return;
    if (item.trackStock && Number(item.stockQty ?? 0) <= itemInCart.qty) {
      Swal.fire(
        "Insufficient stock",
        `${item.productName || item.name} has only ${item.stockQty} qty available.`,
        "warning",
      );
      return;
    }
    onUpdateItemQty(itemInCart.id, itemInCart.qty + 1);
  };

  const handleDecrementGridItem = (itemInCart: InvoiceItem) => {
    if (!onUpdateItemQty) return;
    if (itemInCart.qty <= 1) {
      onRemoveItem(itemInCart.id);
      return;
    }
    onUpdateItemQty(itemInCart.id, itemInCart.qty - 1);
  };

  const submitNewProduct = async (formData: FormData) => {
    try {
      setCreating(true);
      const response = await handleCreateProduct(formData);
      const prod = response?.product;
      if (prod) {
        onDraftChange("name", prod.productName);
        onDraftChange(
          "price",
          String(prod.purchasePrice ?? prod.sellingPrice ?? 0),
        );
        onDraftChange("image", resolveImage(prod));
      }
      setShowCreateModal(false);
      Swal.fire("Product created", "Product has been successfully added.", "success");
    } catch (e: any) {
      Swal.fire(
        "Error",
        e?.response?.data?.message ?? "Could not create product.",
        "error",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">
          Products & Services
        </h2>
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
            placeholder="Search product or variant..."
            className={inputStyle}
          />
          {dropdownOpen && (
            <div className="absolute left-0 z-10 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              {loadingProducts ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  Searching...
                </div>
              ) : catalogueItems.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No products found
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto">
                  {catalogueItems.map((p) => {
                    const imageUrl = resolveImage(p);
                    const hasImage =
                      Boolean(imageUrl) && !imageErrors[`dd-${p._id}`];
                    return (
                      <div
                        key={`${p.sourceType}-${p._id}`}
                        onClick={() => handleSelectProduct(p)}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {hasImage ? (
                          <img
                            src={imageUrl}
                            alt={p.productName}
                            onError={() => handleImageError(`dd-${p._id}`)}
                            className="h-9 w-9 shrink-0 rounded-lg border border-gray-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-xs font-bold uppercase text-blue-500">
                            {(p.productName || "P").charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-gray-800">
                            {p.productName || p.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Purchase ₹{resolvePurchaseUnitPrice(p)}
                            {p.trackStock && p.stockQty != null
                              ? ` | Stock: ${p.stockQty}`
                              : ""}
                            {p.variantName ? " · Variant" : ""}
                          </div>
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
                className="flex cursor-pointer items-center gap-1 border-t border-gray-100 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-gray-50"
              >
                <Plus size={14} /> Add New Product
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex items-center overflow-hidden rounded-md border border-gray-200">
          <button
            type="button"
            onClick={() => updateDraftQty(-1)}
            className="h-full border-r border-gray-200 bg-gray-50 px-2 text-gray-600 hover:bg-gray-100"
          >
            <Minus size={14} />
          </button>
          <input
            value={draft.qty}
            onChange={(e) => onDraftChange("qty", e.target.value)}
            type="number"
            min={1}
            placeholder="Qty"
            className="h-full w-full bg-white px-2 text-center text-sm text-gray-700 outline-none"
          />
          <button
            type="button"
            onClick={() => updateDraftQty(1)}
            className="h-full border-l border-gray-200 bg-gray-50 px-2 text-gray-600 hover:bg-gray-100"
          >
            <Plus size={14} />
          </button>
        </div>

        <input
          value={draft.price}
          onChange={(e) => onDraftChange("price", e.target.value)}
          type="number"
          min={0}
          placeholder="Purchase Price"
          title="Purchase / cost price"
          className={`${inputStyle} md:col-span-2`}
        />
        <input
          value={draft.discount}
          onChange={(e) => onDraftChange("discount", e.target.value)}
          type="number"
          min={0}
          placeholder="Discount"
          className={`${inputStyle} md:col-span-2`}
        />
        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white md:col-span-2"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Quick Select Menu — same layout as invoice, prices = purchase price */}
      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Quick Select Menu
            </h3>
            {loadingGrid && (
              <span className="animate-pulse text-xs text-gray-400">
                Loading menu...
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "All" },
              { id: "product", label: "Products" },
              { id: "service", label: "Services" },
              { id: "space", label: "Spaces" },
              { id: "food", label: "Foods" },
            ].map((tab) => {
              const isActive = selectedType === tab.id;
              const count = gridItems.filter(
                (i) => tab.id === "all" || i.sourceType === tab.id,
              ).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}{" "}
                  <span
                    className={`ml-0.5 text-[10px] ${
                      isActive ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredGridItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center text-sm text-gray-500">
            {loadingGrid
              ? "Fetching items from database..."
              : "No items found in database matching search."}
          </div>
        ) : (
          <div className="custom-scrollbar flex gap-2 overflow-x-auto scroll-smooth whitespace-nowrap p-1 pb-2">
            {filteredGridItems.map((item) => {
              const badge = SOURCE_BADGE[item.sourceType] || SOURCE_BADGE.product;
              const itemInCart = items.find(
                (i) =>
                  i.productName.toLowerCase() ===
                  (item.productName || item.name || "").toLowerCase(),
              );
              const hasImage = Boolean(item.imageUrl) && !imageErrors[item._id];
              const purchasePrice = resolvePurchaseUnitPrice(item);

              return (
                <div
                  key={`${item.sourceType}-${item._id}`}
                  className="group relative flex w-28 shrink-0 flex-col justify-between rounded-xl border border-gray-100 bg-white p-2 whitespace-normal transition-all duration-200 hover:border-blue-200 hover:shadow-md sm:w-32"
                >
                  {item.sourceType === "food" && (
                    <span className="absolute top-1 right-1 z-10 flex items-center justify-center rounded border border-gray-100 bg-white p-0.5 shadow-sm">
                      <span
                        className={`flex h-2.5 w-2.5 items-center justify-center border ${
                          item.isVeg !== false
                            ? "border-green-600"
                            : "border-red-600"
                        }`}
                      >
                        <span
                          className={`h-1 w-1 rounded-full ${
                            item.isVeg !== false ? "bg-green-600" : "bg-red-600"
                          }`}
                        />
                      </span>
                    </span>
                  )}

                  <div>
                    <div className="relative mb-1 flex h-16 w-full items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                      {hasImage ? (
                        <img
                          src={item.imageUrl!}
                          alt={item.name}
                          onError={() => handleImageError(item._id)}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full select-none items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-sm font-bold uppercase text-blue-500">
                          {(item.productName || item.name || "P").charAt(0)}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0.5 left-0.5 rounded px-1 text-[8px] font-bold uppercase tracking-wider shadow-sm ${
                          item.variantName
                            ? "bg-violet-50 text-violet-700"
                            : badge.className
                        }`}
                      >
                        {item.variantName ? "Variant" : badge.label}
                      </span>
                    </div>

                    <div
                      className="line-clamp-2 min-h-[24px] text-[10px] font-semibold leading-tight text-gray-800 transition-colors group-hover:text-blue-600 sm:text-xs"
                      title={item.productName || item.name}
                    >
                      {item.productName || item.name}
                    </div>
                    <div className="mt-0.5 text-[9px] font-medium text-gray-400">
                      {item.category || "General"}
                    </div>
                  </div>

                  <div className="mt-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-gray-900 sm:text-xs">
                          ₹{purchasePrice}
                        </span>
                        <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400">
                          Purchase
                        </span>
                      </div>
                      {item.trackStock && item.stockQty != null && (
                        <span
                          className={`text-[8px] font-medium sm:text-[9px] ${
                            item.stockQty <= 0
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                        >
                          {item.stockQty <= 0
                            ? "Out"
                            : `Stock: ${item.stockQty}`}
                        </span>
                      )}
                    </div>

                    {itemInCart && onUpdateItemQty ? (
                      <div className="mt-1 flex h-6 items-center justify-between rounded-lg border border-blue-600 bg-blue-50 px-1 text-xs font-semibold text-blue-600">
                        <button
                          type="button"
                          onClick={() => handleDecrementGridItem(itemInCart)}
                          className="rounded p-0.5 transition-colors hover:bg-blue-100"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="px-0.5 text-[10px]">
                          {itemInCart.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleIncrementGridItem(item, itemInCart)
                          }
                          className="rounded p-0.5 transition-colors hover:bg-blue-100"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddGridItem(item)}
                        className="mt-1 flex h-6 w-full items-center justify-center gap-0.5 rounded-lg border border-blue-600 text-[10px] font-bold text-blue-600 shadow-sm transition-all duration-200 hover:bg-blue-600 hover:text-white"
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

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Product Name</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2 text-right">Purchase Price</th>
              <th className="px-3 py-2 text-right">Discount</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-gray-500"
                >
                  Search or add products to start creating purchase.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const lineTotal =
                  item.qty * item.unitPrice - Number(item.discount || 0);
                const imageKey = `row-${item.id}`;
                const hasImage =
                  Boolean(item.image) && !imageErrors[imageKey];
                return (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">
                      <div className="flex items-center gap-3">
                        {hasImage ? (
                          <img
                            src={item.image}
                            alt={item.productName}
                            onError={() => handleImageError(imageKey)}
                            className="h-10 w-10 shrink-0 rounded-lg border border-gray-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-xs font-bold uppercase text-blue-500">
                            {(item.productName || "P").charAt(0)}
                          </div>
                        )}
                        <span className="min-w-0 truncate">
                          {item.productName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {onUpdateItemQty ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              item.qty <= 1
                                ? onRemoveItem(item.id)
                                : onUpdateItemQty(item.id, item.qty - 1)
                            }
                            className="rounded-full border border-gray-200 p-1 text-gray-600 hover:bg-gray-50"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center font-medium">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateItemQty(item.id, item.qty + 1)
                            }
                            className="rounded-full border border-gray-200 p-1 text-gray-600 hover:bg-gray-50"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center font-medium">{item.qty}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      ₹ {item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {onUpdateItemDiscount ? (
                        <div className="flex justify-end">
                          <input
                            type="number"
                            min={0}
                            value={item.discount}
                            onChange={(e) =>
                              onUpdateItemDiscount(
                                item.id,
                                Number(e.target.value),
                              )
                            }
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-right text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                      ) : (
                        <span>₹ {Number(item.discount || 0).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      ₹ {lineTotal.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
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
