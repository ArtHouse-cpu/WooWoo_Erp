import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { SpacePayload } from "@/services/apiClient";

export type SpaceFormPayload = {
  name: string;
  category: string;
  price: number;
  capacity: number;
  status: "Available" | "Booked" | "Maintenance";
  description: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: SpaceFormPayload, imageFile: File | null) => Promise<void>;
  loading?: boolean;
  initialSpace?: SpacePayload | null;
};

const SPACE_CATEGORIES = [
  "Studio",
  "Workshop",
  "Meeting Room",
  "Gallery",
  "Outdoor",
];

const emptyForm: SpaceFormPayload = {
  name: "",
  category: "Studio",
  price: 0,
  capacity: 1,
  status: "Available",
  description: "",
};

export default function AddSpaceModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialSpace = null,
}: Props) {
  const [form, setForm] = useState<SpaceFormPayload>(emptyForm);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialSpace) {
      setForm({
        name: String(initialSpace.name || ""),
        category: String(initialSpace.category || "Studio"),
        price: Number(initialSpace.price || 0),
        capacity: Number(initialSpace.capacity || 1),
        status: (initialSpace.status as SpaceFormPayload["status"]) || "Available",
        description: String(initialSpace.description || ""),
      });
      setPreview(initialSpace.imageUrl || null);
      setImageFile(null);
    } else {
      setForm(emptyForm);
      setPreview(null);
      setImageFile(null);
    }
  }, [open, initialSpace]);

  if (!open) return null;

  const isEdit = Boolean(initialSpace?._id);

  const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || loading) return;
    await onSubmit(
      {
        ...form,
        name: form.name.trim(),
        price: Number(form.price || 0),
        capacity: Number(form.capacity || 1),
      },
      imageFile,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target && !loading) onClose();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-xl font-semibold text-gray-800">
          {isEdit ? "Update Space" : "Add Space"}
        </h2>
        <p className="mb-5 text-sm text-gray-500">
          {isEdit
            ? "Edit bookable space details."
            : "Create a new bookable space for the catalogue."}
        </p>

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-full p-2 transition hover:bg-gray-100 disabled:opacity-50"
          aria-label="Close"
        >
          <X size={22} />
        </button>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Space Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Creative Studio A"
                required
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black"
              >
                {SPACE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value as SpaceFormPayload["status"],
                  }))
                }
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black"
              >
                <option value="Available">Available</option>
                <option value="Booked">Booked</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Price / Hour (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: Number(e.target.value || 0) }))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 p-3 pl-8 outline-none transition focus:ring-2 focus:ring-black"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Capacity (people)
              </label>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) =>
                  setForm((p) => ({ ...p, capacity: Number(e.target.value || 1) }))
                }
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black"
                placeholder="1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Amenities, size, or booking notes"
                className="w-full resize-none rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Space Image
              </label>
              <label
                htmlFor="space-image"
                className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-400 p-4 transition hover:bg-gray-50"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Space preview"
                    className="h-28 w-28 rounded-lg object-cover"
                  />
                ) : (
                  <>
                    <ImagePlus size={36} className="mb-2 text-gray-500" />
                    <p className="text-sm text-gray-500">Click to upload space image</p>
                  </>
                )}
                <input
                  id="space-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Space"
                  : "Add Space"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
