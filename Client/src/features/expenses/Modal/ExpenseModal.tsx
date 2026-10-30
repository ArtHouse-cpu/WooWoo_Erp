import {
  Calendar,
  Camera,
  ChevronDown,
  FileText,
  ImagePlus,
  Save,
  Search,
  Store,
  Tag,
  User,
  X,
  ArrowRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/store/hooks";
import {
  handleCreateVendor,
  handleGetAccessStaff,
  handleGetVendors,
  type CustomerPayload,
  type VendorPayload,
} from "@/services/apiClient";
import AddVendorModal from "@/features/purchase/Modal/AddVendorModal";
import { closeIfConfirmed } from "@/utils/confirmClose";

export type ExpenseModalMode = "create" | "edit" | "view";

export type ExpensePaidBy = {
  m_staff_id?: string | null;
  m_staff_name?: string | null;
  m_staff_email?: string | null;
};

export type ExpenseDraft = {
  title: string;
  description: string;
  category: string;
  segment?: string;
  amount: number;
  paidTo: string;
  vendorId?: string;
  paidBy?: ExpensePaidBy;
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

type StaffOption = {
  _id: string;
  m_staff_id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
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
  segment: "",
  amount: "",
  paidTo: "",
  vendorId: "",
  paidByName: "",
  paidById: "",
  paidByEmail: "",
  mode: "",
  status: "Paid",
  date: "",
  receipt: null as File | null,
  receiptUrl: "",
};

const SEGMENT_OPTIONS = ["Store", "Cafe", "Services", "Space", "Events", "General", "Admin"];

const CATEGORIES_BY_SEGMENT: Record<string, string[]> = {
  Store: [
    "Stock Purchase",
    "Packaging",
    "Staff Salary",
    "Staff Incentives",
    "Staff Welfare",
    "Delivery Charges",
    "Courier Charges",
    "Transportation",
    "Loading Charges",
    "Unloading Charges",
    "Advertising",
    "Promotions",
    "Photography",
    "POS Charges",
    "Payment Charges",
    "Platform Commission",
    "Marketplace Fees",
    "Customer Refunds",
    "Discounts",
    "Sales Returns",
    "Stock Damage",
    "Stock Shortage",
    "Stock Writeoff",
    "Cash Shortage",
    "Electricity",
    "Internet",
    "Telephone",
    "Cleaning",
    "Pest Control",
    "Security",
    "Repairs",
    "Maintenance",
    "Furniture",
    "Store Display",
    "Printing",
    "Barcode Labels",
    "Warranty Claims",
    "Insurance",
    "Miscellaneous",
  ],
  Cafe: [
    "Grocery Purchase",
    "Vegetable Purchase",
    "Fruit Purchase",
    "Dairy Purchase",
    "Bakery Purchase",
    "Meat Purchase",
    "Egg Purchase",
    "Beverage Purchase",
    "Coffee Purchase",
    "Tea Purchase",
    "Snack Purchase",
    "Condiment Purchase",
    "Frozen Food Purchase",
    "Water Purchase",
    "Disposables",
    "Gas Charges",
    "Water Charges",
    "Laundry",
    "Waste Disposal",
    "Food Wastage",
    "Equipment Repairs",
    "Delivery Commission",
    "Complimentary Orders",
    "Menu Printing",
    "Food Testing",
    "Hygiene Testing",
    "License Fees",
    "Music License",
  ],
  Services: [],
  Space: [
    "Rent",
    "Housekeeping",
    "CCTV Maintenance",
    "AC Maintenance",
    "Plumbing Repairs",
    "Electrical Repairs",
    "Furniture Repairs",
    "Painting",
    "Deep Cleaning",
    "Booking Software",
    "Software Fees",
    "Booking Commission",
    "Member Amenities",
    "Guest Refreshments",
    "Office Supplies",
    "Signage",
    "Equipment Rental",
    "Parking Charges",
    "Fire Safety",
  ],
  Events: [
    "Event Materials",
    "Craft Supplies",
    "Artist Fees",
    "Trainer Fees",
    "Freelancer Fees",
    "Host Fees",
    "Performer Fees",
    "Venue Rental",
    "Venue Setup",
    "Decoration",
    "Sound Rental",
    "Lighting Rental",
    "Furniture Rental",
    "Stage Rental",
    "Generator Rental",
    "Event Catering",
    "Refreshments",
    "Guest Hospitality",
    "Event Kits",
    "Participant Gifts",
    "Certificates",
    "Videography",
    "Editing Charges",
    "Travel Expenses",
    "Accommodation",
    "Event Security",
    "Volunteer Expenses",
    "Ticketing Fees",
    "Cancellation Charges",
    "Vendor Payments",
    "Permit Fees",
    "First Aid",
    "Safety Equipment",
  ],
  Admin: [
    "Management Salary",
    "Recruitment",
    "Training",
    "Professional Fees",
    "Accounting Fees",
    "Audit Fees",
    "Legal Fees",
    "Consulting Fees",
    "Secretarial Fees",
    "Compliance Fees",
    "Filing Fees",
    "Registration Fees",
    "Renewal Fees",
    "Bank Charges",
    "Interest Expense",
    "Loan Processing Fees",
    "Stationery",
    "Postage",
    "Subscriptions",
    "Cloud Services",
    "Data Charges",
    "Local Conveyance",
    "Meals",
    "Meeting Expenses",
    "Staff Uniforms",
    "Medical Expenses",
    "Background Checks",
    "Office Repairs",
    "Depreciation",
    "Amortization",
    "Bad Debts",
    "Penalties",
    "Late Fees",
    "Taxes",
    "Property Tax",
  ],
  General: [
    "Common Rent",
    "Common Electricity",
    "Common Utilities",
    "Common Internet",
    "Common Telephone",
    "Common Cleaning",
    "Common Security",
    "Common Repairs",
    "Common Maintenance",
    "Shared Staff",
    "Shared Transportation",
    "Digital Marketing",
    "Brand Marketing",
    "Branding",
    "Graphic Design",
    "Content Creation",
    "Social Media",
    "Public Relations",
    "Influencer Fees",
    "Promotional Materials",
    "Website Hosting",
    "Domain Charges",
    "Email Hosting",
    "Website Maintenance",
    "App Maintenance",
    "IT Support",
    "Technical Support",
    "Data Backup",
    "Cybersecurity",
    "Business Meals",
    "Networking Fees",
    "Membership Fees",
    "Community Welfare",
    "Donations",
    "Asset Disposal Loss",
    "Foreign Exchange Loss",
    "Customer Goodwill",
    "Compensation",
    "Emergency Repairs",
    "Legal Settlements",
    "Fraud Loss",
    "Environmental Fees",
    "Waste Management",
    "Unrecoverable GST",
    "Rounding Difference",
    "Unallocated Expenses",
    "Utilities",
    "Salary",
    "Marketing",
    "Supplies",
    "Other",
  ],
};

function categoriesForSegment(segment: string) {
  const key = Object.keys(CATEGORIES_BY_SEGMENT).find(
    (name) => name.toLowerCase() === segment.trim().toLowerCase(),
  );
  return key ? CATEGORIES_BY_SEGMENT[key] : [];
}

const MODE_OPTIONS = ["Cash", "UPI", "Card", "Bank Transfer", "Wallet", "Due"];
const STATUS_OPTIONS = ["Paid", "Pending", "Cancelled"];

function toForm(initial?: ExpenseModalValues | null) {
  if (!initial) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    title: initial.title || "",
    description: initial.description || "",
    category: initial.category || "",
    segment: initial.segment || "",
    amount:
      initial.amount === undefined || initial.amount === null
        ? ""
        : String(initial.amount),
    paidTo: initial.paidTo || "",
    vendorId: initial.vendorId || "",
    paidByName: String(initial.paidBy?.m_staff_name ?? "").trim(),
    paidById: String(initial.paidBy?.m_staff_id ?? "").trim(),
    paidByEmail: String(initial.paidBy?.m_staff_email ?? "").trim(),
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const categoryValueRef = useRef("");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";
  const currentUser = useAppSelector((state) => state.user);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState<string | null>(null);
  const [allVendors, setAllVendors] = useState<VendorOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [allStaff, setAllStaff] = useState<StaffOption[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [paidByDropdownOpen, setPaidByDropdownOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  categoryValueRef.current = formData.category;
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const debouncedVendorSearch = useDebounce(formData.paidTo.trim(), 250);
  const debouncedPaidBySearch = useDebounce(formData.paidByName.trim(), 250);

  useEffect(() => {
    if (!isOpen) return;
    const base = toForm(initialExpense);
    // Default Paid By to logged-in user on create when not prefilled
    if (
      mode === "create" &&
      !base.paidById &&
      !base.paidByName &&
      currentUser.m_staff_name
    ) {
      base.paidByName = String(currentUser.m_staff_name);
      base.paidById = String(currentUser.m_staff_id || "");
      base.paidByEmail = String(currentUser.m_staff_email || "");
    }
    setFormData(base);
    setPreview(initialExpense?.receiptUrl || null);
    setVendorDropdownOpen(false);
    setPaidByDropdownOpen(false);
    setCategoryDropdownOpen(false);
    setCategoryQuery(base.category || "");
    setShowCreateVendor(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, [isOpen, initialExpense, mode, currentUser]);

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
    if (!isOpen || isView) return;
    const controller = new AbortController();
    const loadStaff = async () => {
      try {
        setLoadingStaff(true);
        const response = await handleGetAccessStaff("", controller.signal);
        const list = Array.isArray(response?.staff) ? response.staff : [];
        const mapped: StaffOption[] = list
          .map((item: any) => ({
            _id: String(item?._id ?? ""),
            m_staff_id: String(item?.m_staff_id ?? item?._id ?? "").trim(),
            fullName: String(item?.fullName ?? "").trim(),
            email: String(item?.email ?? "").trim(),
            phoneNumber: String(item?.phoneNumber ?? "").trim(),
          }))
          .filter((item: StaffOption) => Boolean(item.fullName));
        setAllStaff(mapped);
        setStaffOptions(mapped);
      } catch {
        if (!controller.signal.aborted) {
          setAllStaff([]);
          setStaffOptions([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingStaff(false);
      }
    };
    void loadStaff();
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

  useEffect(() => {
    if (!paidByDropdownOpen) return;
    if (!debouncedPaidBySearch) {
      setStaffOptions(allStaff);
      return;
    }
    const term = debouncedPaidBySearch.toLowerCase();
    setStaffOptions(
      allStaff.filter((item) =>
        [item.fullName, item.email, item.m_staff_id, item.phoneNumber].some(
          (value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(term),
        ),
      ),
    );
  }, [debouncedPaidBySearch, allStaff, paidByDropdownOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleCancel = () => {
    void closeIfConfirmed(() => {
      resetForm();
      onClose();
    });
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    if (isView) return;
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "status" && value === "Pending" ? { mode: "Due" } : {}),
    }));
  };

  const handleSegmentChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (isView) return;
    const { value } = e.target;
    const allowed = categoriesForSegment(value);
    let nextCategory = "";
    setFormData((prev) => {
      nextCategory = allowed.includes(prev.category) ? prev.category : "";
      return {
        ...prev,
        segment: value,
        category: nextCategory,
      };
    });
    setCategoryQuery(nextCategory);
    setCategoryDropdownOpen(false);
  };

  const clearReceiptInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isView) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage =
      /^image\/(png|jpe?g|webp)$/i.test(file.type) ||
      (!file.type && /\.(png|jpe?g|webp)$/i.test(file.name));
    if (!isImage) {
      clearReceiptInputs();
      await Swal.fire(
        "Image required",
        "Choose a PNG, JPG, or WEBP photo, or take one with the camera.",
        "warning",
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      clearReceiptInputs();
      await Swal.fire(
        "File too large",
        "Receipt photos must be 5MB or smaller.",
        "warning",
      );
      return;
    }
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
    clearReceiptInputs();
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
    if (!formData.paidByName.trim()) {
      await Swal.fire(
        "Paid By required",
        "Please select who paid for this expense.",
        "warning",
      );
      return null;
    }
    return {
      title,
      description: formData.description.trim(),
      category: formData.category || "Other",
      segment: formData.segment,
      amount,
      paidTo,
      vendorId: formData.vendorId,
      paidBy: {
        m_staff_id: formData.paidById || null,
        m_staff_name: formData.paidByName.trim(),
        m_staff_email: formData.paidByEmail || null,
      },
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

  const fieldClass = `w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
    isView ? "bg-gray-50 text-gray-700" : "bg-white"
  }`;
  const filledCategoryCount =
    (formData.segment ? 1 : 0) + (formData.category ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:px-4">
      <div className="flex max-h-[96vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-slate-100 shadow-xl md:max-h-[90vh] md:rounded-xl md:bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-4 md:px-6">
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-100 px-3 py-3 md:space-y-4 md:bg-white md:px-6 md:py-5">
            <section className="rounded-2xl bg-white p-4 shadow-sm md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
              <h3 className="mb-3 text-[15px] font-bold text-slate-900 md:hidden">
                Basic Details
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Amount <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-500 shadow-sm">
                  ₹
                </span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required={!isView}
                  readOnly={isView}
                  className={`${fieldClass} border-[#d7e6ff] bg-[#eef4ff] pl-11`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:col-span-2 [&>*]:min-w-0">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required={!isView}
                  readOnly={isView}
                  className={`${fieldClass} pl-9`}
                />
              </div>
            </div>
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Paid By <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                {!isView ? (
                  <User
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                ) : null}
                <input
                  type="text"
                  name="paidByName"
                  value={formData.paidByName}
                  onChange={(e) => {
                    if (isView) return;
                    setFormData((prev) => ({
                      ...prev,
                      paidByName: e.target.value,
                      paidById: "",
                      paidByEmail: "",
                    }));
                    setPaidByDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (!isView) setPaidByDropdownOpen(true);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setPaidByDropdownOpen(false), 150);
                  }}
                  placeholder="Search staff / payer..."
                  required={!isView}
                  readOnly={isView}
                  autoComplete="off"
                  className={`${fieldClass} ${isView ? "" : "pl-9"}`}
                />
              </div>
              {!isView && paidByDropdownOpen && loadingStaff ? (
                <p className="mt-2 text-xs text-gray-500">Loading users...</p>
              ) : null}
              {!isView &&
              paidByDropdownOpen &&
              !loadingStaff &&
              staffOptions.length > 0 ? (
                <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {staffOptions.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onMouseDown={() => {
                        setFormData((prev) => ({
                          ...prev,
                          paidByName: item.fullName,
                          paidById: item.m_staff_id || item._id,
                          paidByEmail: item.email,
                        }));
                        setPaidByDropdownOpen(false);
                      }}
                      className="flex w-full flex-col border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-800">
                        {item.fullName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {[item.m_staff_id, item.email, item.phoneNumber]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {!isView &&
              paidByDropdownOpen &&
              !loadingStaff &&
              staffOptions.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  No users found. Check Access staff permissions.
                </p>
              ) : null}
            </div>
            </div>

            <div className="relative md:col-span-2">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <label className="block text-sm font-medium text-gray-700">
                  Paid To (Vendor) <span className="text-rose-500">*</span>
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
                  placeholder="Search or select vendor"
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
            <div className="relative md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Title <span className="text-rose-500">*</span>
              </label>
              <FileText
                size={15}
                className="pointer-events-none absolute left-3 top-[2.35rem] text-slate-400"
              />
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Monthly Studio"
                required={!isView}
                readOnly={isView}
                className={`${fieldClass} pl-9`}
              />
            </div>
            <div className="relative md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <FileText
                size={15}
                className="pointer-events-none absolute left-3 top-[2.35rem] text-slate-400"
              />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g. August rent pay"
                readOnly={isView}
                maxLength={300}
                rows={3}
                className={`${fieldClass} min-h-[88px] resize-none pl-9 pb-6`}
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-slate-400">
                {formData.description.length}/300
              </span>
            </div>
              </div>
            </section>
            <section className="rounded-2xl bg-white p-4 shadow-sm md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
              <div className="mb-3 flex items-center justify-between md:hidden">
                <h3 className="text-[15px] font-bold text-slate-900">Categorization</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                  {filledCategoryCount}/2
                </span>
              </div>
            <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Segment <span className="text-rose-500">*</span>
              </label>
              <Store
                size={15}
                className="pointer-events-none absolute left-3 top-[2.35rem] text-slate-400"
              />
              <select
                name="segment"
                value={formData.segment}
                onChange={handleSegmentChange}
                required={!isView}
                disabled={isView}
                className={`${fieldClass} appearance-none pl-9 pr-8`}
              >
                <option value="">Select segment</option>
                {SEGMENT_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-[2.4rem] text-slate-400"
              />
            </div>
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Category <span className="text-rose-500">*</span>
              </label>
              <Tag
                size={15}
                className="pointer-events-none absolute left-3 top-[2.35rem] z-10 text-slate-400"
              />
              <div className="relative">
                {!isView ? (
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                ) : null}
                <input
                  type="text"
                  value={categoryDropdownOpen ? categoryQuery : formData.category}
                  onChange={(e) => {
                    if (isView || !formData.segment) return;
                    setCategoryQuery(e.target.value);
                    setCategoryDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (isView || !formData.segment) return;
                    setCategoryQuery("");
                    setCategoryDropdownOpen(true);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setCategoryDropdownOpen(false);
                      setCategoryQuery(categoryValueRef.current);
                    }, 150);
                  }}
                  placeholder={
                    formData.segment ? "Search category" : "Select segment first"
                  }
                  readOnly={isView || !formData.segment}
                  autoComplete="off"
                  className={`${fieldClass} pl-9`}
                />
                {!isView ? (
                  <input
                    tabIndex={-1}
                    className="pointer-events-none absolute h-0 w-0 opacity-0"
                    value={formData.category}
                    required={!isView}
                    onChange={() => undefined}
                  />
                ) : null}
              </div>
              {!isView && categoryDropdownOpen && formData.segment ? (
                <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {(() => {
                    const mapped = categoriesForSegment(formData.segment);
                    const options =
                      formData.category && !mapped.includes(formData.category)
                        ? [formData.category, ...mapped]
                        : mapped;
                    const query = categoryQuery.trim().toLowerCase();
                    const visible = query
                      ? options.filter((name) =>
                          name.toLowerCase().includes(query),
                        )
                      : options;
                    if (!visible.length) {
                      return (
                        <p className="px-3 py-2 text-xs text-gray-500">
                          No categories found.
                        </p>
                      );
                    }
                    return visible.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onMouseDown={() => {
                          setFormData((prev) => ({ ...prev, category: cat }));
                          setCategoryQuery(cat);
                          setCategoryDropdownOpen(false);
                        }}
                        className="flex w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50"
                      >
                        {cat}
                      </button>
                    ));
                  })()}
                </div>
              ) : null}
            </div>
            </div>
            </section>

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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-7 transition hover:border-blue-400 hover:bg-blue-50/50"
                    >
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <ImagePlus size={20} />
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        Upload file
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        PNG, JPG or WEBP up to 5MB
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-7 transition hover:border-blue-400 hover:bg-blue-50/50"
                    >
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Camera size={20} />
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        Open camera
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Take a photo of the receipt
                      </p>
                    </button>
                  </div>
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
                    <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-3 py-2">
                      <p className="min-w-0 flex-1 truncate text-xs text-gray-600">
                        {formData.receipt?.name || "Receipt image"}
                      </p>
                      <span className="shrink-0 text-xs text-gray-400">
                        {formData.receipt
                          ? `${(formData.receipt.size / 1024 / 1024).toFixed(2)} MB`
                          : ""}
                      </span>
                      {!isView ? (
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          >
                            Upload
                          </button>
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          >
                            Camera
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {!isView ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </>
                ) : null}
              </div>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-4 py-4 md:px-6">
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
