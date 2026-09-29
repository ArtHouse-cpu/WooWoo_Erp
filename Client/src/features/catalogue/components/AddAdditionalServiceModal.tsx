import { useEffect, useState, type FormEvent } from "react";
import {
  Archive,
  Camera,
  Car,
  Coffee,
  Loader2,
  Lock,
  Megaphone,
  Minus,
  Plus,
  Printer,
  Projector,
  Shield,
  Sparkles,
  UserRound,
  Users,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import type { AdditionalServiceItem } from "@/services/apiClient";

export const ICON_OPTIONS = [
  { key: "Car", label: "Parking (Car)", icon: Car },
  { key: "Lock", label: "Locker (Lock)", icon: Lock },
  { key: "Printer", label: "Printing (Printer)", icon: Printer },
  { key: "Users", label: "Meeting Room (Users)", icon: Users },
  { key: "Archive", label: "Storage (Archive)", icon: Archive },
  { key: "Megaphone", label: "Marketing Support (Megaphone)", icon: Megaphone },
  { key: "Projector", label: "Projector (Projector)", icon: Projector },
  { key: "Volume2", label: "Sound System (Speaker)", icon: Volume2 },
  { key: "Camera", label: "Media Shoot (Camera)", icon: Camera },
  { key: "UserRound", label: "Event Coordinator (Person)", icon: UserRound },
  { key: "Wifi", label: "High-speed Wifi", icon: Wifi },
  { key: "Coffee", label: "Beverage / Coffee", icon: Coffee },
  { key: "Shield", label: "Security (Shield)", icon: Shield },
  { key: "Sparkles", label: "General / Amenity", icon: Sparkles },
];

export const getIconComponent = (iconName?: string) => {
  const found = ICON_OPTIONS.find((i) => i.key === iconName);
  return found ? found.icon : Car;
};

export const UNIT_OPTIONS = [
  { value: "per hour", label: "per hour" },
  { value: "per month", label: "per month" },
  { value: "per 100 pages", label: "per 100 pages" },
  { value: "per booking", label: "per booking" },
  { value: "per day", label: "per day" },
];

export type AdditionalServiceFormData = {
  title: string;
  amount: number;
  unit: string;
  icon: string;
  spaceType: "all" | "coworking" | "exclusive";
};

// Alias for backwards compatibility
export type AdditionalServiceFormPayload = AdditionalServiceFormData;

export type AdditionalServiceInitialData = AdditionalServiceItem;

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AdditionalServiceFormData) => Promise<void>;
  loading?: boolean;
  initialData?: AdditionalServiceItem | null;
};

const emptyForm: AdditionalServiceFormData = {
  title: "",
  amount: 500,
  unit: "per month",
  icon: "Car",
  spaceType: "all",
};

export default function AddAdditionalServiceModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialData = null,
}: Props) {
  const [form, setForm] = useState<AdditionalServiceFormData>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        title: initialData.title || initialData.name || "",
        amount: Number(initialData.amount ?? initialData.price ?? 0),
        unit: initialData.unit || "per month",
        icon: initialData.icon || "Car",
        spaceType: initialData.spaceType || "all",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, initialData]);

  if (!open) return null;

  const isEdit = Boolean(initialData?._id);
  const SelectedIcon = getIconComponent(form.icon);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || loading) return;
    await onSubmit({
      ...form,
      title: form.title.trim(),
      amount: Number(form.amount || 0),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target && !loading) onClose();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900">
          {isEdit ? "Edit Additional Service" : "Add Additional Service"}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Configure additional service title, amount, billing unit, and icon for spaces.
        </p>

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Title / Service Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Parking, Meeting Room, Printing, Storage"
              required
              disabled={loading}
              autoFocus
              className="h-11 w-full rounded-xl border border-gray-300 px-3.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-gray-400">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))
                  }
                  required
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-gray-300 pl-8 pr-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:opacity-60"
                  placeholder="500"
                />
              </div>
            </div>

            {/* Dropdown for Unit */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Unit / Frequency <span className="text-red-500">*</span>
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                disabled={loading}
                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:opacity-60"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Icon Dropdown */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Select Icon <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-2.5 flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                  <SelectedIcon size={16} />
                </div>
                <select
                  value={form.icon}
                  onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:opacity-60"
                >
                  {ICON_OPTIONS.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Space Type */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Applies To Space
              </label>
              <select
                value={form.spaceType}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    spaceType: e.target.value as "all" | "coworking" | "exclusive",
                  }))
                }
                disabled={loading}
                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:opacity-60"
              >
                <option value="all">All Spaces (Coworking & Exclusive)</option>
                <option value="coworking">Coworking Spaces Only</option>
                <option value="exclusive">Exclusive Spaces Only</option>
              </select>
            </div>
          </div>

          {/* Live Card Preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="mb-2 block text-xs font-medium text-slate-500">
              Space Modal Card Preview:
            </span>
            <div className="mx-auto w-36 rounded-2xl border border-indigo-300 bg-indigo-50/20 p-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100/70 text-indigo-600">
                  <SelectedIcon size={16} />
                </div>
                <div className="h-4 w-4 rounded border border-indigo-400 bg-indigo-600" />
              </div>

              <div className="my-2 min-h-[36px]">
                <p className="truncate text-xs font-bold leading-tight text-slate-800">
                  {form.title.trim() || "Service Title"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  ₹{Number(form.amount || 0).toLocaleString("en-IN")} / {form.unit}
                </p>
              </div>

              <div className="flex h-7 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex h-full w-7 items-center justify-center border-r border-slate-100 text-slate-400">
                  <Minus size={12} />
                </div>
                <span className="flex-1 text-center text-xs font-semibold text-slate-700">
                  1
                </span>
                <div className="flex h-full w-7 items-center justify-center border-l border-slate-100 text-slate-400">
                  <Plus size={12} />
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.title.trim() || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isEdit ? "Update Service" : "Add Additional Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
