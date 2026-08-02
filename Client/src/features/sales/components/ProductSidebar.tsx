import { useEffect, useState } from "react";
import { Plus, Minus, Search, Package, Briefcase, Frame, Utensils } from "lucide-react";
import { handleCatalogueLookup, type CatalogueLookupItem } from "@/services/apiClient";
import { calcCatalogueProductDiscount } from "../utils/membershipInvoiceUtils";

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
  onRemoveItem: (itemName: string) => void;
  onIncrementItem: (item: CatalogueLookupItem, existingQty: number) => void;
  onDecrementItem: (itemName: string, existingQty: number) => void;
  title?: string;
};

const SOURCE_BADGE: Record<
  CatalogueLookupItem["sourceType"],
  { label: string; className: string; icon: any }
> = {
  product: { label: "Product", className: "bg-slate-100 text-slate-700 border-slate-200", icon: Package },
  service: { label: "Service", className: "bg-indigo-50 text-indigo-700 border-indigo-100", icon: Briefcase },
  space: { label: "Space", className: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: Frame },
  food: { label: "Food", className: "bg-amber-50 text-amber-800 border-amber-100", icon: Utensils },
};

export default function ProductSidebar({
  cartItems,
  onAddItem,
  onRemoveItem,
  onIncrementItem,
  onDecrementItem,
  title = "Catalogue Sidebar",
}: ProductSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [items, setItems] = useState<CatalogueLookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchItems = async () => {
      try {
        setLoading(true);
        const response = await handleCatalogueLookup(searchTerm.trim(), controller.signal);
        setItems(Array.isArray(response?.items) ? response.items : []);
      } catch (err) {
        // Ignore aborts
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      fetchItems();
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchTerm]);

  const filteredItems = items.filter((item) => {
    if (selectedType === "all") return true;
    return item.sourceType === selectedType;
  });

  return (
    <div className="flex h-full flex-col border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50/50 p-4">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
          <span>{title}</span>
          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {filteredItems.length}
          </span>
        </h3>
        
        {/* Search */}
        <div className="relative mt-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>

        {/* Filter categories */}
        <div className="mt-3 flex flex-wrap gap-1">
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
                className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-tight transition-all uppercase ${
                  isActive
                    ? "bg-slate-800 border-slate-800 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
            <span className="text-[11px] font-medium text-slate-400">Loading catalogue...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 font-medium">
            No items found.
          </div>
        ) : (
          filteredItems.map((item) => {
            const badge = SOURCE_BADGE[item.sourceType] || SOURCE_BADGE.product;
            const IconComponent = badge.icon;
            
            // Find item in cart
            const cartItem = cartItems.find(
              (c) =>
                String(c.productName || c.name || "")
                  .trim()
                  .toLowerCase() === (item.productName || item.name || "").trim().toLowerCase()
            );
            const qtyInCart = cartItem?.qty || 0;
            const hasImage = item.imageUrl && !imageErrors[item._id];

            return (
              <div
                key={`${item.sourceType}-${item._id}`}
                className={`flex items-center gap-3 border rounded-xl p-2 bg-white transition-all duration-200 ${
                  qtyInCart > 0
                    ? "border-indigo-200 shadow-sm bg-indigo-50/10"
                    : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
                }`}
              >
                {/* Image */}
                <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                  {hasImage ? (
                    <img
                      src={item.imageUrl!}
                      alt={item.productName || item.name}
                      onError={() => handleImageError(item._id)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-50 flex items-center justify-center text-slate-400">
                      <IconComponent size={16} />
                    </div>
                  )}
                  
                  {qtyInCart > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white shadow-sm ring-1 ring-white">
                      {qtyInCart}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-slate-800 leading-tight">
                    {item.productName || item.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <CataloguePrice item={item} />
                    {item.trackStock && item.stockQty != null && (
                      <span className={`text-[9px] font-bold ${item.stockQty <= 0 ? "text-red-500 bg-red-50 px-1 rounded" : "text-slate-400"}`}>
                        {item.stockQty <= 0 ? "OUT OF STOCK" : `Stock: ${item.stockQty}`}
                      </span>
                    )}
                  </div>
                  {item.isCsp && (
                    <span className="mt-0.5 inline-block rounded bg-amber-100 px-1 py-0.2 text-[8px] font-extrabold text-amber-800 uppercase tracking-wide">
                      {item.cspLabel || "CSP"}
                    </span>
                  )}
                </div>

                {/* Controls */}
                <div className="shrink-0">
                  {qtyInCart > 0 ? (
                    <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => onDecrementItem(item.productName || item.name || "", qtyInCart)}
                        className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                      >
                        <Minus size={10} strokeWidth={3} />
                      </button>
                      <span className="text-xs font-bold px-0.5 text-slate-800 min-w-[12px] text-center">
                        {qtyInCart}
                      </span>
                      <button
                        type="button"
                        onClick={() => onIncrementItem(item, qtyInCart)}
                        className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                      >
                        <Plus size={10} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={item.trackStock && Number(item.stockQty ?? 0) <= 0}
                      onClick={() => onAddItem(item)}
                      className="flex h-7 px-2.5 items-center justify-center gap-0.5 rounded-lg border border-indigo-600 bg-white text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-600 hover:text-white transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-indigo-600"
                    >
                      <Plus size={10} strokeWidth={3} /> ADD
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
