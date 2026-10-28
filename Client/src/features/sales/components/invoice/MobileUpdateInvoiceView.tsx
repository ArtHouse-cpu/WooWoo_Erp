import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Play,
  FileText,
  Info,
  Pencil,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Truck,
  MapPin,
  Landmark,
  PenTool,
  Receipt,
  Search,
  X,
  Check,
  Loader2,
} from "lucide-react";
import type { InvoiceItem } from "./types";
import {
  handleCatalogueLookup,
  handleGetCustomers,
  type CatalogueLookupItem,
} from "@/services/apiClient";
import Swal from "sweetalert2";
import { useDebounce } from "@/hooks/useDebounce";

export type MobileUpdateInvoiceViewProps = {
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  customer: string;
  phone: string;
  customerId?: string | null;
  membership?: string;
  membershipPlanId?: string | null;
  membershipPlans?: any[];
  salesPerson?: string;
  bankName?: string;
  signatoryName?: string;
  terms?: string;
  items: InvoiceItem[];
  subTotal: number;
  grandTotal: number;
  discountTotal: number;
  extraCharges: Array<{ label: string; amount: number }>;
  notes: string;
  saving?: boolean;
  onBack: () => void;
  onUpdate: () => void;
  onPickCustomer: (customer: any) => void;
  onOpenCreateCustomer: () => void;
  onUpdateItemQty: (id: number, newQty: number) => void;
  onUpdateItemDiscount: (id: number, newDiscount: number) => void;
  onRemoveItem: (id: number) => void;
  onAddDirectItem?: (item: Omit<InvoiceItem, "id">) => void;
  onInvoiceDateChange: (val: string) => void;
  onInvoiceNoChange?: (val: string) => void;
  onNotesChange: (val: string) => void;
  onExtraChargesChange: (
    charges: Array<{ label: string; amount: number }>,
  ) => void;
};

function formatCardDate(val?: string | Date): string {
  if (!val) return "Today";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function MobileUpdateInvoiceView({
  invoiceNo,
  invoiceDate,
  customer,
  phone,
  membership = "none",
  salesPerson = "Sales Person",
  bankName = "JSA BOB CC",
  signatoryName = "Ankur Anand",
  terms = "Return of sold products aren't allowed without receipt.",
  items,
  grandTotal,
  extraCharges,
  notes,
  saving = false,
  onBack,
  onUpdate,
  onPickCustomer,
  onOpenCreateCustomer,
  onUpdateItemQty,
  onUpdateItemDiscount,
  onRemoveItem,
  onAddDirectItem,
  onInvoiceDateChange,
  onInvoiceNoChange,
  onNotesChange,
  onExtraChargesChange,
}: MobileUpdateInvoiceViewProps) {
  // Modal / drawer states
  const [showEditDateModal, setShowEditDateModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showChargesModal, setShowChargesModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Expanded items toggle
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [viewMoreExpanded, setViewMoreExpanded] = useState(false);

  // Editable local copies of addresses/terms
  const [dispatchAddress, setDispatchAddress] = useState(
    "#20 Commercial Complex, Near Metro Station, Bangalore",
  );
  const [shippingAddress, setShippingAddress] = useState("");
  const [activeBank, setActiveBank] = useState(bankName || "JSA BOB CC");
  const [activeTerms, setActiveTerms] = useState(
    terms || "Return of sold products aren't allowed without receipt.",
  );
  const [activeSignatory, setActiveSignatory] = useState(
    signatoryName || "Ankur Anand",
  );

  // Date edit modal temp states
  const [tempDate, setTempDate] = useState(invoiceDate);
  const [tempInvoiceNo, setTempInvoiceNo] = useState(invoiceNo);

  // Customer search states with debouncing
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearch.trim(), 300);
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Add Item search states with debouncing
  const [itemSearch, setItemSearch] = useState("");
  const debouncedItemSearch = useDebounce(itemSearch.trim(), 300);
  const [itemResults, setItemResults] = useState<CatalogueLookupItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [customItemMode, setCustomItemMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customCategory, setCustomCategory] = useState("General");

  // Charges modal temp states
  const [chargeLabel, setChargeLabel] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");

  const toggleItemExpansion = (idx: number) => {
    setExpandedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Debounced product catalogue lookup
  useEffect(() => {
    if (!debouncedItemSearch) {
      setItemResults([]);
      setLoadingItems(false);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingItems(true);
        const res = await handleCatalogueLookup(
          debouncedItemSearch,
          controller.signal,
          { page: 1, limit: 30 },
        );
        if (!controller.signal.aborted) {
          setItemResults(Array.isArray(res?.items) ? res.items : []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setItemResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingItems(false);
        }
      }
    })();
    return () => controller.abort();
  }, [debouncedItemSearch]);

  // Debounced customer lookup
  useEffect(() => {
    if (!debouncedCustomerSearch) {
      setCustomerResults([]);
      setLoadingCustomers(false);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingCustomers(true);
        const res = await handleGetCustomers(
          debouncedCustomerSearch,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setCustomerResults(Array.isArray(res?.customers) ? res.customers : []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setCustomerResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCustomers(false);
        }
      }
    })();
    return () => controller.abort();
  }, [debouncedCustomerSearch]);

  const handleSelectCatalogueItem = (cItem: CatalogueLookupItem) => {
    if (!onAddDirectItem) return;
    const price = Number(cItem.sellingPrice || cItem.price || 0);
    onAddDirectItem({
      productName: cItem.name,
      qty: 1,
      unitPrice: price,
      discount: 0,
      cashback: 0,
      image: cItem.image || "",
      category: cItem.sourceType === "food" ? "Food" : cItem.sourceType === "space" ? "Space" : "General",
      isCsp: Boolean(cItem.isCsp),
      productDiscountAmount: 0,
      membershipDiscountAmount: 0,
    });
    setShowAddItemModal(false);
    setItemSearch("");
    setItemResults([]);
    Swal.fire({
      icon: "success",
      title: "Item Added",
      text: `${cItem.name} added to invoice.`,
      toast: true,
      position: "top-end",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleAddCustomItem = () => {
    if (!customName.trim() || !customPrice || Number(customPrice) <= 0) {
      Swal.fire("Invalid Item", "Please enter item name and valid price.", "warning");
      return;
    }
    if (!onAddDirectItem) return;
    onAddDirectItem({
      productName: customName.trim(),
      qty: Math.max(1, Number(customQty) || 1),
      unitPrice: Number(customPrice),
      discount: 0,
      cashback: 0,
      image: "",
      category: customCategory,
      isCsp: false,
      productDiscountAmount: 0,
      membershipDiscountAmount: 0,
    });
    setShowAddItemModal(false);
    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
    setCustomItemMode(false);
    Swal.fire({
      icon: "success",
      title: "Item Added",
      text: `${customName.trim()} added to invoice.`,
      toast: true,
      position: "top-end",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleAddCharge = () => {
    if (!chargeLabel.trim() || !chargeAmount || Number(chargeAmount) <= 0) {
      Swal.fire("Invalid Charge", "Please enter charge name and amount.", "warning");
      return;
    }
    const next = [...extraCharges, { label: chargeLabel.trim(), amount: Number(chargeAmount) }];
    onExtraChargesChange(next);
    setChargeLabel("");
    setChargeAmount("");
    setShowChargesModal(false);
  };

  const handleRemoveCharge = (idx: number) => {
    const next = extraCharges.filter((_, i) => i !== idx);
    onExtraChargesChange(next);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] pb-28 text-slate-900 antialiased font-sans">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white px-3.5 py-2.5 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 active:scale-95 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={22} className="stroke-[2.2]" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-bold tracking-tight text-slate-900 truncate">
              Update Invoice
            </h1>
            {/* <button
              type="button"
              disabled={saving}
              onClick={onUpdate}
              className="flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-500/25 transition hover:bg-blue-700 active:scale-95 disabled:opacity-60 shrink-0"
            >
              <span>{saving ? "Updating…" : "Update"}</span>
              <ChevronRight size={14} className="stroke-[2.5]" />
            </button> */}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Document Settings Icon */}
          <button
            type="button"
            onClick={() => setShowEditDateModal(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
            aria-label="Document settings"
          >
            <FileText size={16} />
          </button>
        </div>
      </header>

      {/* Main Scrollable Body */}
      <div className="px-3.5 py-3.5 space-y-3.5 max-w-lg mx-auto">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900">
                {invoiceNo || "INVWWAH-12100"}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">
                {formatCardDate(invoiceDate)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTempDate(invoiceDate);
                setTempInvoiceNo(invoiceNo);
                setShowEditDateModal(true);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 active:scale-95 transition"
            >
              Edit
            </button>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
            <span className="text-xs font-semibold text-slate-600">Customer</span>
            <Info size={13} className="text-slate-400" />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="truncate text-base font-bold text-slate-900">
                  {customer || "Select Customer"}
                </div>
                {phone && (
                  <div className="text-xs text-slate-500 mt-0.5">{phone}</div>
                )}
                {membership && membership !== "none" && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 ring-1 ring-inset ring-purple-200">
                    {membership}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    Swal.fire({
                      title: customer || "No Customer",
                      html: `<div class="text-left text-sm space-y-1">
                        <p><strong>Mobile:</strong> ${phone || "—"}</p>
                        <p><strong>Membership:</strong> ${membership || "None"}</p>
                      </div>`,
                      icon: "info",
                      confirmButtonText: "Close",
                    });
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 active:scale-95 transition"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 active:scale-95 transition"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. PRODUCTS SECTION                                            */}
        {/* ============================================================== */}
        <div>
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Products</span>
              <Info size={13} className="text-slate-400" />
            </div>
            <button
              type="button"
              onClick={() => setShowAddItemModal(true)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 active:scale-95 transition"
            >
              <Pencil size={11} className="stroke-[2.5]" />
              <span>Add / Edit</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3.5">
            {items.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No items added yet. Tap Add / Edit to add products.
              </div>
            ) : (
              items.map((item, idx) => {
                const itemTotal = Number(
                  item.lineTotal ||
                    Number(item.unitPrice || 0) * Number(item.qty || 1) -
                      Number(item.discount || 0),
                );
                const isExpanded = Boolean(expandedItems[idx]);
                const isSpace =
                  String(item.category || "").toLowerCase().includes("space") ||
                  String(item.productName || "").toLowerCase().includes("space");

                return (
                  <div
                    key={item.id ?? idx}
                    className={idx > 0 ? "border-t border-slate-100 pt-3.5" : ""}
                  >
                    {/* Top Row: Name & Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900 leading-snug">
                          {item.productName}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-slate-900 shrink-0">
                        ₹{itemTotal.toLocaleString("en-IN")}
                      </div>
                    </div>

                    {/* Second Row: Quantity & Details Toggle */}
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <div>x {item.qty}</div>
                      <button
                        type="button"
                        onClick={() => toggleItemExpansion(idx)}
                        className="flex items-center gap-0.5 font-semibold text-slate-500 hover:text-blue-600 transition"
                      >
                        <span>Details</span>
                        <ChevronRight
                          size={13}
                          className={`transition-transform duration-200 ${
                            isExpanded ? "rotate-90 text-blue-600" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {/* Disclaimer / Notes section matching reference image */}
                    {isSpace ? (
                      <div className="mt-2.5 rounded-xl bg-slate-50/90 p-2.5 text-[11px] leading-relaxed text-slate-600 border border-slate-100/80">
                        <div className="font-semibold text-slate-700">Disclaimer:</div>
                        <div className="mt-0.5 space-y-0.5 text-slate-500">
                          <p>Advance booking is required.</p>
                          <p>
                            ₹0/hr for 1st hour/ once a month (Exclusive for Art House Premium Members)
                          </p>
                          <p>Additional Charges for Speaker and projector access.</p>
                        </div>
                      </div>
                    ) : item.category && item.category !== "General" ? (
                      <div className="mt-2 text-[11px] text-slate-500">
                        Category: <span className="font-medium text-slate-700">{item.category}</span>
                      </div>
                    ) : null}

                    {/* Expandable Line Item Management */}
                    {isExpanded && (
                      <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Unit Price:</span>
                          <span className="font-semibold text-slate-800">
                            ₹{Number(item.unitPrice).toLocaleString("en-IN")}
                          </span>
                        </div>

                        {Number(item.discount || 0) > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Discount:</span>
                            <span className="font-semibold text-emerald-600">
                              - ₹{Number(item.discount).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}

                        {/* Quantity Controls & Delete */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateItemQty(item.id, Math.max(1, Number(item.qty) - 1))
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs active:scale-95"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-slate-800">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateItemQty(item.id, Number(item.qty) + 1)
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs active:scale-95"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* + Add More Items Pill Button */}
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAddItemModal(true)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs transition hover:bg-slate-100 active:scale-95"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Add More Items</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. CUSTOM HEADERS SECTION                                      */}
        {/* ============================================================== */}
        <div>
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <span className="text-xs font-semibold text-slate-600">Custom Headers</span>
            <button
              type="button"
              onClick={() => {
                Swal.fire({
                  title: "Edit Custom Header",
                  input: "text",
                  inputValue: salesPerson,
                  inputLabel: "Sales Person / Assigned Staff",
                  showCancelButton: true,
                });
              }}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
            >
              <Pencil size={11} />
              <span>Edit</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-8 items-center justify-center rounded-md border border-slate-300 text-[10px] font-bold text-slate-700 bg-slate-50">
                AB
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {salesPerson || "Sales Person"}
              </div>
            </div>
          </div>
        </div>

        <div>
        </div>

       
        {/* 7. CHARGES & DISCOUNT SECTION                                  */}
       
        <div>
          <div className="mb-1.5 px-0.5">
            <span className="text-xs font-semibold text-slate-600">Charges & discount</span>
          </div>

          <div className="space-y-2">
            {extraCharges.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs space-y-2">
                {extraCharges.map((ch, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{ch.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        + ₹{Number(ch.amount).toLocaleString("en-IN")}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCharge(i)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowChargesModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50 active:scale-95"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Other charges & discount</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 8. MORE SECTION                                                */}
        {/* ============================================================== */}
        <div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 9. FIXED STICKY BOTTOM ACTION BAR                              */}
      {/* Total Amount, Big Blue "Update >" Button                       */}
      {/* ============================================================== */}
      <div className="fixed inset-x-0 bottom-0 max-md:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-40 border-t border-slate-200/90 bg-white/95 px-4 pt-2.5 pb-2.5 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Total Amount</div>
            <div className="text-2xl font-black tracking-tight text-slate-900">
              ₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onUpdate}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 active:scale-95 disabled:opacity-60"
          >
            <span>{saving ? "Updating..." : "Update"}</span>
            <ChevronRight size={18} className="stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODALS & BOTTOM SHEETS                                         */}
      {/* ============================================================== */}

      {/* A. Edit Date & Invoice No Modal */}
      {showEditDateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Edit Invoice Info</h3>
              <button
                type="button"
                onClick={() => setShowEditDateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={tempInvoiceNo}
                  onChange={(e) => setTempInvoiceNo(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditDateModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onInvoiceDateChange(tempDate);
                  if (onInvoiceNoChange) onInvoiceNoChange(tempInvoiceNo);
                  setShowEditDateModal(false);
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Change Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Select Customer</h3>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[160px] max-h-[260px]">
              {loadingCustomers ? (
                <div className="py-8 flex justify-center">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                </div>
              ) : customerResults.length > 0 ? (
                customerResults.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => {
                      onPickCustomer(c);
                      setShowCustomerModal(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-blue-50/50 text-left transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.mobile}</div>
                    </div>
                    {c.membershipType && c.membershipType !== "none" && (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {c.membershipType}
                      </span>
                    )}
                  </button>
                ))
              ) : customerSearch.trim() ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No customers found.
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  Type name or mobile to search existing customers.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setShowCustomerModal(false);
                  onOpenCreateCustomer();
                }}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} />
                <span>+ Create New Customer</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. Add Product / Service Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Item</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomItemMode((prev) => !prev)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {customItemMode ? "Catalogue Search" : "+ Custom Item"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {customItemMode ? (
              <div className="space-y-3 text-xs py-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Mini Space Weekdays"
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="299"
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Qty</label>
                    <input
                      type="number"
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                      placeholder="1"
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                  >
                    <option value="General">General</option>
                    <option value="Space">Space</option>
                    <option value="Food">Food</option>
                    <option value="Service">Service</option>
                  </select>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomItemMode(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs"
                  >
                    Add Custom Item
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search product, service, space, food..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[180px] max-h-[300px]">
                  {loadingItems ? (
                    <div className="py-8 flex justify-center">
                      <Loader2 size={24} className="animate-spin text-blue-600" />
                    </div>
                  ) : itemResults.length > 0 ? (
                    itemResults.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => handleSelectCatalogueItem(item)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-blue-50/50 text-left transition"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.sourceType ? item.sourceType.toUpperCase() : "PRODUCT"}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-slate-900 shrink-0">
                          ₹{Number(item.sellingPrice || item.price || 0).toLocaleString("en-IN")}
                        </div>
                      </button>
                    ))
                  ) : itemSearch.trim() ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No matching catalogue items found.
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Search above to quickly add products or services.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* D. Other Charges Modal */}
      {showChargesModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Extra Charge</h3>
              <button
                type="button"
                onClick={() => setShowChargesModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Charge Label</label>
                <input
                  type="text"
                  value={chargeLabel}
                  onChange={(e) => setChargeLabel(e.target.value)}
                  placeholder="e.g. Delivery, Packaging, Cleaning"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  placeholder="50"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowChargesModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCharge}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs"
              >
                Add Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. Simple Change Address/Bank/Terms Modals */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Change Dispatch Address</h3>
            <textarea
              rows={3}
              value={dispatchAddress}
              onChange={(e) => setDispatchAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showShippingModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Select Shipping Address</h3>
            <textarea
              rows={3}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Enter shipping address..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowShippingModal(false)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Change Bank Details</h3>
            <input
              type="text"
              value={activeBank}
              onChange={(e) => setActiveBank(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Change Terms</h3>
            <textarea
              rows={3}
              value={activeTerms}
              onChange={(e) => setActiveTerms(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Change Signatory</h3>
            <input
              type="text"
              value={activeSignatory}
              onChange={(e) => setActiveSignatory(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
