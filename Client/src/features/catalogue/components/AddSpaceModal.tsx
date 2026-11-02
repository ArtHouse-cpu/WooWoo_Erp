import { useEffect, useState, useMemo, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Loader2, X, Sparkles, Calendar, Video } from "lucide-react";
import type { SpacePayload } from "@/services/apiClient";
import { closeIfConfirmed } from "@/utils/confirmClose";

export type SpaceDay = "Weekday" | "Weekend";
export type SpaceStatus = "Available" | "Booked" | "Maintenance";
export type DayOption = "Weekday" | "Weekend" | "Both";
export type SpaceType = "Exclusive" | "Coworking";

export type SpaceFormPayload = {
  name: string;
  spaceCode?: string;
  spaceType?: SpaceType | string;
  category: string;
  capacity: number;
  description: string;
  createBothDays?: boolean;
  weekdayPrice?: number;
  weekdayStatus?: SpaceStatus;
  weekendPrice?: number;
  weekendStatus?: SpaceStatus;
  day?: SpaceDay;
  price?: number;
  status?: SpaceStatus;
};

export type SpaceMediaSelection = {
  imageFiles: File[];
  existingImages: string[];
  videoFile: File | null;
  removeVideo: boolean;
};

type SpaceImageItem = {
  id: string;
  url: string;
  file?: File;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: SpaceFormPayload, media: SpaceMediaSelection) => Promise<void>;
  loading?: boolean;
  initialSpace?: SpacePayload | null;
  existingSpaces?: SpacePayload[];
};

export const EXCLUSIVE_CATEGORIES = [
  "Studio",
  "Workshop",
  "Meeting Room",
  "Gallery",
  "Outdoor",
  "Event Space",
  "Private Office",
];

export const COWORKING_CATEGORIES = [
  "Hot Desk",
  "Dedicated Desk",
  "Desk Pass",
  "Flexi Desk",
  "Meeting Pod",
  "Open Workspace",
];

export const generateNextSpaceCode = (spaces?: SpacePayload[]): string => {
  if (spaces && spaces.length > 0) {
    let maxNum = 0;
    for (const s of spaces) {
      const code = s.spaceCode || "";
      const match = code.match(/SP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!Number.isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    if (maxNum > 0) {
      return `SP-${String(maxNum + 1).padStart(3, "0")}`;
    }
    return `SP-${String(spaces.length + 1).padStart(3, "0")}`;
  }
  return "SP-001";
};

const normalizeDay = (value?: string | null): SpaceDay => {
  const raw = String(value || "").trim().toLowerCase();
  return raw === "weekend" ? "Weekend" : "Weekday";
};

export default function AddSpaceModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialSpace = null,
  existingSpaces = [],
}: Props) {
  const [name, setName] = useState("");
  const [spaceCode, setSpaceCode] = useState("");
  const [spaceType, setSpaceType] = useState<SpaceType>("Exclusive");
  const [category, setCategory] = useState("Studio");
  const [capacity, setCapacity] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<SpaceImageItem[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [removeVideo, setRemoveVideo] = useState(false);

  // Day selection mode: "Weekday" | "Weekend" | "Both"
  const [dayMode, setDayMode] = useState<DayOption>("Weekday");

  // Single day fields (used when dayMode is "Weekday" or "Weekend", or in edit mode)
  const [price, setPrice] = useState<number>(0);
  const [status, setStatus] = useState<SpaceStatus>("Available");

  // Dual day fields (used when dayMode is "Both")
  const [weekdayPrice, setWeekdayPrice] = useState<number>(0);
  const [weekdayStatus, setWeekdayStatus] = useState<SpaceStatus>("Available");
  const [weekendPrice, setWeekendPrice] = useState<number>(0);
  const [weekendStatus, setWeekendStatus] = useState<SpaceStatus>("Available");

  const isEdit = Boolean(initialSpace?._id);

  const availableCategories = useMemo(() => {
    const base =
      spaceType === "Coworking" ? COWORKING_CATEGORIES : EXCLUSIVE_CATEGORIES;
    if (category && !base.includes(category)) {
      return [category, ...base];
    }
    return base;
  }, [spaceType, category]);

  const handleSpaceTypeChange = (newType: SpaceType) => {
    setSpaceType(newType);
    const targetCategories =
      newType === "Coworking" ? COWORKING_CATEGORIES : EXCLUSIVE_CATEGORIES;
    if (!targetCategories.includes(category)) {
      setCategory(targetCategories[0]);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (initialSpace) {
      setName(String(initialSpace.name || ""));
      setSpaceCode(
        initialSpace.spaceCode ||
          `SP-${String(initialSpace._id || "").slice(-5).toUpperCase()}`,
      );

      const rawType = String(initialSpace.spaceType || "").trim().toLowerCase();
      let detectedType: SpaceType = "Exclusive";
      if (rawType === "coworking") {
        detectedType = "Coworking";
      } else if (rawType === "exclusive") {
        detectedType = "Exclusive";
      } else {
        const cat = String(initialSpace.category || "").toLowerCase();
        const n = String(initialSpace.name || "").toLowerCase();
        if (
          cat.includes("cowork") ||
          n.includes("cowork") ||
          n.includes("hot desk") ||
          n.includes("desk pass")
        ) {
          detectedType = "Coworking";
        }
      }
      setSpaceType(detectedType);
      setCategory(
        String(
          initialSpace.category ||
            (detectedType === "Coworking" ? "Hot Desk" : "Studio"),
        ),
      );
      setCapacity(Number(initialSpace.capacity || 1));
      setDescription(String(initialSpace.description || ""));
      const savedImages = Array.isArray(initialSpace.images) && initialSpace.images.length
        ? initialSpace.images
        : initialSpace.imageUrl
          ? [initialSpace.imageUrl]
          : [];
      setImages(savedImages.filter(Boolean).map((url) => ({ id: url, url })));
      setVideoFile(null);
      setVideoPreview(initialSpace.videoUrl || null);
      setRemoveVideo(false);

      const d = normalizeDay(initialSpace.day);
      setDayMode(d);
      setPrice(Number(initialSpace.price || 0));
      setStatus((initialSpace.status as SpaceStatus) || "Available");
    } else {
      setName("");
      setSpaceCode(generateNextSpaceCode(existingSpaces));
      setSpaceType("Exclusive");
      setCategory("Studio");
      setCapacity(1);
      setDescription("");
      setImages([]);
      setVideoFile(null);
      setVideoPreview(null);
      setRemoveVideo(false);

      setDayMode("Weekday");
      setPrice(0);
      setStatus("Available");

      setWeekdayPrice(0);
      setWeekdayStatus("Available");
      setWeekendPrice(0);
      setWeekendStatus("Available");
    }
  }, [open, initialSpace, existingSpaces]);

  if (!open) return null;

  const handleRegenerateCode = () => {
    const nextCode = generateNextSpaceCode(existingSpaces);
    if (spaceCode === nextCode) {
      const rand = Math.floor(100 + Math.random() * 900);
      setSpaceCode(`SP-${rand}`);
    } else {
      setSpaceCode(nextCode);
    }
  };

  const mediaSelection = (): SpaceMediaSelection => ({
    imageFiles: images.flatMap((item) => (item.file ? [item.file] : [])),
    existingImages: images
      .filter((item) => !item.file && /^https?:\/\//i.test(item.url))
      .map((item) => item.url),
    videoFile,
    removeVideo,
  });

  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!picked.length) return;
    setImages((current) =>
      [
        ...current,
        ...picked.map((file) => ({
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          url: URL.createObjectURL(file),
          file,
        })),
      ].slice(0, 8),
    );
    e.target.value = "";
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  };

  const handleVideo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoPreview?.startsWith("blob:")) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setRemoveVideo(false);
    e.target.value = "";
  };

  const clearVideo = () => {
    if (videoPreview?.startsWith("blob:")) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setRemoveVideo(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;

    if (!isEdit && dayMode === "Both") {
      await onSubmit(
        {
          name: name.trim(),
          spaceCode: spaceCode.trim() || undefined,
          spaceType,
          category,
          capacity: Math.max(1, Number(capacity || 1)),
          description: description.trim(),
          createBothDays: true,
          weekdayPrice: Number(weekdayPrice || 0),
          weekdayStatus,
          weekendPrice: Number(weekendPrice || 0),
          weekendStatus,
        },
        mediaSelection(),
      );
      return;
    }

    // Single day mode (Weekday or Weekend, or Edit mode)
    await onSubmit(
      {
        name: name.trim(),
        spaceCode: spaceCode.trim() || undefined,
        spaceType,
        category,
        capacity: Math.max(1, Number(capacity || 1)),
        description: description.trim(),
        day: dayMode === "Weekend" ? "Weekend" : "Weekday",
        price: Number(price || 0),
        status,
      },
      mediaSelection(),
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target && !loading) void closeIfConfirmed(onClose);
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-xl font-semibold text-gray-800">
          {isEdit ? "Update Space" : "Add Space"}
        </h2>
        <p className="mb-5 text-sm text-gray-500">
          {isEdit
            ? "Edit bookable space details."
            : "Create a new bookable space. Select Weekday, Weekend, or Both from the Day dropdown."}
        </p>

        <button
          type="button"
          onClick={() => void closeIfConfirmed(onClose)}
          disabled={loading}
          className="absolute right-4 top-4 rounded-full p-2 transition hover:bg-gray-100 disabled:opacity-50"
          aria-label="Close"
        >
          <X size={22} />
        </button>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Space Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Space Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Creative Studio A"
                required
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Space Code (Auto-generated adjacent to space name) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Space Code
                </label>
                <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-700 border border-indigo-100">
                  Auto-generated
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  value={spaceCode}
                  onChange={(e) => setSpaceCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SP-001"
                  className="w-full rounded-lg border border-gray-300 p-3 pr-10 font-mono text-sm uppercase outline-none transition focus:ring-2 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="absolute right-2.5 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition"
                  title="Regenerate space code"
                >
                  <Sparkles size={16} />
                </button>
              </div>
            </div>

            {/* Space Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Space Type <span className="text-red-500">*</span>
              </label>
              <select
                value={spaceType}
                onChange={(e) =>
                  handleSpaceTypeChange(e.target.value as SpaceType)
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none transition focus:ring-2 focus:ring-black"
              >
                <option value="Exclusive">Exclusive Space</option>
                <option value="Coworking">Coworking Space</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none transition focus:ring-2 focus:ring-black"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Capacity */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Capacity (people)
              </label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value || 1))}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black"
                placeholder="1"
              />
            </div>

            {/* Day Dropdown */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Day <span className="text-red-500">*</span>
              </label>
              <select
                value={dayMode}
                onChange={(e) => setDayMode(e.target.value as DayOption)}
                disabled={isEdit}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black disabled:bg-gray-100"
              >
                <option value="Weekday">Weekday (Mon – Fri)</option>
                <option value="Weekend">Weekend (Sat – Sun)</option>
                {!isEdit && (
                  <option value="Both">Both (Weekday &amp; Weekend)</option>
                )}
              </select>
            </div>

            {/* If Single Day: Show Price and Status */}
            {dayMode !== "Both" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">₹</span>
                    <input
                      type="number"
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value || 0))}
                      required
                      className="w-full rounded-lg border border-gray-300 p-3 pl-8 outline-none transition focus:ring-2 focus:ring-black"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SpaceStatus)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none transition focus:ring-2 focus:ring-black"
                  >
                    <option value="Available">Available</option>
                    <option value="Booked">Booked</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* If Both Days selected: Show side-by-side cards */}
          {dayMode === "Both" && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
              <div>
                <label className="block text-sm font-semibold text-gray-800">
                  Dual Pricing &amp; Status <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500">
                  Configure separate rates and status for Weekday and Weekend. Both spaces will be created.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 pt-1">
                {/* Weekday Box */}
                <div className="rounded-xl border border-sky-200 bg-white p-3 shadow-xs ring-1 ring-sky-100">
                  <div className="mb-2.5 flex items-center gap-1.5">
                    <Calendar size={15} className="text-sky-600" />
                    <span className="font-semibold text-sm text-gray-800">Weekday</span>
                    <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[10px] font-semibold text-sky-700">
                      Mon – Fri
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Weekday Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs text-gray-500">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={weekdayPrice}
                          onChange={(e) =>
                            setWeekdayPrice(Number(e.target.value || 0))
                          }
                          required
                          placeholder="0"
                          className="h-9 w-full rounded-lg border border-gray-300 pl-7 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-black"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Weekday Status
                      </label>
                      <select
                        value={weekdayStatus}
                        onChange={(e) =>
                          setWeekdayStatus(e.target.value as SpaceStatus)
                        }
                        className="h-9 w-full rounded-lg border border-gray-300 px-2.5 text-xs outline-none transition focus:ring-2 focus:ring-black"
                      >
                        <option value="Available">Available</option>
                        <option value="Booked">Booked</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Weekend Box */}
                <div className="rounded-xl border border-violet-200 bg-white p-3 shadow-xs ring-1 ring-violet-100">
                  <div className="mb-2.5 flex items-center gap-1.5">
                    <Calendar size={15} className="text-violet-600" />
                    <span className="font-semibold text-sm text-gray-800">Weekend</span>
                    <span className="rounded bg-violet-100 px-1.5 py-0.2 text-[10px] font-semibold text-violet-700">
                      Sat – Sun
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Weekend Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs text-gray-500">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={weekendPrice}
                          onChange={(e) =>
                            setWeekendPrice(Number(e.target.value || 0))
                          }
                          required
                          placeholder="0"
                          className="h-9 w-full rounded-lg border border-gray-300 pl-7 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-black"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Weekend Status
                      </label>
                      <select
                        value={weekendStatus}
                        onChange={(e) =>
                          setWeekendStatus(e.target.value as SpaceStatus)
                        }
                        className="h-9 w-full rounded-lg border border-gray-300 px-2.5 text-xs outline-none transition focus:ring-2 focus:ring-black"
                      >
                        <option value="Available">Available</option>
                        <option value="Booked">Booked</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Amenities, size, or booking notes"
              className="w-full resize-none rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Space images
            </label>
            <label
              htmlFor="space-images"
              className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-400 p-4 transition hover:bg-gray-50"
            >
              <ImagePlus size={36} className="mb-2 text-gray-500" />
              <p className="text-sm text-gray-500">
                Upload up to 8 photos
              </p>
              <input
                id="space-images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImages}
                className="hidden"
              />
            </label>
            {images.length > 0 ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {images.map((item, index) => (
                  <div key={item.id} className="relative">
                    <img
                      src={item.url}
                      alt=""
                      className="h-16 w-full rounded-lg object-cover"
                    />
                    {index === 0 ? (
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] font-semibold text-white">
                        Cover
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeImage(item.id)}
                      className="absolute right-1 top-1 rounded-full bg-white p-0.5 text-gray-700 shadow"
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Space video
            </label>
            {videoPreview ? (
              <video
                src={videoPreview}
                controls
                className="max-h-40 w-full rounded-lg border border-gray-200"
              />
            ) : (
              <label
                htmlFor="space-video"
                className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-400 p-4 transition hover:bg-gray-50"
              >
                <Video size={36} className="mb-2 text-gray-500" />
                <p className="text-sm text-gray-500">
                  Upload one mp4, webm, or mov
                </p>
              </label>
            )}
            <input
              id="space-video"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleVideo}
              className="hidden"
            />
            {videoPreview ? (
              <div className="mt-2 flex gap-3">
                <label
                  htmlFor="space-video"
                  className="cursor-pointer text-xs font-semibold text-slate-700"
                >
                  Replace video
                </label>
                <button
                  type="button"
                  onClick={clearVideo}
                  className="text-xs font-semibold text-rose-600"
                >
                  Remove video
                </button>
              </div>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => void closeIfConfirmed(onClose)}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Space"
                  : dayMode === "Both"
                    ? "Add Spaces (Both Days)"
                    : `Add Space (${dayMode})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
