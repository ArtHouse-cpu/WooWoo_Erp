import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Minus,
  Search,
  Package,
  Briefcase,
  Frame,
  Utensils,
  Loader2,
} from "lucide-react";
import {
  handleCatalogueLookup,
  type CatalogueLookupItem,
} from "@/services/apiClient";
import { calcCatalogueProductDiscount } from "../utils/membershipInvoiceUtils";
import CatalogueItemLabel, { getCatalogueNameParts } from "./CatalogueItemLabel";
import {
  findCartItemForCatalogueLine,
  getCatalogueLineKey,
} from "../utils/catalogueLineKey";
import { filterCatalogueRowsForPos } from "../utils/cataloguePosFilter";

const PAGE_SIZE = 48;

const formatInr = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

function CataloguePrice({ item }: { item: CatalogueLookupItem }) {
  const original = Number(item.sellingPrice ?? 0) || 0;
  const productDiscount = calcCatalogueProductDiscount(
    original,
    1,
    item.discountType,
    item.discountValue,
  );
  const finalPrice = Math.max(0, original - productDiscount);
  const hasDiscount = productDiscount > 0 && finalPrice < original;

  if (!hasDiscount) {
    return (
      <span className="text-[11px] font-extrabold text-slate-900">
        {formatInr(original)}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      <span className="sr-only">
        Original price {formatInr(original)}, sale price {formatInr(finalPrice)}
      </span>
      <s
        aria-hidden="true"
        className="text-[10px] font-semibold text-slate-400 decoration-slate-400"
      >
        {formatInr(original)}
      </s>
      <span
        aria-hidden="true"
        className="rounded bg-emerald-50 px-1 py-0.5 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-100"
      >
        {formatInr(finalPrice)}
      </span>
    </span>
  );
}

type ProductSidebarProps = {
  cartItems: any[];
  onAddItem: (item: CatalogueLookupItem) => void;
  onRemoveItem?: (item: CatalogueLookupItem) => void;
  onIncrementItem: (item: CatalogueLookupItem, existingQty: number) => void;
  onDecrementItem: (item: CatalogueLookupItem, existingQty: number) => void;
  title?: string;
  /** Horizontal catalogue strip for mobile POS */
  variant?: "list" | "rail";
  /** Controlled search (mobile POS top bar drives catalogue lookup). */
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
};

const SOURCE_BADGE: Record<
  CatalogueLookupItem["sourceType"],
  { label: string; className: string; icon: any }
> = {
  product: {
    label: "Product",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Package,
  },
  service: {
    label: "Service",
    className: "bg-indigo-50 text-indigo-700 border-indigo-100",
    icon: Briefcase,
  },
  space: {
    label: "Space",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: Frame,
  },
  food: {
    label: "Food",
    className: "bg-amber-50 text-amber-800 border-amber-100",
    icon: Utensils,
  },
};

export default function ProductSidebar({
  cartItems,
  onAddItem,
  onIncrementItem,
  onDecrementItem,
  title = "Catalogue Sidebar",
  variant = "list",
  searchTerm: searchTermProp,
  onSearchTermChange,
}: ProductSidebarProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const isControlledSearch =
    searchTermProp !== undefined && onSearchTermChange !== undefined;
  const searchTerm = isControlledSearch ? searchTermProp : internalSearch;
  const setSearchTerm = isControlledSearch
    ? onSearchTermChange
    : setInternalSearch;
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [items, setItems] = useState<CatalogueLookupItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const requestIdRef = useRef(0);
  // Bumps when search/type changes so in-flight "page 2" responses are ignored.
  const listEpochRef = useRef(0);

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    listEpochRef.current += 1;
    setPage(1);
    setItems([]);
    setHasMore(false);

    const controller = new AbortController();
    const epoch = listEpochRef.current;
    const requestId = ++requestIdRef.current;

    (async () => {
      setLoading(true);
      try {
        const response = await handleCatalogueLookup(
          debouncedSearch,
          controller.signal,
          {
            page: 1,
            limit: PAGE_SIZE,
            sourceType: selectedType,
          },
        );
        if (controller.signal.aborted || epoch !== listEpochRef.current) return;
        if (requestId !== requestIdRef.current) return;

        const nextItems = Array.isArray(response?.items) ? response.items : [];
        setItems(filterCatalogueRowsForPos(nextItems));
        setHasMore(Boolean(response?.pagination?.hasMore));
        setTotalAvailable(Number(response?.pagination?.total ?? nextItems.length));
      } catch {
        if (!controller.signal.aborted && epoch === listEpochRef.current) {
          setItems([]);
          setHasMore(false);
          setTotalAvailable(0);
        }
      } finally {
        if (epoch === listEpochRef.current) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedSearch, selectedType]);

  useEffect(() => {
    if (page <= 1) return;

    const controller = new AbortController();
    const epoch = listEpochRef.current;
    const requestId = ++requestIdRef.current;

    (async () => {
      setLoadingMore(true);
      try {
        const response = await handleCatalogueLookup(
          debouncedSearch,
          controller.signal,
          {
            page,
            limit: PAGE_SIZE,
            sourceType: selectedType,
          },
        );
        if (controller.signal.aborted || epoch !== listEpochRef.current) return;
        if (requestId !== requestIdRef.current) return;

        const nextItems = Array.isArray(response?.items) ? response.items : [];
        setItems((prev) => {
          const seen = new Set(prev.map((i) => getCatalogueLineKey(i)));
          const merged = [...prev];
          for (const item of nextItems) {
            const key = getCatalogueLineKey(item);
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          }
          return filterCatalogueRowsForPos(merged);
        });
        setHasMore(Boolean(response?.pagination?.hasMore));
        setTotalAvailable(
          Number(response?.pagination?.total ?? totalAvailable),
        );
      } catch {
        // ignore aborted / stale
      } finally {
        if (epoch === listEpochRef.current) setLoadingMore(false);
      }
    })();

    return () => controller.abort();
    // totalAvailable intentionally omitted — only used as fallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, selectedType]);

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    setPage((p) => p + 1);
  };

  /** Hide empty parent tiles when any variant of that product name is in the list. */
  const visibleItems = useMemo(
    () => filterCatalogueRowsForPos(items),
    [items],
  );

  return (
    <div
      className={
        variant === "rail"
          ? "space-y-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          : "flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      }
    >
      <div
        className={
          variant === "rail"
            ? "space-y-2"
            : "border-b border-slate-100 bg-slate-50/50 p-4"
        }
      >
        <h3 className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-slate-800">
          <span>{variant === "rail" ? "Catalogue" : title}</span>
          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {items.length}
            {totalAvailable > items.length ? ` / ${totalAvailable}` : ""}
          </span>
        </h3>

        {variant !== "rail" && (
        <div className="relative mt-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items or variants..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        )}

        <div
          className={`flex gap-1 ${variant === "rail" ? "hide-scrollbar overflow-x-auto pb-0.5" : "mt-3 flex-wrap"}`}
        >
          {[
            { id: "all", label: "All" },
            { id: "product", label: "Products" },
            { id: "service", label: "Services" },
            { id: "space", label: "Spaces" },
            { id: "food", label: "Foods" },
          ].map((tab) => {
            const isActive = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-tight transition-all ${
                  isActive
                    ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={
          variant === "rail"
            ? "hide-scrollbar flex gap-2.5 overflow-x-auto pb-1 pt-1"
            : "custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3"
        }
      >
        {loading && items.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center space-y-2 py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600" />
            <span className="text-[11px] font-medium text-slate-400">
              Loading catalogue...
            </span>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="w-full py-8 text-center text-xs font-medium text-slate-400">
            No items found.
          </div>
        ) : (
          <>
            {visibleItems.map((item) => {
              const badge = SOURCE_BADGE[item.sourceType] || SOURCE_BADGE.product;
              const IconComponent = badge.icon;
              const lineKey = getCatalogueLineKey(item);
              const nameParts = getCatalogueNameParts(item);

              const cartItem = findCartItemForCatalogueLine(cartItems, item);
              const qtyInCart = cartItem?.qty || 0;
              const hasImage = item.imageUrl && !imageErrors[item._id];

              if (variant === "rail") {
                return (
                  <div
                    key={lineKey}
                    className={`flex w-[8.25rem] shrink-0 flex-col justify-between rounded-2xl border bg-white p-2.5 transition ${
                      qtyInCart > 0
                        ? "border-violet-200 shadow-sm"
                        : "border-slate-100"
                    }`}
                  >
                    <div>
                      <div className="relative mb-1.5 flex h-14 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                        {hasImage ? (
                          <img
                            src={item.imageUrl!}
                            alt={item.productName || item.name}
                            onError={() => handleImageError(item._id)}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <IconComponent size={18} className="text-slate-400" />
                        )}
                        {qtyInCart > 0 && (
                          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
                            {qtyInCart}
                          </span>
                        )}
                      </div>
                      <CatalogueItemLabel item={item} compact />
                      <div className="mt-0.5">
                        <CataloguePrice item={item} />
                      </div>
                      {item.trackStock && item.stockQty != null && (
                        <div
                          className={`mt-0.5 flex items-center gap-1 text-[9px] font-semibold ${
                            Number(item.stockQty) <= 0
                              ? "text-red-500"
                              : "text-emerald-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              Number(item.stockQty) <= 0
                                ? "bg-red-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          Stock: {item.stockQty}
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5">
                      {qtyInCart > 0 ? (
                        <div className="flex h-7 items-center justify-between rounded-lg border border-violet-600 bg-violet-50 px-1 text-violet-700">
                          <button
                            type="button"
                            onClick={() => onDecrementItem(item, qtyInCart)}
                            className="rounded p-0.5"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-[11px] font-bold">{qtyInCart}</span>
                          <button
                            type="button"
                            onClick={() => onIncrementItem(item, qtyInCart)}
                            className="rounded p-0.5"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            item.trackStock && Number(item.stockQty ?? 0) <= 0
                          }
                          onClick={() => onAddItem(item)}
                          className="flex h-7 w-full items-center justify-center gap-0.5 rounded-lg border border-violet-600 text-[10px] font-bold text-violet-700 transition hover:bg-violet-600 hover:text-white disabled:opacity-40"
                        >
                          <Plus size={10} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={lineKey}
                  className={`flex items-center gap-3 rounded-xl border bg-white p-2 transition-all duration-200 ${
                    qtyInCart > 0
                      ? "border-indigo-200 bg-indigo-50/10 shadow-sm"
                      : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
                  }`}
                >
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                    {hasImage ? (
                      <img
                        src={item.imageUrl!}
                        alt={item.productName || item.name}
                        onError={() => handleImageError(item._id)}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
                        <IconComponent size={16} />
                      </div>
                    )}

                    {qtyInCart > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white shadow-sm ring-1 ring-white">
                        {qtyInCart}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <CatalogueItemLabel item={item} compact />
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <CataloguePrice item={item} />
                      {nameParts.variantName ? (
                        <span className="rounded bg-violet-50 px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-violet-700 ring-1 ring-violet-100">
                          Variant
                        </span>
                      ) : null}
                      {item.trackStock && item.stockQty != null && (
                        <span
                          className={`text-[9px] font-bold ${
                            Number(item.stockQty) <= 0
                              ? "rounded bg-red-50 px-1 text-red-500"
                              : "text-slate-400"
                          }`}
                        >
                          {Number(item.stockQty) <= 0
                            ? "OUT OF STOCK"
                            : `Stock: ${item.stockQty}`}
                        </span>
                      )}
                    </div>
                    {item.isCsp && (
                      <span className="mt-0.5 inline-block rounded bg-amber-100 px-1 text-[8px] font-extrabold uppercase tracking-wide text-amber-800">
                        {item.cspLabel || "CSP"}
                      </span>
                    )}
                  </div>

                  <div className="shrink-0">
                    {qtyInCart > 0 ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => onDecrementItem(item, qtyInCart)}
                          className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                        >
                          <Minus size={10} strokeWidth={3} />
                        </button>
                        <span className="min-w-[12px] px-0.5 text-center text-xs font-bold text-slate-800">
                          {qtyInCart}
                        </span>
                        <button
                          type="button"
                          onClick={() => onIncrementItem(item, qtyInCart)}
                          className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                        >
                          <Plus size={10} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          item.trackStock && Number(item.stockQty ?? 0) <= 0
                        }
                        onClick={() => onAddItem(item)}
                        className="flex h-7 items-center justify-center gap-0.5 rounded-lg border border-indigo-600 bg-white px-2.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 transition hover:bg-indigo-600 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-indigo-600"
                      >
                        <Plus size={10} strokeWidth={3} /> ADD
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className={`flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 ${
                  variant === "rail" ? "w-28 shrink-0 px-2" : "w-full"
                }`}
              >
                {loadingMore ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                {loadingMore ? "…" : variant === "rail" ? "More" : "Load more products"}
              </button>
            ) : visibleItems.length > 0 && variant !== "rail" ? (
              <p className="py-2 text-center text-[10px] font-medium text-slate-400">
                End of list · use search to find any product
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
