import { useEffect, useMemo, useState } from "react";
import { X, Printer, ShoppingCart, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import {
  handleCreateProduct,
  handleGetProducts,
} from "@/services/apiClient";
import CreateProductModal from "../components/invoice/Modal/CreateProductModal";
import { useDebounce } from "@/hooks/useDebounce";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";

type PosItem = {
  id: number;
  name: string;
  qty: number;
  price: number;
  discount: number;
  stockQty?: number;
  image?: string;
};

export default function CreatePosScreen({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = open ?? internalOpen;
  const requestClose = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText.trim(), 300);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [draftQty, setDraftQty] = useState("1");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [items, setItems] = useState<PosItem[]>([]);

  const handleChange = (
    id: number,
    field: keyof Pick<PosItem, "qty" | "price" | "discount">,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: Number(value) } : it)),
    );
  };

  const addItem = () => {
    const name = searchText.trim();
    if (!name) {
      Swal.fire(
        "Missing product",
        "Please select or type a product name.",
        "warning",
      );
      return;
    }

    const qty = Number(draftQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      Swal.fire("Invalid qty", "Quantity must be greater than 0.", "warning");
      return;
    }

    const price = Number(selectedProduct?.sellingPrice ?? 0);
    setItems((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1,
        name,
        qty,
        price,
        discount: 0,
        stockQty: Number(selectedProduct?.stockQty ?? 0),
        image: selectedProduct?.imageUrl || (selectedProduct?.images && selectedProduct?.images[0]) || "",
      },
    ]);

    setSearchText("");
    setDraftQty("1");
    setSelectedProduct(null);
    setProducts([]);
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const openCheckoutModal = () => {
    if (items.length === 0) {
      Swal.fire("No items", "Please add at least one item before checkout.", "warning");
      return;
    }
    setOpenCheckout(true);
  };

  const calculateTotal = (item: PosItem) => {
    return item.qty * item.price - item.discount;
  };

  const grandTotal = useMemo(
    () => items.reduce((acc, item) => acc + calculateTotal(item), 0),
    [items],
  );

  const submitNewProduct = async (formData: FormData) => {
    try {
      setCreating(true);
      await handleCreateProduct(formData);
      setShowCreateModal(false);
      Swal.fire(
        "Product created",
        "Product has been successfully added.",
        "success",
      );
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

  useEffect(() => {
    const term = debouncedSearchText;
    if (!term) {
      setProducts([]);
      setSelectedProduct(null);
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        setLoadingProducts(true);
        const response = await handleGetProducts(term, controller.signal);
        setProducts(Array.isArray(response?.products) ? response.products : []);
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedSearchText]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.currentTarget === e.target) requestClose();
        }}
      >
        <div className="max-h-[92vh] w-[95%] max-w-6xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-xl font-semibold">POS Billing</h2>
            <button
              type="button"
              onClick={requestClose}
              className="rounded-md p-1 text-gray-600 hover:bg-gray-100"
              aria-label="Close"
            >
              <X />
            </button>
          </div>

          {/* Search Section */}
          <div className="flex items-center gap-3 mt-6 w-full">
            {/* Search + Qty */}
            <div className="flex items-center gap-2 flex-1">
              <input
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setSelectedProduct(null);
                }}
                placeholder="Search product or scan barcode..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />

              <input
                type="number"
                placeholder="Qty"
                value={draftQty}
                onChange={(e) => setDraftQty(e.target.value)}
                className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Add Item Button */}
            <button
              type="button"
              onClick={addItem}
              className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition"
            >
              Add Item
            </button>

            {/* Add New Product */}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="text-violet-600 text-sm font-medium hover:underline whitespace-nowrap"
            >
              + Add New Product
            </button>
          </div>

          {/* Search Results (optional UI) */}
          {(loadingProducts || products.length > 0) && (
            <div className="mt-2 rounded-xl border border-gray-200 bg-white">
              {loadingProducts ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  Searching...
                </div>
              ) : (
                <div className="max-h-56 overflow-auto">
                  {products.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => {
                        setSearchText(p.productName ?? "");
                        setSelectedProduct(p);
                        setProducts([]);
                      }}
                      className="flex w-full flex-col gap-0.5 border-b border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium text-gray-800">
                        {p.productName}
                      </span>
                      <span className="text-xs text-gray-500">
                        ₹{p.sellingPrice ?? 0} |{" "}
                        {p.stockQty ? `Qty: ${p.stockQty}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div className="mt-6 border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-green-600">
                        Avl Stock: {(item.stockQty ?? 0) - item.qty}
                      </div>
                    </td>

                    {/* Qty Input */}
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) =>
                          handleChange(item.id, "qty", e.target.value)
                        }
                        className="w-16 border rounded px-2 py-1 text-center"
                      />
                    </td>

                    {/* Price Input */}
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          handleChange(item.id, "price", e.target.value)
                        }
                        className="w-20 border rounded px-2 py-1 text-center"
                      />
                    </td>

                    {/* Discount Input */}
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) =>
                          handleChange(item.id, "discount", e.target.value)
                        }
                        className="w-20 border rounded px-2 py-1 text-center"
                      />
                    </td>

                    {/* Total */}
                    <td className="p-3 text-center font-semibold">
                      ₹{calculateTotal(item)}
                    </td>

                    {/* Delete */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="inline-flex rounded p-1 text-red-600 hover:bg-red-50"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Billing Summary */}
          <div className="mt-6 border-t pt-4 flex flex-col gap-4">
            {/* Top Row */}
            <div className="flex items-center justify-between">
              {/* Left: Items Count */}
              <div className="text-sm text-gray-500">
                Items:{" "}
                <span className="font-medium text-gray-700">
                  {items.length}
                </span>
              </div>

              {/* Center: Actions */}
              <div className="flex items-center gap-2">
                <button className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">
                  Cancel
                </button>

                <button className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-100 transition">
                  Save Draft
                </button>

                <button className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-100 transition">
                  <Printer size={16} />
                  Print
                </button>
              </div>

              {/* Right: Total */}
              <div className="text-right">
                <div className="text-xs text-gray-500">Grand Total</div>
                <div className="text-xl font-bold text-gray-900">
                  ₹ {grandTotal.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Bottom Row (Checkout CTA) */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openCheckoutModal}
                disabled={items.length === 0}
                className="bg-green-600 text-white px-8 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-green-700 transition shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
              >
                <ShoppingCart size={18} />
                Checkout
              </button>
            </div>
          </div>

          {showCreateModal && (
            <CreateProductModal
              onClose={() => setShowCreateModal(false)}
              onSubmit={submitNewProduct}
              loading={creating}
            />
          )}
          <CheckoutModal
            open={openCheckout}
            onClose={() => setOpenCheckout(false)}
            grandTotal={grandTotal}
            items={items}
            onSaved={() => {
              setItems([]);
              setSearchText("");
              setDraftQty("1");
              setSelectedProduct(null);
              setProducts([]);
              setOpenCheckout(false);
            }}
          />
        </div>
      </div>
    </>
  );
}
