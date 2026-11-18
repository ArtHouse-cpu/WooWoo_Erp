import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Infinity as InfinityIcon,
  Loader2,
  Mail,
  Phone,
  Search,
  Sparkles,
  User,
  Wand2,
  X,
} from "lucide-react";
import type { GiftCardData } from "../Pages/GiftCard";
import { useAuthStore } from "@/store/authStore";
import { useAppSelector } from "@/store/hooks";
import { toast } from "react-toastify";
import { closeIfConfirmed } from "@/utils/confirmClose";
import { handleGetCustomers } from "@/services/apiClient";
import { useDebounce } from "@/hooks/useDebounce";

export type CustomerSummary = {
  _id: string;
  id?: string;
  customerId?: string;
  name: string;
  mobile: string;
  email?: string;
  profileImage?: string;
  companyName?: string;
  membershipType?: string;
};

export type GiftCardFormData = Omit<GiftCardData, "_id"> & {
  _id?: string;
  expiryType?: "never" | "custom";
  customer?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerMobile?: string | null;
  customerEmail?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Return false (or reject) to keep the modal open, e.g. on a server error. */
  onSubmit: (card: GiftCardFormData) => Promise<boolean | void> | boolean | void;
  initialData?: GiftCardData | null;
  existingCards?: GiftCardData[];
  defaultCreatedBy?: string;
};

export const resolveStaffName = (
  reduxName?: string | null,
  authUserName?: string | null,
  fallback?: string,
): string => {
  const fromRedux = reduxName?.trim();
  if (fromRedux) return fromRedux;

  const fromAuth = authUserName?.trim();
  if (fromAuth) return fromAuth;

  try {
    const authRaw = localStorage.getItem("auth-storage");
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      const u = parsed?.state?.user;
      const name =
        u?.fullName?.trim() || u?.name?.trim() || u?.m_staff_name?.trim();
      if (name) return name;
    }
  } catch {
    // ignore
  }

  try {
    const reduxRaw = localStorage.getItem("wooerp-redux-user");
    if (reduxRaw) {
      const parsed = JSON.parse(reduxRaw);
      const name = parsed?.m_staff_name?.trim();
      if (name) return name;
    }
  } catch {
    // ignore
  }

  return fallback?.trim() || "Staff";
};

export const generateGiftCardCode = (existingCards: GiftCardData[] = []): string => {
  const year = new Date().getFullYear();
  let maxNum = 0;
  for (const c of existingCards) {
    const match = c.code?.match(/GC-\d+-(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  const nextNum = maxNum > 0 ? maxNum + 1 : existingCards.length + 1;
  return `GC-${year}-${String(nextNum).padStart(3, "0")}`;
};

const getDefaultExpiryDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
};

const getInitials = (name?: string) => {
  if (!name) return "CU";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function CreateGiftCardModal({
  open,
  onClose,
  onSubmit,
  initialData = null,
  existingCards = [],
  defaultCreatedBy = "",
}: Props) {
  const authUser = useAuthStore((state) => state.user);
  const reduxStaffName = useAppSelector((state) => state.user.m_staff_name);

  const resolvedStaffName = useMemo(() => {
    const authName =
      authUser?.fullName ||
      (authUser as any)?.name ||
      (authUser as any)?.m_staff_name ||
      null;
    return resolveStaffName(reduxStaffName, authName, defaultCreatedBy || "Admin");
  }, [reduxStaffName, authUser, defaultCreatedBy]);

  const isEdit = Boolean(initialData?._id);

  // Wizard Step: 1 = Select Customer, 2 = Configure Gift Card
  const [step, setStep] = useState<1 | 2>(1);

  // Customer search & selection
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedSearch = useDebounce(customerSearch, 300);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [initialAmount, setInitialAmount] = useState<number | "">("");
  const [createdBy, setCreatedBy] = useState("");
  const [expiryType, setExpiryType] = useState<"never" | "custom">("never");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState<GiftCardData["status"]>("Active");
  const [submitting, setSubmitting] = useState(false);

  // Search input ref for autofocus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch customers on search or initial modal open
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await handleGetCustomers(
          debouncedSearch.trim(),
          controller.signal,
          20,
        );
        const list = Array.isArray(response?.customers)
          ? response.customers
          : [];
        setCustomers(list);
      } catch (err: any) {
        if (err?.code !== "ERR_CANCELED") {
          console.error("Error fetching customers:", err);
        }
      } finally {
        setLoadingCustomers(false);
      }
    };

    void fetchCustomers();
    return () => controller.abort();
  }, [open, debouncedSearch]);

  // Initialize or reset form state
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setCode(initialData.code || "");
      setName(initialData.name || "");
      setInitialAmount(initialData.initialAmount ?? 0);
      setCreatedBy(initialData.createdBy || resolvedStaffName);
      
      const isNever = initialData.expiryType === "never" || !initialData.expiryDate;
      setExpiryType(isNever ? "never" : "custom");
      setExpiryDate(
        initialData.expiryDate
          ? new Date(initialData.expiryDate).toISOString().split("T")[0]
          : getDefaultExpiryDate(),
      );
      setStatus(initialData.status || "Active");

      if (initialData.customerName || initialData.customerId || initialData.customerMobile) {
        setSelectedCustomer({
          _id: initialData.customer || "",
          id: initialData.customerId || undefined,
          customerId: initialData.customerId || undefined,
          name: initialData.customerName || "Assigned Customer",
          mobile: initialData.customerMobile || "",
          email: initialData.customerEmail || "",
        });
        setStep(2); // Start at step 2 when editing existing card with customer
      } else {
        setSelectedCustomer(null);
        setStep(1);
      }
    } else {
      setCode(generateGiftCardCode(existingCards));
      setName("");
      setInitialAmount("");
      setCreatedBy(resolvedStaffName);
      setExpiryType("never");
      setExpiryDate(getDefaultExpiryDate());
      setStatus("Active");
      setSelectedCustomer(null);
      setCustomerSearch("");
      setStep(1);
    }
  }, [open, initialData, existingCards, resolvedStaffName]);

  // Focus search when entering step 1
  useEffect(() => {
    if (open && step === 1) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open, step]);

  if (!open) return null;

  const handleSelectCustomer = (customer: CustomerSummary) => {
    setSelectedCustomer(customer);
  };

  const handleProceedToStep2 = () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer to continue.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!selectedCustomer) {
      toast.error("A customer must be assigned to this gift card.");
      setStep(1);
      return;
    }

    if (!code.trim()) {
      toast.error("Gift card code is required.");
      return;
    }
    if (!name.trim()) {
      toast.error("Gift card name is required.");
      return;
    }
    if (initialAmount === "" || Number(initialAmount) <= 0) {
      toast.error("Please enter a valid amount greater than ₹0.");
      return;
    }

    if (expiryType === "custom") {
      if (!expiryDate) {
        toast.error("Please select an expiry date.");
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      if (expiryDate < today) {
        toast.error("Expiry date cannot be in the past.");
        return;
      }
    }

    if (isEdit && initialData?.status === "Used" && status === "Active") {
      toast.error("This gift card has already been used and cannot be reactivated.");
      return;
    }

    setSubmitting(true);
    let saved: boolean | void = false;
    try {
      const amount = Number(initialAmount);
      saved = await onSubmit({
        _id: initialData?._id,
        code: code.trim(),
        name: name.trim(),
        initialAmount: amount,
        currentBalance: amount,
        createdBy: createdBy.trim() || resolvedStaffName,
        expiryType,
        expiryDate: expiryType === "never" ? "" : expiryDate,
        status,
        customer: selectedCustomer._id || null,
        customerId: selectedCustomer.customerId || selectedCustomer.id || null,
        customerName: selectedCustomer.name || "",
        customerMobile: selectedCustomer.mobile || "",
        customerEmail: selectedCustomer.email || "",
      });
    } catch {
      saved = false;
    } finally {
      setSubmitting(false);
    }

    if (saved !== false) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) void closeIfConfirmed(onClose);
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                {step}
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                {isEdit ? "Edit Gift Card" : "Create Gift Card"}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {step === 1
                ? "Step 1 of 2: Search and select a customer for exclusive assignment."
                : "Step 2 of 2: Configure gift card details, amount, and expiry."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Wizard Step Progress Tracker */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 px-6 py-2.5">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 text-xs font-semibold transition ${
              step === 1
                ? "text-black"
                : "text-emerald-600 hover:text-emerald-700"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                step === 1
                  ? "bg-black text-white"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {selectedCustomer && step === 2 ? (
                <Check size={12} strokeWidth={3} />
              ) : (
                "1"
              )}
            </span>
            <span>Select Customer</span>
          </button>

          <div className="mx-3 flex items-center text-gray-300">
            <ChevronRight size={14} />
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedCustomer) setStep(2);
              else toast.info("Select a customer first to proceed to configuration.");
            }}
            className={`flex items-center gap-2 text-xs font-semibold transition ${
              step === 2
                ? "text-black"
                : selectedCustomer
                  ? "text-gray-600 hover:text-black"
                  : "cursor-not-allowed text-gray-400"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                step === 2
                  ? "bg-black text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              2
            </span>
            <span>Configure Gift Card</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 ? (
            /* STEP 1: CUSTOMER SELECTION */
            <div className="space-y-4">
              {/* Search Box */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Search Customer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3.5 top-3 text-gray-400"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by customer name, mobile, email, or customer ID..."
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-10 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch("")}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Search through customer database by name, 10-digit mobile, email, or customer ID.
                </p>
              </div>

              {/* Selected Customer Preview Card (if chosen) */}
              {selectedCustomer && (
                <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/50 p-4 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-100 text-sm font-bold text-emerald-800">
                        {selectedCustomer.profileImage ? (
                          <img
                            src={selectedCustomer.profileImage}
                            alt={selectedCustomer.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(selectedCustomer.name)
                        )}
                        <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                          <Check size={8} strokeWidth={3} />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {selectedCustomer.name}
                          </span>
                          {(selectedCustomer.customerId || selectedCustomer.id) && (
                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-300">
                              {selectedCustomer.customerId || selectedCustomer.id}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Phone size={12} className="text-gray-400" />
                            {selectedCustomer.mobile || "—"}
                          </span>
                          {selectedCustomer.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail size={12} className="text-gray-400" />
                              {selectedCustomer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                      <Check size={12} /> Selected
                    </span>
                  </div>
                </div>
              )}

              {/* Customer Results List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {customerSearch ? "Search Results" : "Recent / All Customers"}
                  </span>
                  {loadingCustomers && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Loader2 size={12} className="animate-spin" /> Searching...
                    </span>
                  )}
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {loadingCustomers && customers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <Loader2 size={24} className="animate-spin text-gray-500" />
                      <p className="mt-2 text-xs">Loading customer records...</p>
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-8 text-center text-gray-400">
                      <User size={28} className="text-gray-300" />
                      <p className="mt-2 text-xs font-medium text-gray-600">
                        {customerSearch
                          ? `No customers found matching "${customerSearch}"`
                          : "No customers found"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Check the spelling or try searching with mobile number or customer ID.
                      </p>
                    </div>
                  ) : (
                    customers.map((c) => {
                      const isSelected = selectedCustomer?._id === c._id;
                      return (
                        <div
                          key={c._id}
                          onClick={() => handleSelectCustomer(c)}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                            isSelected
                              ? "border-black bg-gray-50/80 shadow-xs ring-1 ring-black"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-xs font-bold text-gray-700">
                              {c.profileImage ? (
                                <img
                                  src={c.profileImage}
                                  alt={c.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(c.name)
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  {c.name}
                                </span>
                                {(c.customerId || c.id) && (
                                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                                    {c.customerId || c.id}
                                  </span>
                                )}
                                {c.membershipType && c.membershipType !== "none" && (
                                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 capitalize">
                                    {c.membershipType}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1">
                                  <Phone size={11} className="text-gray-400" />
                                  {c.mobile || "—"}
                                </span>
                                {c.email && (
                                  <span className="inline-flex items-center gap-1">
                                    <Mail size={11} className="text-gray-400" />
                                    {c.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                                isSelected
                                  ? "border-black bg-black text-white"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: CONFIGURE GIFT CARD */
            <form id="gift-card-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Assigned Customer Card */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-black text-xs font-bold text-white">
                    {selectedCustomer?.profileImage ? (
                      <img
                        src={selectedCustomer.profileImage}
                        alt={selectedCustomer.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(selectedCustomer?.name)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Assigned Customer:
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {selectedCustomer?.name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-600">
                      <span>{selectedCustomer?.mobile}</span>
                      {selectedCustomer?.customerId && (
                        <span>ID: {selectedCustomer.customerId}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  Change
                </button>
              </div>

              {/* 1. Gift Card Code */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Gift Card Code <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GC-2026-004"
                    required
                    className="h-10 flex-1 rounded-xl border border-gray-300 px-3.5 text-sm font-medium tracking-wide text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  />
                  <button
                    type="button"
                    onClick={() => setCode(generateGiftCardCode(existingCards))}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-50 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                    title="Generate new code"
                  >
                    <Wand2 size={15} />
                    <span>Generate</span>
                  </button>
                </div>
              </div>

              {/* 2. Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Gift Card Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Birthday Gift Card, Festival Gift Card, Loyalty Reward"
                  required
                  autoFocus
                  className="h-10 w-full rounded-xl border border-gray-300 px-3.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* 3. Amount */}
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
                    min={1}
                    step="1"
                    value={initialAmount}
                    onChange={(e) =>
                      setInitialAmount(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    required
                    disabled={isEdit && initialData?.status === "Used"}
                    className="h-10 w-full rounded-xl border border-gray-300 pl-8 pr-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-50"
                    placeholder="2000"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  This code can be used once. Any amount above the bill is not kept.
                </p>
              </div>

              {/* 4. Created By & Status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Created By <span className="text-red-500">*</span>
                    </label>
                    {resolvedStaffName && (
                      <span className="text-[11px] font-medium text-emerald-600">
                        Logged in: {resolvedStaffName}
                      </span>
                    )}
                  </div>
                  <input
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    placeholder="Staff name"
                    required
                    className="h-10 w-full rounded-xl border border-gray-300 px-3.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as GiftCardData["status"])
                    }
                    className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    {isEdit && (
                      <>
                        <option value="Used">Used</option>
                        <option value="Expired">Expired</option>
                        <option value="Cancelled">Cancelled</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* 5. Expiry Type Selection */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Expiry Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExpiryType("never")}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      expiryType === "never"
                        ? "border-black bg-black/5 ring-1 ring-black"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        expiryType === "never"
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <InfinityIcon size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-900">
                        Never Expires
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        Valid indefinitely
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExpiryType("custom");
                      if (!expiryDate) setExpiryDate(getDefaultExpiryDate());
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      expiryType === "custom"
                        ? "border-black bg-black/5 ring-1 ring-black"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        expiryType === "custom"
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Calendar size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-900">
                        Choose Expiry Date
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        Specific validity period
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditionally Displayed Expiry Date Picker */}
              {expiryType === "custom" && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 transition animate-in fade-in duration-200">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      required={expiryType === "custom"}
                      className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    The gift card will automatically expire and become invalid after midnight on this date.
                  </p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={() => void closeIfConfirmed(onClose)}
                className="cursor-pointer rounded-xl border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedCustomer}
                onClick={handleProceedToStep2}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-black px-6 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void closeIfConfirmed(onClose)}
                  className="cursor-pointer rounded-xl border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="gift-card-form"
                  disabled={submitting}
                  className="cursor-pointer rounded-xl bg-black px-6 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? isEdit
                      ? "Updating..."
                      : "Creating..."
                    : isEdit
                      ? "Update Gift Card"
                      : "Create Gift Card"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
