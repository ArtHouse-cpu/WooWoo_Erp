import { useEffect, useState, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { InvoiceItem } from "./types";
import { handleGetProducts, handleCreateProduct } from "@/services/apiClient";
import Swal from "sweetalert2";
import CreateProductModal from "@/features/sales/components/invoice/Modal/CreateProductModal";
import CatalogueItemLabel from "@/features/sales/components/CatalogueItemLabel";

export type DraftItem = {
  name: string;
  qty: string;
  price: string;
  discount: string;
  image: string;
};

type Props = {
  draft: DraftItem;
  items: InvoiceItem[];
  onDraftChange: (field: keyof DraftItem, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: number) => void;
};

const inputStyle =
  "h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-500";

export default function PurchaseReturnServicesSection({
  draft,
  items,
  onDraftChange,
  onAddItem,
  onRemoveItem,
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

    const { products = [] } = await handleGetProducts({
      search: searchText,
      type: "product",
      page: 1,
      limit: 50,
      signal,
    });

    const filteredProducts = products.filter(
      (item: any) => item.itemType === "product" && item.type === "product"
    );

    const term = searchText.trim().toLowerCase();
    const expanded: any[] = [];

    for (const product of filteredProducts) {
      const variants = Array.isArray(product.variants)
        ? product.variants.filter((v: any) => String(v?.name || "").trim())
        : [];
      const parentName = String(product.productName || "").trim();

      const parentHit =
        !term ||
        parentName.toLowerCase().includes(term) ||
        String(product.itemCode || "")
          .toLowerCase()
          .includes(term) ||
        String(product.barCode || "")
          .toLowerCase()
          .includes(term);

      // No variants → keep parent product row.
      if (variants.length === 0) {
        if (parentHit) expanded.push(product);
        continue;
      }

      // Has variants → only named variant rows (Parent - Variant).
      const variantsToShow =
        !term || parentHit
          ? variants
          : variants.filter((variant: any) => {
              const variantName = String(variant?.name || "").trim();
              const barcode = String(variant?.barcode || "").trim();
              return (
                variantName.toLowerCase().includes(term) ||
                barcode.toLowerCase().includes(term)
              );
            });

      for (const variant of variantsToShow) {
        const variantName = String(variant?.name || "").trim();
        if (!variantName) continue;
        expanded.push({
          ...product,
          _id: `${product._id}::${variantName}`,
          productName: `${parentName} - ${variantName}`,
          sellingPrice: Number(
            variant.sellingPrice ?? product.sellingPrice ?? 0,
          ),
          purchasePrice: Number(
            variant.purchasePrice ?? product.purchasePrice ?? 0,
          ),
          variantName,
          parentProductName: parentName,
        });
      }
    }

    setProducts(expanded);
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
    onDraftChange("name", product.productName);
    onDraftChange("price", String(product.sellingPrice ?? 0));
    onDraftChange("image", String(product.image ?? product.imageUrl ?? ""));
    setDropdownOpen(false);
  };

  const submitNewProduct = async (formData: FormData) => {
    try {
      setCreating(true);
      const response = await handleCreateProduct(formData);
      const prod = response?.product;
      if (prod) {
        onDraftChange("name", prod.productName);
        onDraftChange("price", String(prod.sellingPrice ?? 0));
        onDraftChange("image", String(prod.image ?? prod.imageUrl ?? ""));
      }
      setShowCreateModal(false);
      Swal.fire("Product created", "Product has been successfully added.", "success");
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.message ?? "Could not create product.", "error");
    } finally {
      setCreating(false);
    }
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
                      <CatalogueItemLabel
                        item={{
                          productName: p.productName,
                          name: p.productName,
                          variantName: p.variantName,
                          parentProductName: p.parentProductName,
                        }}
                      />
                      <div className="mt-0.5 text-xs text-gray-500">
                        ₹{p.sellingPrice}
                        {p.stockQty ? ` | Qty: ${p.stockQty}` : ""}
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

        <input
          value={draft.qty}
          onChange={(e) => onDraftChange("qty", e.target.value)}
          type="number"
          min={1}
          placeholder="Qty"
          className={`${inputStyle} md:col-span-2`}
        />
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
          className={`${inputStyle} md:col-span-2`}
        />
        <button
          onClick={onAddItem}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white md:col-span-12 lg:col-span-2"
        >
          <Plus size={14} /> Add to Bill
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Product Name</th>
              <th className="px-3 py-2 text-right">Qty</th>
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
                  Search or add products to start creating return.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const lineTotal = item.qty * item.unitPrice - item.discount;
                return (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">{item.productName}</td>
                    <td className="px-3 py-2 text-right">{item.qty}</td>
                    <td className="px-3 py-2 text-right">₹ {item.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-red-500">- ₹ {item.discount.toFixed(2)}</td>
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
