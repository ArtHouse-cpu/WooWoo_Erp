import { useEffect, useState, useMemo, type ChangeEvent, type FormEvent } from "react";
import {
  Building2,
  Calendar,
  ChevronDown,
  CloudUpload,
  FileText,
  Hash,
  LayoutGrid,
  Loader2,
  Check,
  Play,
  Plus,
  RefreshCw,
  Tag,
  Users,
  Video,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import type { SpacePayload } from "@/services/apiClient";
import { uploadSpaceVideos } from "@/services/apiClient";
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
  updateBothDays?: boolean;
  weekdayId?: string;
  weekendId?: string;
  day?: SpaceDay;
  price?: number;
  status?: SpaceStatus;
};

export type SpaceMediaSelection = {
  imageFiles: File[];
  existingImages: string[];
  videoFiles: File[];
  existingVideos: string[];
  videoFile: File | null;
  removeVideo: boolean;
};

type SpaceImageItem = {
  id: string;
  url: string;
  file?: File;
};

type SpaceVideoItem = {
  id: string;
  url: string;
  file?: File;
};

const MAX_SPACE_VIDEOS = 4;

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
  const [videos, setVideos] = useState<SpaceVideoItem[]>([]);
  const [videoDurations, setVideoDurations] = useState<Record<string, string>>({});
  const [imageDrag, setImageDrag] = useState(false);
  const [videoDrag, setVideoDrag] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);

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
      const savedVideos =
        Array.isArray(initialSpace.videos) && initialSpace.videos.length
          ? initialSpace.videos
          : initialSpace.videoUrl
            ? [initialSpace.videoUrl]
            : [];
      setVideos(savedVideos.filter(Boolean).map((url) => ({ id: url, url })));

      const paired = initialSpace as SpacePayload & {
        weekday?: SpacePayload;
        weekend?: SpacePayload;
      };
      const d = normalizeDay(initialSpace.day);
      const savedPrice = Number(initialSpace.price || 0);
      const savedStatus = (initialSpace.status as SpaceStatus) || "Available";
      if (paired.weekday?._id && paired.weekend?._id) {
        setDayMode("Both");
        setPrice(Number(paired.weekday.price || 0));
        setStatus((paired.weekday.status as SpaceStatus) || "Available");
        setWeekdayPrice(Number(paired.weekday.price || 0));
        setWeekdayStatus((paired.weekday.status as SpaceStatus) || "Available");
        setWeekendPrice(Number(paired.weekend.price || 0));
        setWeekendStatus((paired.weekend.status as SpaceStatus) || "Available");
      } else {
        setDayMode(d);
        setPrice(savedPrice);
        setStatus(savedStatus);
        if (d === "Weekend") {
          setWeekendPrice(savedPrice);
          setWeekendStatus(savedStatus);
        } else {
          setWeekdayPrice(savedPrice);
          setWeekdayStatus(savedStatus);
        }
      }
    } else {
      setName("");
      setSpaceCode(generateNextSpaceCode(existingSpaces));
      setSpaceType("Exclusive");
      setCategory("Studio");
      setCapacity(1);
      setDescription("");
      setImages([]);
      setVideos([]);

      setDayMode("Both");
      setPrice(0);
      setStatus("Available");

      setWeekdayPrice(0);
      setWeekdayStatus("Available");
      setWeekendPrice(0);
      setWeekendStatus("Available");
    }
  }, [open, initialSpace, existingSpaces]);

  const weekdayOn = dayMode === "Weekday" || dayMode === "Both";
  const weekendOn = dayMode === "Weekend" || dayMode === "Both";

  const setDayEnabled = (day: SpaceDay, on: boolean) => {
    if (isEdit) return;
    const nextWeekday = day === "Weekday" ? on : weekdayOn;
    const nextWeekend = day === "Weekend" ? on : weekendOn;
    if (!nextWeekday && !nextWeekend) return;
    if (nextWeekday && nextWeekend) setDayMode("Both");
    else setDayMode(nextWeekday ? "Weekday" : "Weekend");
  };

  const formatDuration = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "";
    const total = Math.round(seconds);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  if (!open) return null;

  const fieldClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
  const saving = loading || uploadingVideos;

  const handleRegenerateCode = () => {
    const nextCode = generateNextSpaceCode(existingSpaces);
    if (spaceCode === nextCode) {
      const rand = Math.floor(100 + Math.random() * 900);
      setSpaceCode(`SP-${rand}`);
    } else {
      setSpaceCode(nextCode);
    }
  };

  const mediaSelection = (source = videos): SpaceMediaSelection => {
    const videoFiles = source.flatMap((item) => (item.file ? [item.file] : []));
    const existingVideos = source
      .filter((item) => !item.file && /^https?:\/\//i.test(item.url))
      .map((item) => item.url);
    return {
      imageFiles: images.flatMap((item) => (item.file ? [item.file] : [])),
      existingImages: images
        .filter((item) => !item.file && /^https?:\/\//i.test(item.url))
        .map((item) => item.url),
      videoFiles,
      existingVideos,
      videoFile: videoFiles[0] ?? null,
      removeVideo: videoFiles.length === 0 && existingVideos.length === 0,
    };
  };

  const addImageFiles = (files: File[]) => {
    const picked = files.filter((file) => file.type.startsWith("image/"));
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
  };

  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    addImageFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  };

  const addVideoFiles = (files: File[]) => {
    const picked = files.filter((file) => file.type.startsWith("video/"));
    if (!picked.length) return;
    setVideos((current) =>
      [
        ...current,
        ...picked.map((file) => ({
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          url: URL.createObjectURL(file),
          file,
        })),
      ].slice(0, MAX_SPACE_VIDEOS),
    );
  };

  const handleVideos = (e: ChangeEvent<HTMLInputElement>) => {
    addVideoFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const removeVideoItem = (id: string) => {
    setVideos((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading || uploadingVideos) return;

    let readyVideos = videos;
    if (videos.some((item) => item.file)) {
      try {
        setUploadingVideos(true);
        const pending = videos.filter((item) => item.file);
        const urls = await uploadSpaceVideos(
          pending.map((item) => item.file as File),
        );
        readyVideos = videos.map((item) => {
          const index = pending.findIndex((row) => row.id === item.id);
          if (index < 0) return item;
          if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
          return { id: item.id, url: urls[index] };
        });
        setVideos(readyVideos);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Could not upload the videos.";
        await Swal.fire("Video upload failed", message, "error");
        return;
      } finally {
        setUploadingVideos(false);
      }
    }
    const media = mediaSelection(readyVideos);

    const paired = initialSpace as (SpacePayload & {
      weekday?: SpacePayload;
      weekend?: SpacePayload;
    }) | null;
    if (isEdit && dayMode === "Both" && paired?.weekday?._id && paired.weekend?._id) {
      await onSubmit(
        {
          name: name.trim(),
          spaceCode: spaceCode.trim() || undefined,
          spaceType,
          category,
          capacity: Math.max(1, Number(capacity || 1)),
          description: description.trim(),
          updateBothDays: true,
          weekdayId: String(paired.weekday._id),
          weekendId: String(paired.weekend._id),
          weekdayPrice: Number(weekdayPrice || 0),
          weekdayStatus,
          weekendPrice: Number(weekendPrice || 0),
          weekendStatus,
        },
        media,
      );
      return;
    }

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
        media,
      );
      return;
    }

    await onSubmit(
      {
        name: name.trim(),
        spaceCode: spaceCode.trim() || undefined,
        spaceType,
        category,
        capacity: Math.max(1, Number(capacity || 1)),
        description: description.trim(),
        day: dayMode === "Weekend" ? "Weekend" : "Weekday",
        price: Number((dayMode === "Weekend" ? weekendPrice : weekdayPrice) || 0),
        status: dayMode === "Weekend" ? weekendStatus : weekdayStatus,
      },
      media,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target && !saving) void closeIfConfirmed(onClose);
      }}
    >
      <div className="flex max-h-[min(94dvh,900px)] w-full max-w-[1040px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Building2 size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-violet-950">
                {isEdit ? "Update Space" : "Add Space"}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {isEdit
                  ? "Edit this bookable space, its price, and media."
                  : "Create a new bookable space with availability and pricing for Weekday and Weekend."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            disabled={saving}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1.15fr_0.85fr] lg:overflow-hidden">
            <div className="min-w-0 space-y-6 px-5 py-5 sm:px-6 lg:overflow-y-auto">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                    1
                  </span>
                  <h3 className="text-base font-bold text-slate-900">Basic Details</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Space Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Creative Studio A"
                        required
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Space Code <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={spaceCode}
                        onChange={(e) => setSpaceCode(e.target.value.toUpperCase())}
                        placeholder="SP-0048"
                        required
                        className={`${fieldClass} pr-11 font-medium uppercase`}
                      />
                      <button
                        type="button"
                        onClick={handleRegenerateCode}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                        title="Generate space code"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Space Type <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <LayoutGrid size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
                      <select
                        value={spaceType}
                        onChange={(e) => handleSpaceTypeChange(e.target.value as SpaceType)}
                        required
                        className={`${fieldClass} appearance-none pr-9`}
                      >
                        <option value="Exclusive">Exclusive Space</option>
                        <option value="Coworking">Coworking Space</option>
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Tag size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={`${fieldClass} appearance-none pr-9`}
                      >
                        {availableCategories.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Capacity (people) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Users size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(Math.max(1, Number(e.target.value || 1)))}
                      required
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">Description</label>
                  <div className="relative">
                    <FileText size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                      placeholder="Amenities, size, or booking notes..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  <p className="mt-1 text-right text-[11px] text-slate-400">{description.length}/500</p>
                </div>
              </section>

              <section className="space-y-3 border-t border-slate-100 pt-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                    2
                  </span>
                  <h3 className="text-base font-bold text-slate-900">Pricing & Availability</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Set price and availability for Weekday and Weekend.
                  {isEdit && dayMode === "Both"
                    ? " Both prices can be edited here."
                    : isEdit
                      ? " This space keeps its saved day."
                      : " Turn a day off to skip it."}
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        day: "Weekday" as const,
                        on: weekdayOn,
                        range: "Mon – Fri",
                        priceValue: weekdayPrice,
                        setPriceValue: setWeekdayPrice,
                        statusValue: weekdayStatus,
                        setStatusValue: setWeekdayStatus,
                      },
                      {
                        day: "Weekend" as const,
                        on: weekendOn,
                        range: "Sat – Sun",
                        priceValue: weekendPrice,
                        setPriceValue: setWeekendPrice,
                        statusValue: weekendStatus,
                        setStatusValue: setWeekendStatus,
                      },
                    ] as const
                  ).map((card) => (
                    <div
                      key={card.day}
                      className={`overflow-hidden rounded-2xl border bg-white ${
                        card.on ? "border-violet-200" : "border-slate-200 opacity-70"
                      }`}
                    >
                      <div className={`flex items-center gap-2 px-3 py-2.5 ${card.on ? "bg-violet-50" : "bg-slate-50"}`}>
                        <button
                          type="button"
                          disabled={isEdit}
                          onClick={() => setDayEnabled(card.day, !card.on)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            card.on
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-300 bg-white text-transparent"
                          } disabled:cursor-not-allowed`}
                          aria-pressed={card.on}
                          aria-label={`${card.on ? "Disable" : "Enable"} ${card.day}`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </button>
                        <Calendar size={15} className="text-violet-600" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-none text-slate-900">{card.day}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{card.range}</p>
                        </div>
                      </div>
                      <div className="space-y-2 p-3">
                        <label className="block text-xs font-semibold text-slate-700">
                          Price (₹) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={card.priceValue}
                            disabled={!card.on}
                            required={card.on}
                            onChange={(e) => card.setPriceValue(Number(e.target.value || 0))}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                          />
                        </div>
                        <label className="block text-xs font-semibold text-slate-700">Status</label>
                        <div className="relative">
                          <select
                            value={card.statusValue}
                            disabled={!card.on}
                            onChange={(e) => card.setStatusValue(e.target.value as SpaceStatus)}
                            className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                          >
                            <option value="Available">Available</option>
                            <option value="Booked">Booked</option>
                            <option value="Maintenance">Maintenance</option>
                          </select>
                          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="min-w-0 border-t border-slate-100 px-5 py-5 sm:px-6 lg:overflow-y-auto lg:border-l lg:border-t-0">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
                    <CloudUpload size={16} />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">Space Media</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Space Images</p>
                    <p className="text-xs text-slate-500">Upload up to 8 photos (JPG, PNG, WebP).</p>
                  </div>
                  <label
                    htmlFor="space-images"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setImageDrag(true);
                    }}
                    onDragLeave={() => setImageDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setImageDrag(false);
                      addImageFiles(Array.from(e.dataTransfer.files || []));
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-white px-4 py-6 text-center transition ${
                      imageDrag ? "border-violet-500 bg-violet-50" : "border-violet-200 hover:border-violet-300"
                    } ${images.length >= 8 ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <CloudUpload size={28} className="mb-2 text-violet-500" />
                    <span className="text-sm font-semibold text-violet-700">Upload Images</span>
                    <span className="mt-0.5 text-xs text-slate-400">Drag & drop or click to browse</span>
                  </label>
                  <input
                    id="space-images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImages}
                    className="hidden"
                  />
                  {images.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {images.map((item, index) => (
                        <div key={item.id} className="relative h-20 w-[88px] shrink-0 overflow-hidden rounded-xl border border-violet-100 bg-white">
                          <img src={item.url} alt="" className="h-full w-full object-cover" />
                          {index === 0 ? (
                            <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] font-semibold text-white">
                              Cover
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeImage(item.id)}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-600 shadow"
                            aria-label="Remove image"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {images.length < 8 ? (
                        <label
                          htmlFor="space-images"
                          className="flex h-20 w-[88px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-violet-200 bg-white text-violet-600"
                        >
                          <Plus size={16} />
                          <span className="mt-1 text-[10px] font-semibold">Add More</span>
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 space-y-3 border-t border-violet-100 pt-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      <Video size={14} className="text-violet-600" />
                      Space Videos
                    </p>
                    <p className="text-xs text-slate-500">Upload up to {MAX_SPACE_VIDEOS} videos (MP4, MOV, WebM).</p>
                  </div>
                  <label
                    htmlFor="space-video"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setVideoDrag(true);
                    }}
                    onDragLeave={() => setVideoDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setVideoDrag(false);
                      addVideoFiles(Array.from(e.dataTransfer.files || []));
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-white px-4 py-6 text-center transition ${
                      videoDrag ? "border-violet-500 bg-violet-50" : "border-violet-200 hover:border-violet-300"
                    } ${videos.length >= MAX_SPACE_VIDEOS ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <Video size={28} className="mb-2 text-violet-500" />
                    <span className="text-sm font-semibold text-violet-700">Upload Videos</span>
                    <span className="mt-0.5 text-xs text-slate-400">Drag & drop or click to browse</span>
                  </label>
                  <input
                    id="space-video"
                    type="file"
                    multiple
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideos}
                    className="hidden"
                  />
                  {videos.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {videos.map((item) => (
                        <div key={item.id} className="relative h-20 w-[120px] shrink-0 overflow-hidden rounded-xl border border-violet-100 bg-slate-900">
                          <video
                            src={item.url}
                            muted
                            preload="metadata"
                            className="h-full w-full object-cover"
                            onLoadedMetadata={(event) => {
                              const label = formatDuration(event.currentTarget.duration);
                              if (!label) return;
                              setVideoDurations((current) =>
                                current[item.id] === label ? current : { ...current, [item.id]: label },
                              );
                            }}
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-800">
                              <Play size={14} className="ml-0.5" />
                            </span>
                          </span>
                          {videoDurations[item.id] ? (
                            <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] font-semibold text-white">
                              {videoDurations[item.id]}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeVideoItem(item.id)}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-600 shadow"
                            aria-label="Remove video"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {videos.length < MAX_SPACE_VIDEOS ? (
                        <label
                          htmlFor="space-video"
                          className="flex h-20 w-[88px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-violet-200 bg-white text-violet-600"
                        >
                          <Plus size={16} />
                          <span className="mt-1 text-[10px] font-semibold">Add More</span>
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => void closeIfConfirmed(onClose)}
              disabled={saving}
              className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {uploadingVideos
                ? "Uploading videos..."
                : loading
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
