import { ImagePlus, X, ArrowRight, Save, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleCreateVendor,
  handleGetVendors,
  type CustomerPayload,
  type VendorPayload,
} from "@/services/apiClient";
import AddVendorModal from "@/features/purchase/Modal/AddVendorModal";

export type ExpenseModalMode = "create" | "edit" | "view";

export type ExpenseDraft = {
  title: string;
  description: string;
  category: string;
  amount: number;
  paidTo: string;
  vendorId?: string;
  date: string;
  mode?: string;
  status?: string;
  receipt?: File | null;
  receiptUrl?: string;
};

export type ExpenseModalValues = ExpenseDraft & {
  expenseCode?: string;
  createdByName?: string;
  createdById?: string;
  addedByName?: string;
  addedById?: string;
};

type VendorOption = {
  _id: string;
  name: string;
  mobile: string;
  companyName?: string;
};

interface ExpenseModalProps {
  isOpen: boolean;
  mode?: ExpenseModalMode;
  initialExpense?: ExpenseModalValues | null;
  saving?: boolean;
  onClose: () => void;
  onContinue?: (draft: ExpenseDraft) => void;
  onSave?: (draft: ExpenseDraft) => void | Promise<void>;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  amount: "",
  paidTo: "",
  vendorId: "",
  mode: "",
  status: "Paid",
  date: "",
  receipt: null as File | null,
  receiptUrl: "",
};

const CATEGORY_OPTIONS = [
  "Rent",
  "Utilities",
  "Salary",
  "Marketing",
  "Supplies",
  "Maintenance",
  "Travel",
  "Other",
];

const MODE_OPTIONS = ["Cash", "UPI", "Card", "Bank Transfer", "Wallet", "Due"];
const STATUS_OPTIONS = ["Paid", "Pending", "Cancelled"];

function toForm(initial?: ExpenseModalValues | null) {
  if (!initial) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    title: initial.title || "",
    description: initial.description || "",
    category: initial.category || "",
    amount:
      initial.amount === undefined || initial.amount === null
        ? ""
        : String(initial.amount),
    paidTo: initial.paidTo || "",
    vendorId: initial.vendorId || "",
    mode: initial.status === "Pending" ? "Due" : initial.mode || "",
    status: initial.status || "Paid",
    date: initial.date || "",
    receipt: null,
    receiptUrl: initial.receiptUrl || "",
  };
}

const ExpenseModal = ({
  isOpen,
  mode = "create",
  initialExpense = null,
  saving = false,
  onClose,
  onContinue,
  onSave,
}: ExpenseModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState<string | null>(null);
  const [allVendors, setAllVendors] = useState<VendorOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const debouncedVendorSearch = useDebounce(formData.paidTo.trim(), 250);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(toForm(initialExpense));
    setPreview(initialExpense?.receiptUrl || null);
    setVendorDropdownOpen(false);
    setShowCreateVendor(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [isOpen, initialExpense]);

  useEffect(() => {
    if (!isOpen || isView) return;
    const controller = new AbortController();
    const loadVendors = async () => {
      try {
        setLoadingVendors(true);
        const response = await handleGetVendors(controller.signal);
        const list = Array.isArray(response?.vendors) ? response.vendors : [];
        const mapped: VendorOption[] = list.map((item: any) => ({
          _id: String(item?._id ?? ""),
          name: String(item?.name ?? "").trim(),
          mobile: String(item?.mobile ?? "").trim(),
          companyName: String(item?.companyName ?? "").trim(),
        }));
        setAllVendors(mapped);
        setVendors(mapped);
      } catch {
        if (!controller.signal.aborted) {
          setAllVendors([]);
          setVendors([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingVendors(false);
      }
    };
    void loadVendors();
    return () => controller.abort();
  }, [isOpen, isView]);

  useEffect(() => {
    if (!vendorDropdownOpen) return;
    if (!debouncedVendorSearch) {
      setVendors(allVendors);
      return;
    }
    const term = debouncedVendorSearch.toLowerCase();
    setVendors(
      allVendors.filter((item) =>
        [item.name, item.mobile, item.companyName].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(term),
        ),
      ),
    );
  }, [debouncedVendorSearch, allVendors, vendorDropdownOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (isView) return;
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "status" && value === "Pending" ? { mode: "Due" } : {}),
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isView) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({
      ...prev,
      receipt: file,
    }));
    setPreview(URL.createObjectURL(file));
  };

  const removeFile = () => {
    if (isView) return;
    setFormData((prev) => ({
      ...prev,
      receipt: null,
      receiptUrl: "",
    }));
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buildDraft = async (): Promise<ExpenseDraft | null> => {
    const title = formData.title.trim();
    const paidTo = formData.paidTo.trim();
    const amount = Number(formData.amount);
    if (!title) {
      await Swal.fire("Title required", "Please enter an expense title.", "warning");
      return null;
    }
    if (!paidTo) {
      await Swal.fire(
        "Vendor required",
        "Please select a vendor for Paid To.",
        "warning",
      );
      return null;
    }
    if (!formData.vendorId && isCreate) {
      await Swal.fire(
        "Select vendor",
        "Pick a vendor from the list, or create a new vendor.",
        "warning",
      );
      return null;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      await Swal.fire("Invalid amount", "Enter a valid expense amount.", "warning");
      return null;
    }
    return {
      title,
      description: formData.description.trim(),
      category: formData.category || "Other",
      amount,
      paidTo,
      vendorId: formData.vendorId,
      date: formData.date || new Date().toISOString().split("T")[0],
      mode: formData.status === "Pending" ? "Due" : formData.mode || undefined,
      status: formData.status || undefined,
      receipt: formData.receipt,
      receiptUrl: formData.receiptUrl,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isView || saving) return;
    const draft = await buildDraft();
    if (!draft) return;
    if (isEdit) {
      await onSave?.(draft);
      return;
    }
    onContinue?.(draft);
  };

  const handleCreateVendorSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    try {
      setCreatingVendor(true);
      const response = await handleCreateVendor({
        name: args.payload.name,
        mobile: args.payload.mobile,
        email: String(args.payload.email ?? ""),
        gstin: String(args.payload.gstin ?? ""),
        companyName: String(args.payload.companyName ?? ""),
        address: String(args.payload.address ?? ""),
        city: String(args.payload.city ?? ""),
        state: String(args.payload.state ?? ""),
        country: String(args.payload.country ?? ""),
      } as VendorPayload);
      const created = response?.vendor;
      if (created?.name) {
        const option: VendorOption = {
          _id: String(created._id ?? ""),
          name: String(created.name ?? "").trim(),
          mobile: String(created.mobile ?? "").trim(),
          companyName: String(created.companyName ?? "").trim(),
        };
        setAllVendors((prev) => [option, ...prev]);
        setVendors((prev) => [option, ...prev]);
        setFormData((prev) => ({
          ...prev,
          paidTo: option.name,
          vendorId: option._id,
        }));
      }
      setShowCreateVendor(false);
      await Swal.fire("Vendor created", "Vendor saved successfully.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create vendor. Try again.",
        "error",
      );
    } finally {
      setCreatingVendor(false);
    }
  };

  const title =
    isView ? "View Expense" : isEdit ? "Edit Expense" : "Add Expense";
  const subtitle = isView
    ? initialExpense?.expenseCode
      ? `Expense ${initialExpense.expenseCode}`
      : "Expense details"
    : isEdit
      ? "Update this expense record"
      : "Add a new expense record";

  const fieldClass = `w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
    isView ? "bg-gray-50 text-gray-700" : "bg-white"
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Amount
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="e.g. 45000"
                min="0"
                required={!isView}
                readOnly={isView}
                className={fieldClass}
              />
            </div>
            <div className="relative">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Paid To (Vendor)
                </label>
                {!isView ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateVendor(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Create Vendor
                  </button>
                ) : null}
              </div>
              <div className="relative">
                {!isView ? (
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                ) : null}
                <input
                  type="text"
                  name="paidTo"
                  value={formData.paidTo}
                  onChange={(e) => {
                    if (isView) return;
                    setFormData((prev) => ({
                      ...prev,
                      paidTo: e.target.value,
                      vendorId: "",
                    }));
                    setVendorDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (!isView) setVendorDropdownOpen(true);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setVendorDropdownOpen(false), 150);
                  }}
                  placeholder="Search vendor / property owner..."
                  required={!isView}
                  readOnly={isView}
                  autoComplete="off"
                  className={`${fieldClass} ${isView ? "" : "pl-9"}`}
                />
              </div>
              {!isView && vendorDropdownOpen && loadingVendors ? (
                <p className="mt-2 text-xs text-gray-500">Loading vendors...</p>
              ) : null}
              {!isView &&
              vendorDropdownOpen &&
              !loadingVendors &&
              vendors.length > 0 ? (
                <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {vendors.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onMouseDown={() => {
                        setFormData((prev) => ({
                          ...prev,
                          paidTo: item.name,
                          vendorId: item._id,
                        }));
                        setVendorDropdownOpen(false);
                      }}
                      className="flex w-full flex-col border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-800">
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.mobile}
                        {item.companyName ? ` • ${item.companyName}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {!isView &&
              vendorDropdownOpen &&
              !loadingVendors &&
              vendors.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  No vendors found. Create a vendor to continue.
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Monthly Studio Rent"
                required={!isView}
                readOnly={isView}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required={!isView}
                readOnly={isView}
                className={fieldClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g. August rent payment"
                readOnly={isView}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required={!isView}
                disabled={isView}
                className={fieldClass}
              >
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {!isCreate ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Payment Mode
                </label>
                <select
                  name="mode"
                  value={formData.mode}
                  onChange={handleChange}
                  disabled={isView}
                  className={fieldClass}
                >
                  <option value="">Select mode</option>
                  {MODE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {!isCreate ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={isView}
                  className={fieldClass}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {isView ? (
              <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                    Created By
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-800">
                    {initialExpense?.createdByName || "—"}
                  </div>
                  {initialExpense?.createdById ? (
                    <div className="text-xs text-slate-500">
                      {initialExpense.createdById}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Added By
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-800">
                    {initialExpense?.addedByName || "—"}
                  </div>
                  {initialExpense?.addedById ? (
                    <div className="text-xs text-slate-500">
                      {initialExpense.addedById}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Receipt / Expense Image
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    (Optional)
                  </span>
                </label>

                {!preview ? (
                  isView ? (
                    <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                      No receipt uploaded
                    </p>
                  ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-7 transition hover:border-blue-400 hover:bg-blue-50/50"
                  >
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <ImagePlus size={20} />
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      Upload receipt
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      PNG, JPG or JPEG up to 5MB
                    </p>
                  </button>
                  )
                ) : (
                  <div className="relative overflow-hidden rounded-lg border border-gray-200">
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="h-48 w-full bg-gray-50 object-contain"
                    />
                    {!isView ? (
                      <button
                        type="button"
                        onClick={removeFile}
                        className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-gray-600 shadow-md hover:bg-red-50 hover:text-red-600"
                      >
                        <X size={16} />
                      </button>
                    ) : null}
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-3 py-2">
                      <p className="max-w-[80%] truncate text-xs text-gray-600">
                        {formData.receipt?.name || "Receipt image"}
                      </p>
                      <span className="text-xs text-gray-400">
                        {formData.receipt
                          ? `${(formData.receipt.size / 1024 / 1024).toFixed(2)} MB`
                          : ""}
                      </span>
                    </div>
                  </div>
                )}

                {!isView ? (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                ) : null}
              </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {isView ? "Close" : "Cancel"}
            </button>

            {!isView ? (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isEdit ? (
                  <>
                    <Save size={16} />
                    {saving ? "Saving..." : "Save Changes"}
                  </>
                ) : (
                  <>
                    Add Expense
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            ) : null}
          </div>
        </form>
      </div>
      {showCreateVendor && !isView ? (
        <AddVendorModal
          onClose={() => setShowCreateVendor(false)}
          onSubmit={handleCreateVendorSubmit}
          loading={creatingVendor}
        />
      ) : null}
    </div>
  );
};

export default ExpenseModal;
