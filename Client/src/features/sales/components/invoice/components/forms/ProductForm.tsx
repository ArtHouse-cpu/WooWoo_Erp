import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import {
  Barcode,
  Box,
  ChevronDown,
  Eye,
  ImagePlus,
  LayoutGrid,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import CategorySelect from "../shared/CategorySelect";
import DiscountInput from "../shared/DiscountInput";
import ImageUploader from "../shared/ImageUploader";
import type { AddItemFormValues } from "../modals/AddItemModal";
import VariantModal, { type VariantInput } from "../modals/VariantModal";
import {
  handleCreateSegment,
  handleDeleteSegment,
  handleGetCspEnrollments,
  handleGetSegments,
  handleUpdateSegment,
  type CspEnrollment,
  type SegmentOption,
} from "@/services/apiClient";

const barcodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const generateBarcode = () =>
  `BC-${Array.from({ length: 8 }, () => barcodeChars[Math.floor(Math.random() * barcodeChars.length)]).join("")}`;

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Section({
  title,
  description,
  children,
  icon,
  panel,
  open = true,
  onToggle,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  panel?: string;
  open?: boolean;
  onToggle?: () => void;
}) {
  const collapsible = Boolean(panel);
  const showBody = !collapsible || open;
  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-3 shadow-sm sm:p-4">
      <button
        type="button"
        onClick={collapsible ? onToggle : undefined}
        className={`mb-3 flex w-full items-start gap-2.5 border-b border-slate-100 pb-3 text-left ${collapsible ? "" : "pointer-events-none"}`}
      >
        {icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        {collapsible ? (
          <ChevronDown size={16} className={`mt-1 shrink-0 text-slate-400 transition lg:hidden ${open ? "rotate-180" : ""}`} />
        ) : null}
      </button>
      <div className={showBody ? "" : "hidden lg:block"}>{children}</div>
    </section>
  );
}

export default function ProductForm({ step = 0 }: { step?: number }) {
  const { register, watch, setValue, control } =
    useFormContext<AddItemFormValues>();
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "variants",
  });
  const [cspOptions, setCspOptions] = useState<CspEnrollment[]>([]);
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [segmentDraft, setSegmentDraft] = useState("");
  const [segmentEditingId, setSegmentEditingId] = useState("");
  const [segmentEditingName, setSegmentEditingName] = useState("");
  const [segmentDeleteId, setSegmentDeleteId] = useState("");
  const [segmentBusy, setSegmentBusy] = useState(false);
  const [segmentError, setSegmentError] = useState("");
  const segmentMenuRef = useRef<HTMLDivElement | null>(null);
  const [loadingCsp, setLoadingCsp] = useState(false);
  const [cspSearch, setCspSearch] = useState("");
  const [cspDropdownOpen, setCspDropdownOpen] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editVariantIndex, setEditVariantIndex] = useState<number | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"basic" | "ids" | "description">("basic");
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  const images = watch("images");
  const discountType = watch("discountType");
  const discountValue = watch("discountValue");
  const isCsp = watch("isCsp");
  const applyMembershipDiscount = watch("applyMembershipDiscount");
  const lowStockAlertLevel = watch("lowStockAlertLevel");
  const itemType = watch("type");
  const categoryId = watch("categoryId");
  const categoryName = watch("category");
  const segmentName = watch("segment");
  const selectedSegments = watch("segments") ?? [];
  const subCategoryId = watch("subCategoryId");
  const subCategoryName = watch("subCategory");
  const cspEnrollmentId = watch("cspEnrollmentId");
  // Live variant values (source of truth for table prices)
  const watchedVariants =
    useWatch({ control, name: "variants" }) ?? ([] as VariantInput[]);
  const hasVariants = fields.length > 0;
  const variantInitial =
    editVariantIndex !== null
      ? (watchedVariants[editVariantIndex] as VariantInput | undefined) ?? null
      : null;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingSegments(true);
        const res = await handleGetSegments(controller.signal);
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.segments)
            ? res.segments
            : Array.isArray(res?.data)
              ? res.data
              : [];
        setSegments(
          (list as SegmentOption[])
            .map((row) => ({
              id: String(row?._id || row?.id || ""),
              name: String(row?.name || row?.segmentName || row?.title || row?.label || "").trim(),
            }))
            .filter((row) => row.id && row.name),
        );
      } catch (error) {
        if ((error as { code?: string })?.code === "ERR_CANCELED") return;
        console.error("Failed to load segments:", error);
        setSegments([]);
      } finally {
        setLoadingSegments(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!segmentOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!segmentMenuRef.current?.contains(event.target as Node)) {
        setSegmentOpen(false);
        setSegmentEditingId("");
        setSegmentDeleteId("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [segmentOpen]);

  const segmentMessage = (error: unknown, fallback: string) => {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return message || fallback;
  };

  const writeSegments = (next: Array<{ id: string; name: string }>) => {
    setValue("segments", next, { shouldDirty: true });
    setValue(
      "segment",
      next.map((row) => row.name).filter(Boolean).join(", "),
      { shouldDirty: true },
    );
    setValue("segmentId", next[0]?.id || "", { shouldDirty: true });
  };

  const toggleSegment = (id: string, name: string) => {
    if (!id && !name) {
      writeSegments([]);
      return;
    }
    const exists = selectedSegments.some((row) => row.id === id && id);
    writeSegments(
      exists
        ? selectedSegments.filter((row) => row.id !== id)
        : [...selectedSegments, { id, name }],
    );
  };

  const createSegment = async () => {
    const name = segmentDraft.trim();
    if (!name || segmentBusy) return;
    const duplicate = segments.find((row) => row.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      if (!selectedSegments.some((row) => row.id === duplicate.id)) {
        writeSegments([...selectedSegments, duplicate]);
      }
      setSegmentDraft("");
      return;
    }
    setSegmentBusy(true);
    setSegmentError("");
    try {
      const res = await handleCreateSegment(name);
      const created = Array.isArray(res?.segments) ? res.segments[0] : null;
      const existing = Array.isArray(res?.existing) ? res.existing[0] : null;
      const row = created || existing;
      const id = String(row?._id || row?.id || "");
      const savedName = String(row?.name || name).trim();
      if (!id || !savedName) {
        setSegmentError("Could not create segment");
        return;
      }
      setSegments((prev) =>
        prev.some((item) => item.id === id)
          ? prev
          : [...prev, { id, name: savedName }].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSegmentDraft("");
      if (!selectedSegments.some((row) => row.id === id)) {
        writeSegments([...selectedSegments, { id, name: savedName }]);
      }
    } catch (error) {
      setSegmentError(segmentMessage(error, "Could not create segment"));
    } finally {
      setSegmentBusy(false);
    }
  };

  const saveSegmentName = async (id: string) => {
    const name = segmentEditingName.trim();
    if (!name || segmentBusy) return;
    const duplicate = segments.find(
      (row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      setSegmentError("A segment with this name already exists");
      return;
    }
    setSegmentBusy(true);
    setSegmentError("");
    try {
      const res = await handleUpdateSegment(id, name);
      const savedName = String(res?.segment?.name || name).trim();
      setSegments((prev) =>
        prev
          .map((row) => (row.id === id ? { ...row, name: savedName } : row))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      writeSegments(
        selectedSegments.map((row) => (row.id === id ? { ...row, name: savedName } : row)),
      );
      setSegmentEditingId("");
    } catch (error) {
      setSegmentError(segmentMessage(error, "Could not update segment"));
    } finally {
      setSegmentBusy(false);
    }
  };

  const removeSegment = async (id: string) => {
    if (segmentBusy) return;
    setSegmentBusy(true);
    setSegmentError("");
    try {
      await handleDeleteSegment(id);
      setSegments((prev) => prev.filter((row) => row.id !== id));
      writeSegments(selectedSegments.filter((row) => row.id !== id));
      setSegmentDeleteId("");
    } catch (error) {
      setSegmentError(segmentMessage(error, "Could not delete segment"));
    } finally {
      setSegmentBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingCsp(true);
        const res = await handleGetCspEnrollments({ status: "all" });
        if (cancelled) return;
        const rows = Array.isArray(res?.enrollments)
          ? res.enrollments
          : Array.isArray(res?.csps)
            ? res.csps
            : [];
        setCspOptions(rows);
      } catch (error) {
        console.error("Failed to load CSP sellers:", error);
        if (!cancelled) setCspOptions([]);
      } finally {
        if (!cancelled) setLoadingCsp(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cspEnrollmentId || !cspOptions.length) return;
    const match = cspOptions.find(
      (row) => String(row._id) === String(cspEnrollmentId),
    );
    if (match) {
      const normalized = String(match._id);
      if (normalized !== cspEnrollmentId) {
        setValue("cspEnrollmentId", normalized, { shouldValidate: true });
      }
    }
  }, [cspOptions, cspEnrollmentId, setValue]);

  const cspPersonName = (row: CspEnrollment) =>
    String(
      row.displayName ||
        row.customer?.name ||
        (typeof row.customerId === "object" ? row.customerId?.name : "") ||
        row.vendor?.name ||
        (typeof row.vendorId === "object" ? row.vendorId?.name : "") ||
        row.label ||
        "Seller",
    ).trim();

  const cspMobile = (row: CspEnrollment) => {
    const raw =
      row.mobile ||
      row.customer?.mobile ||
      (typeof row.customerId === "object" ? row.customerId?.mobile : "") ||
      row.vendor?.mobile ||
      (typeof row.vendorId === "object" ? row.vendorId?.mobile : "") ||
      "";
    const digits = String(raw).replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
  };

  const selectedCsp = cspOptions.find(
    (row) => String(row._id) === String(cspEnrollmentId || ""),
  );
  const debouncedCspSearch = useDebounce(cspSearch, 300);

  const matchCspRows = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return cspOptions;
    const qDigits = q.replace(/\D/g, "");
    const queryPhone = qDigits.length > 10 ? qDigits.slice(-10) : qDigits;
    return cspOptions
      .map((row) => {
        const mobile = cspMobile(row);
        const name = cspPersonName(row).toLowerCase();
        const phoneHit = queryPhone.length >= 3 && mobile.includes(queryPhone);
        const nameHit = name.includes(q);
        if (!phoneHit && !nameHit) return null;
        return { row, phoneHit };
      })
      .filter((item): item is { row: CspEnrollment; phoneHit: boolean } =>
        Boolean(item),
      )
      .sort((a, b) => Number(b.phoneHit) - Number(a.phoneHit))
      .map((item) => item.row);
  };

  const filteredCspOptions = matchCspRows(debouncedCspSearch);
  const cspSearchPending = cspSearch.trim() !== debouncedCspSearch.trim();

  useEffect(() => {
    const digits = debouncedCspSearch.replace(/\D/g, "");
    const queryPhone = digits.length > 10 ? digits.slice(-10) : digits;
    if (queryPhone.length < 10) return;
    const exact = cspOptions.filter((row) => cspMobile(row) === queryPhone);
    if (exact.length !== 1) return;
    const id = String(exact[0]._id);
    if (id === String(cspEnrollmentId || "")) return;
    setValue("cspEnrollmentId", id, { shouldValidate: true, shouldDirty: true });
  }, [debouncedCspSearch, cspOptions, cspEnrollmentId, setValue]);

  const description = watch("description");
  const productName = watch("productName");
  const itemCode = watch("itemCode");
  const barcodeValue = watch("barcode");
  const previewUrl = useMemo(
    () => (images?.[0] ? URL.createObjectURL(images[0]) : ""),
    [images],
  );
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const descriptionReg = register("description");

  const wrapDescription = (before: string, after = before) => {
    const el = descriptionRef.current;
    const value = String(description || "");
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || "text";
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`.slice(0, 500);
    setValue("description", next, { shouldDirty: true });
  };

  const mediaCard = (
    <div className="space-y-3">
      <Section
        title="Add Product Images"
        description="Drag & drop or click to upload"
        icon={<ImagePlus size={16} />}
      >
        <ImageUploader files={images} onFilesChange={(next) => setValue("images", next)} label="" />
      </Section>
      <Section title="Product Preview" icon={<Eye size={16} />}>
        <div className="flex gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-50">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package size={22} className="text-violet-300" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{productName || "Product name"}</p>
            <p className="text-xs text-slate-400">{itemCode || "SKU"}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {categoryName ? (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{categoryName}</span>
              ) : null}
              {segmentName ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{segmentName}</span>
              ) : null}
            </div>
          </div>
        </div>
        <dl className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between gap-3"><dt className="text-slate-400">Brand</dt><dd className="font-medium text-slate-700">{watch("brandName") || "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-400">Shop Category</dt><dd className="font-medium text-slate-700">{subCategoryName || "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-400">Barcode</dt><dd className="font-medium text-slate-700">{barcodeValue || "Not added"}</dd></div>
        </dl>
      </Section>
    </div>
  );

  return (
    <div className="space-y-4">
      {step === 0 ? (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <div className="space-y-3">
      <Section
        title="Basic Details"
        description="Product identity and classification information."
        icon={<Package size={16} />}
        panel="basic"
        open={mobilePanel === "basic"}
        onToggle={() => setMobilePanel("basic")}
      >
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
  <div className="min-w-0">
    <label className={labelClass}>
      Product Name <span className="text-red-500">*</span>
    </label>
    <input
      {...register("productName")}
      placeholder="e.g. Canvas Tote Bag"
      className={inputClass}
      autoFocus
    />
  </div>
  <div className="min-w-0">
    <label className={labelClass}>Brand Name</label>
    <input
      {...register("brandName")}
      placeholder="e.g. Nike, Apple"
      className={inputClass}
    />
  </div>
  <div className="sm:col-span-2 grid grid-cols-1 gap-3 lg:grid-cols-3">
    <div className="lg:col-span-2 [&_label]:mb-1.5 [&_label]:block [&_label]:text-xs [&_label]:font-semibold [&_label]:uppercase [&_label]:tracking-wide [&_label]:text-slate-500 [&>div]:grid [&>div]:grid-cols-1 [&>div]:gap-3 [&>div]:space-y-0 sm:[&>div]:grid-cols-2 [&_button.flex]:h-10 [&_button.flex]:rounded-lg [&_button.flex]:border-slate-200">
      <CategorySelect
        categoryValue={categoryId || ""}
        categoryName={categoryName || ""}
        onCategoryChange={(id, name) => {
          setValue("categoryId", id, { shouldDirty: true });
          setValue("category", name, { shouldDirty: true });
        }}
        subCategoryValue={subCategoryId || ""}
        subCategoryName={subCategoryName || ""}
        onSubCategoryChange={(id, name) => {
          setValue("subCategoryId", id, { shouldDirty: true });
          setValue("subCategory", name, { shouldDirty: true });
        }}
      />
    </div>
    <div className="relative min-w-0" ref={segmentMenuRef}>
      <label className={labelClass}>
        <LayoutGrid size={12} className="mr-1 inline" />
        Segment
      </label>
      <button
        type="button"
        disabled={loadingSegments}
        onClick={() => setSegmentOpen((open) => !open)}
        className={`${inputClass} flex items-center justify-between text-left`}
      >
        <span className={selectedSegments.length || segmentName ? "truncate text-slate-800" : "truncate text-slate-400"}>
          {loadingSegments
            ? "Loading..."
            : selectedSegments.map((row) => row.name).filter(Boolean).join(", ") || segmentName || "Select segments"}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${segmentOpen ? "rotate-180" : ""}`} />
      </button>
      {segmentOpen ? (
        <div className="mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => toggleSegment("", "")}
              className="block w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
            >
              Clear segments
            </button>
            {segments.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">No segments yet</p>
            ) : null}
            {segments.map((row) => (
              <div key={row.id} className="flex items-center gap-1 px-2 py-1 hover:bg-violet-50">
                {segmentEditingId === row.id ? (
                  <input
                    value={segmentEditingName}
                    onChange={(event) => setSegmentEditingName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void saveSegmentName(row.id);
                      }
                    }}
                    className="h-8 min-w-0 flex-1 rounded-md border border-violet-200 px-2 text-sm outline-none focus:border-violet-400"
                    autoFocus
                  />
                ) : segmentDeleteId === row.id ? (
                  <p className="min-w-0 flex-1 truncate px-1 text-xs text-slate-600">Delete {row.name}?</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSegment(row.id, row.name)}
                    className={`flex min-w-0 flex-1 items-center gap-2 truncate px-1 py-1 text-left text-sm ${
                      selectedSegments.some((item) => item.id === row.id)
                        ? "font-semibold text-violet-700"
                        : "text-slate-700"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                        selectedSegments.some((item) => item.id === row.id)
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-slate-300 bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="truncate">{row.name}</span>
                  </button>
                )}
                {segmentEditingId === row.id ? (
                  <>
                    <button
                      type="button"
                      disabled={segmentBusy}
                      onClick={() => void saveSegmentName(row.id)}
                      className="rounded px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setSegmentEditingId("")}
                      className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </>
                ) : segmentDeleteId === row.id ? (
                  <>
                    <button
                      type="button"
                      disabled={segmentBusy}
                      onClick={() => void removeSegment(row.id)}
                      className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setSegmentDeleteId("")}
                      className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      title="Edit segment"
                      onClick={() => {
                        setSegmentDeleteId("");
                        setSegmentEditingId(row.id);
                        setSegmentEditingName(row.name);
                        setSegmentError("");
                      }}
                      className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-violet-700"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      title="Delete segment"
                      onClick={() => {
                        setSegmentEditingId("");
                        setSegmentDeleteId(row.id);
                        setSegmentError("");
                      }}
                      className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-slate-100 p-2">
            <input
              value={segmentDraft}
              onChange={(event) => setSegmentDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createSegment();
                }
              }}
              placeholder="New segment"
              className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-violet-400"
            />
            <button
              type="button"
              disabled={segmentBusy || !segmentDraft.trim()}
              onClick={() => void createSegment()}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-violet-600 px-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Plus size={12} />
              Add
            </button>
          </div>
          {segmentError ? <p className="px-2 pb-2 text-xs text-red-600">{segmentError}</p> : null}
        </div>
      ) : null}
    </div>
  </div>
</div>

      </Section>

      <Section
        title="Product Identifiers"
        description="Unique codes for tracking and billing."
        icon={<Barcode size={16} />}
        panel="ids"
        open={mobilePanel === "ids"}
        onToggle={() => setMobilePanel("ids")}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Item Code / SKU</label>
            <input placeholder="e.g. SKU-12345" {...register("itemCode")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Barcode</label>
            <div className="flex gap-2">
              <input {...register("barcode")} placeholder="Scan or enter barcode" className={`${inputClass} flex-1`} />
              <button
                type="button"
                title="Generate barcode"
                onClick={() => setValue("barcode", generateBarcode())}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Description"
        description="Add a short description about the product."
        icon={<Box size={16} />}
        panel="description"
        open={mobilePanel === "description"}
        onToggle={() => setMobilePanel("description")}
      >
        <div className="mb-2 flex gap-1 text-slate-500">
          <button type="button" className="rounded px-2 py-1 text-xs font-bold hover:bg-slate-100" onClick={() => wrapDescription("**")}>B</button>
          <button type="button" className="rounded px-2 py-1 text-xs italic hover:bg-slate-100" onClick={() => wrapDescription("*")}>I</button>
          <button type="button" className="rounded px-2 py-1 text-xs underline hover:bg-slate-100" onClick={() => wrapDescription("<u>", "</u>")}>U</button>
        </div>
        <textarea
          {...descriptionReg}
          ref={(element) => {
            descriptionReg.ref(element);
            descriptionRef.current = element;
          }}
          maxLength={500}
          rows={4}
          placeholder="Write product description..."
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
        <p className="mt-1 text-right text-[11px] text-slate-400">{String(description || "").length}/500</p>
      </Section>
      </div>
      <div className="hidden lg:block">{mediaCard}</div>
      </div>
      ) : null}

      {step === 1 ? (
      <div className="space-y-3">
      <Section title="Pricing & Discount" description="Set the selling price, cost, and optional discount.">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className={labelClass}>Selling Price (INR)</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("sellingPrice", { valueAsNumber: true })}
                className={`${inputClass} pl-7`}
              />
            </div>
            {hasVariants ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Optional — each variant uses its own selling price.
              </p>
            ) : null}
          </div>
          <div>
            <label className={labelClass}>Purchase Price (INR)</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("purchasePrice", { valueAsNumber: true })}
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>
        </div>
      </Section>
      </div>
      ) : null}

      {step === 2 && itemType !== "service" ? (
      <Section title="Inventory alert">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Low Stock Alert Level
          </label>
          <input
            type="number"
            min={0}
            step="1"
            value={lowStockAlertLevel ?? ""}
            onChange={(event) => {
              const raw = event.target.value;
              setValue(
                "lowStockAlertLevel",
                raw === "" ? null : Math.max(0, Number(raw)),
                { shouldValidate: true },
              );
            }}
            placeholder="Leave empty for no alert"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          <p className="mt-1 text-xs text-slate-500">
            Alert when available stock is at or below this number. Each product keeps its own level.
          </p>
        </div>
      </Section>
      ) : null}

      {step === 1 ? (
      <Section title="Membership">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Membership discount</p>
            <p className="text-xs text-slate-500">
              {applyMembershipDiscount !== false
                ? "On. Checkout applies the customer membership discount."
                : "Off. Checkout charges this product at full price."}
            </p>
          </div>
          <button
            type="button"
            aria-pressed={applyMembershipDiscount !== false}
            onClick={() =>
              setValue("applyMembershipDiscount", applyMembershipDiscount === false, {
                shouldValidate: true,
              })
            }
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${
              applyMembershipDiscount !== false ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                applyMembershipDiscount !== false ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>
      </Section>
      ) : null}

      {step === 2 ? (
      <Section title="CSP" >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>CSP (Customer Seller Program)</label>
            <select
              value={isCsp || "no"}
              onChange={(e) => {
                const next = e.target.value as "yes" | "no";
                setValue("isCsp", next, { shouldValidate: true });
                if (next === "no") setValue("cspEnrollmentId", "");
              }}
              className={inputClass}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {isCsp === "yes" ? (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  readOnly
                  value={selectedCsp ? cspPersonName(selectedCsp) : ""}
                  placeholder="Fills when the phone number exists"
                  className={`${inputClass} bg-slate-50`}
                />
              </div>
              <div className="relative">
              <label className={labelClass}>
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={
                  cspDropdownOpen
                    ? cspSearch
                    : selectedCsp
                      ? cspMobile(selectedCsp)
                      : cspSearch
                }
                onChange={(e) => {
                  setCspSearch(e.target.value);
                  setCspDropdownOpen(true);
                  if (cspEnrollmentId) {
                    setValue("cspEnrollmentId", "", { shouldValidate: true });
                  }
                }}
                onFocus={() => {
                  setCspDropdownOpen(true);
                  setCspSearch(selectedCsp ? cspMobile(selectedCsp) : cspSearch);
                }}
                onBlur={() => {
                  window.setTimeout(() => setCspDropdownOpen(false), 150);
                }}
                placeholder={
                  loadingCsp ? "Loading sellers…" : "Search by phone number"
                }
                className={inputClass}
                disabled={loadingCsp}
                autoComplete="off"
              />
              {cspDropdownOpen && !loadingCsp ? (
                <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {cspSearchPending ? (
                    <p className="px-3 py-2 text-xs text-slate-500">Searching…</p>
                  ) : filteredCspOptions.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-500">
                      No sellers match “{debouncedCspSearch.trim() || "…"}”
                    </p>
                  ) : (
                    filteredCspOptions.map((row) => {
                      const id = String(row._id);
                      const active = id === String(cspEnrollmentId || "");
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`flex w-full px-3 py-2 text-left text-sm transition ${
                            active
                              ? "bg-blue-50 font-semibold text-blue-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setValue("cspEnrollmentId", id, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                            setCspSearch("");
                            setCspDropdownOpen(false);
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {cspMobile(row) || "No phone"}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {cspPersonName(row)}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
              </div>
              {!loadingCsp && cspOptions.length === 0 ? (
                <p className="mt-1.5 text-xs text-amber-600">
                  No CSP sellers found. Enroll one under Network → CSP.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="hidden sm:block" aria-hidden />
          )}
        </div>
      </Section>
      ) : null}

      {step === 1 ? (
      <div className="grid grid-cols-1 gap-4">
      <Section title="Discount" description="Optional catalogue discount.">
          <DiscountInput
            valueType={discountType}
            valueAmount={discountValue}
            onTypeChange={(type) => setValue("discountType", type)}
            onValueChange={(value) => setValue("discountValue", value)}
          />
        </Section>
      </div>
      ) : null}

      {step === 3 ? mediaCard : null}

      {step === 4 ? (
        <Section title="Review" description="Check the product before saving.">
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-slate-400">Name</dt><dd className="font-medium">{productName || "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Brand</dt><dd className="font-medium">{watch("brandName") || "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Category</dt><dd className="font-medium">{categoryName || "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Shop category</dt><dd className="font-medium">{subCategoryName || "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Segment</dt><dd className="font-medium">{segmentName || "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Selling price</dt><dd className="font-medium">₹{Number(watch("sellingPrice") || 0).toLocaleString("en-IN")}</dd></div>
            <div><dt className="text-xs text-slate-400">SKU</dt><dd className="font-medium">{itemCode || "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Photos</dt><dd className="font-medium">{images?.length || 0}</dd></div>
          </dl>
        </Section>
      ) : null}

      {step === 2 ? (
      <Section
        title="Variants"
        description="Optional size/color options with their own prices (source of truth when present)."
      >
        <div className="mb-3 flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              setEditVariantIndex(null);
              setShowVariantModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={14} /> Add Variant
          </button>
        </div>
        {fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm text-slate-600">No variants added yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Add variants if this product has sizes, colors, or packs.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Variant
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Selling Price
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Purchase Price
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Barcode
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {fields.map((field, idx) => {
                    const live = watchedVariants[idx] as
                      | VariantInput
                      | undefined;
                    const name = String(live?.name ?? field.name ?? "").trim();
                    const selling = Number(
                      live?.sellingPrice ?? field.sellingPrice ?? 0,
                    );
                    const purchase = Number(
                      live?.purchasePrice ?? field.purchasePrice ?? 0,
                    );
                    const barcode = String(
                      live?.barcode ?? field.barcode ?? "",
                    ).trim();
                    return (
                      <tr key={field.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          {name || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                          ₹
                          {selling.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                          ₹
                          {purchase.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {barcode || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditVariantIndex(idx);
                                setShowVariantModal(true);
                              }}
                              className="rounded-md bg-slate-100 p-1.5 text-slate-600 transition hover:bg-slate-200"
                              title="Edit variant"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(idx)}
                              className="rounded-md bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100"
                              title="Remove variant"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>
      ) : null}

      {showVariantModal ? (
        <VariantModal
          onClose={() => {
            setShowVariantModal(false);
            setEditVariantIndex(null);
          }}
          initialValue={variantInitial}
          onSave={(variant) => {
            const next: VariantInput = {
              name: String(variant.name || "").trim(),
              sellingPrice: Number(variant.sellingPrice) || 0,
              purchasePrice: Number(variant.purchasePrice) || 0,
              barcode: String(variant.barcode || "").trim(),
            };
            if (editVariantIndex === null) {
              append(next);
            } else {
              update(editVariantIndex, next);
            }
            setShowVariantModal(false);
            setEditVariantIndex(null);
          }}
        />
      ) : null}
    </div>
  );
}
