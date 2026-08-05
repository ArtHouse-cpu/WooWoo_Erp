import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { handleGetCategories } from "@/services/apiClient";

type Category = {
  _id: string;
  name: string;
};

type Props = {
  onClose: () => void;
};

export default function StockInModal({ onClose }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await handleGetCategories(controller.signal);
        const list = Array.isArray(res?.categories) ? res.categories : [];
        setCategories(
          list
            .filter((c: Category) => c?._id && c?.name)
            .map((c: Category) => ({ _id: String(c._id), name: String(c.name) })),
        );
      } catch (error: unknown) {
        if ((error as { name?: string })?.name === "CanceledError") return;
        console.error("Failed to fetch categories:", error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    void fetchCategories();
    return () => controller.abort();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl animate-fadeIn overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-3 text-xl font-semibold">Stock In</h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer rounded-full p-2 transition hover:bg-gray-100"
        >
          <X size={22} />
        </button>
        <div className="space-y-2">
          <div className="text-[16px] font-semibold text-gray-700">
            Quantity Information
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Enter Quantity"
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Record Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block font-medium text-gray-700">
              Select Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loadingCategories}
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-black disabled:cursor-not-allowed disabled:bg-gray-50"
            >
              <option value="">
                {loadingCategories ? "Loading categories..." : "Choose category"}
              </option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {!loadingCategories && categories.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">No categories found.</p>
            )}
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700">
              Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Enter Remarks"
              className="w-full resize-none rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="text-[16px] font-semibold text-gray-700">
            Price Details (Optional)
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Purchase Price
              </label>
              <input
                type="number"
                placeholder="Enter purchase price"
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Stock In Value
              </label>
              <input
                type="number"
                placeholder="Enter stock in value"
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex w-full justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-lg border border-gray-300 px-5 py-3 text-[15px] font-semibold transition hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            type="button"
            className="w-full cursor-pointer rounded-lg bg-black px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-gray-800"
          >
            Add Quantity
          </button>
        </div>
      </div>
    </div>
  );
}
