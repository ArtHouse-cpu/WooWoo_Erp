import {
  Printer,
  X,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet as WalletIcon,
  User,
  FileText,
  Split,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import Swal from "sweetalert2";
import {
  handleCreateInvoice,
  handleGetCustomers,
  handleGetWallets,
  handleGetWalletById,
  handleValidateCoupon,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { printThermalReceipt } from "@/utils/printUtils";

type CheckoutItem = {
  id?: number;
  name: string;
  qty: number;
  price: number;
  discount?: number;
  image?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  grandTotal: number;
  items: CheckoutItem[];
  onSaved?: () => void;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialMembership?: string;
  onConfirmPayment?: (payload: {
    mode: string;
    paymentStatus: "full" | "partial";
    paymentBreakdown: {
      cash: number;
      upi: number;
      card: number;
      wallet: number;
      paidAmount: number;
      dueAmount: number;
      changeAmount: number;
    };
    paidAmount: number;
    dueAmount: number;
    changeAmount: number;
    finalAmount: number;
    customerName: string;
    customerPhone: string;
    notes: string;
    coupon?: {
      code: string;
      discountAmount: number;
    } | null;
  }) => Promise<void>;
};

const PAYMENT_METHOD_OPTIONS: {
  value: string;
  label: string;
  Icon: typeof Banknote;
}[] = [
  { value: "Cash", label: "Cash", Icon: Banknote },
  { value: "Card", label: "Card", Icon: CreditCard },
  { value: "UPI", label: "UPI", Icon: Smartphone },
  { value: "Wallet", label: "Wallet", Icon: WalletIcon },
];

function formatInr(value: number) {
  return `₹ ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function CheckoutModal({
  open,
  onClose,
  grandTotal,
  items,
  onSaved,
  initialCustomerName = "",
  initialCustomerPhone = "",
  initialMembership = "",
  onConfirmPayment,
}: Props) {
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [cashGiven, setCashGiven] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<"full" | "partial">(
    "full",
  );
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState({
    cash: 0,
    upi: 0,
    card: 0,
    wallet: 0,
  });
  const [summary, setSummary] = useState({
    membershipDiscount: 0,
  });

  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearch.trim(), 300);
  const [customers, setCustomers] = useState<any[]>([]);
  const [walletMap, setWalletMap] = useState<Record<string, number>>({});
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [membership, setMembership] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [instructionNotes, setInstructionNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLabel, setCouponLabel] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const staff = useAppSelector((state) => state.user);

  const setSplitAmount = (
    mode: "cash" | "upi" | "card" | "wallet",
    value: number,
  ) => {
    setSplitPayments((prev) => ({
      ...prev,
      [mode]: Math.max(0, value),
    }));
  };

  useEffect(() => {
    if (open) {
      setCashGiven(grandTotal - summary.membershipDiscount);
      setCustomerName(initialCustomerName);
      setCustomerSearch(initialCustomerPhone);
      setMembership(initialMembership);
      setInstructionNotes("");
      setCouponCode("");
      setCouponDiscount(0);
      setCouponLabel("");
    }
  }, [
    open,
    grandTotal,
    summary.membershipDiscount,
    initialCustomerName,
    initialCustomerPhone,
    initialMembership,
  ]);

  useEffect(() => {
    const payable = Math.max(0, grandTotal - summary.membershipDiscount);

    if (paymentStatus === "full") {
      if (isMultiMode) {
        setSplitPayments({ cash: payable, upi: 0, card: 0, wallet: 0 });
      } else {
        setCashGiven(payable);
      }
    }
  }, [paymentStatus, isMultiMode, grandTotal, summary.membershipDiscount]);

  useEffect(() => {
    const term = debouncedCustomerSearch;
    if (!term) {
      setCustomers([]);
      setWalletMap({});
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        setLoadingCustomers(true);
        const [customerResponse, walletResponse] = await Promise.allSettled([
          handleGetCustomers(term, controller.signal),
          handleGetWallets({ search: term }, controller.signal),
        ]);
        

        const customerItems =
          customerResponse.status === "fulfilled" &&
          Array.isArray(customerResponse.value?.customers)
            ? customerResponse.value.customers
            : [];
        const walletItems =
          walletResponse.status === "fulfilled"
            ? Array.isArray(walletResponse.value?.wallets)
              ? walletResponse.value.wallets
              : Array.isArray(walletResponse.value?.data)
                ? walletResponse.value.data
                : Array.isArray(walletResponse.value)
                  ? walletResponse.value
                  : []
            : [];

        const nextWalletMap = walletItems.reduce(
          (acc: Record<string, number>, wallet: any) => {
            const amountCandidates = [
              wallet?.walletAmount,
              wallet?.balance,
              wallet?.currentBalance,
              wallet?.availableBalance,
              wallet?.customer?.walletAmount,
            ];
            const amount =
              amountCandidates.find((value) => Number.isFinite(Number(value))) ?? 0;
            const keys = [
              wallet?.customerId,
              wallet?.customer?._id,
              wallet?.customer?.id,
              wallet?.customerPhone,
              wallet?.customer?.mobile,
            ]
              .map((value) => String(value ?? "").trim())
              .filter(Boolean);
            keys.forEach((key) => {
              acc[key] = Number(amount);
            });
            return acc;
          },
          {},
        );

        setWalletMap(nextWalletMap);
        setCustomers(
          customerItems.map((customer: any) => ({
            ...customer,
            walletAmount:
              nextWalletMap[String(customer?._id ?? "").trim()] ??
              nextWalletMap[String(customer?.mobile ?? "").trim()] ??
              Number(customer?.walletAmount ?? customer?.closingBalance ?? 0),
          })),
        );
      } catch {
        setCustomers([]);
        setWalletMap({});
      } finally {
        setLoadingCustomers(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedCustomerSearch]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: any) => {
    const nextWalletBalance =
      walletMap[String(customer?._id ?? "").trim()] ??
      walletMap[String(customer?.mobile ?? "").trim()] ??
      Number(customer?.walletAmount ?? customer?.closingBalance ?? 0);

    setSelectedCustomer(customer);
    setCustomerSearch(customer.mobile || "");
    setCustomerName(customer.name || "");
    setMembership(customer.membershipType || "");
    setWalletBalance(nextWalletBalance);
    setShowDropdown(false);

    const customerId = String(customer?._id ?? "").trim();
    if (customerId) {
      const controller = new AbortController();
      void (async () => {
        try {
          const response = await handleGetWalletById(customerId, controller.signal);
          const wallet = response?.wallet ?? response?.data ?? response ?? null;
          const amount = Number(
            wallet?.walletAmount ??
              wallet?.balance ??
              wallet?.currentBalance ??
              wallet?.availableBalance ??
              nextWalletBalance,
          );
          if (Number.isFinite(amount)) setWalletBalance(amount);
        } catch {
          setWalletBalance(nextWalletBalance);
        }
      })();
    }

    setSummary({
      membershipDiscount: Number(customer.membershipDiscount || 0),
    });
  };

  const totalQty = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.qty || 0), 0),
    [items],
  );

  const finalAmount = Math.max(0, grandTotal - summary.membershipDiscount);
  const finalPayable = Math.max(0, finalAmount - couponDiscount);
  const isPartialPayment = paymentStatus === "partial";
  const totalPaid = isMultiMode
    ? splitPayments.cash +
      splitPayments.upi +
      splitPayments.card +
      splitPayments.wallet
    : cashGiven;
  const change = Math.max(0, totalPaid - finalPayable);
  const dueAmount = Math.max(0, finalPayable - totalPaid);
  const remainingForFull = Math.max(0, finalPayable - totalPaid);

  const paymentBreakdown = useMemo(() => {
    if (isMultiMode) {
      return [
        { label: "Cash", amount: splitPayments.cash },
        { label: "UPI", amount: splitPayments.upi },
        { label: "Card", amount: splitPayments.card },
        { label: "Wallet", amount: splitPayments.wallet },
      ].filter((entry) => entry.amount > 0);
    }

    if (cashGiven <= 0) return [];
    return [{ label: paymentMode, amount: cashGiven }];
  }, [isMultiMode, splitPayments, paymentMode, cashGiven]);

  const membershipTone =
    membership === "premium"
      ? "border-purple-200 bg-purple-50 text-purple-800"
      : membership === "pro"
        ? "border-blue-200 bg-blue-50 text-blue-800"
        : membership === "special"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : membership === "junior"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-gray-200 bg-gray-100 text-gray-700";

  const inputBaseClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none ring-violet-500/0 transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/25";

  const handleSaveAndPrint = async () => {
    if (!customerName.trim()) {
      Swal.fire("Customer required", "Please enter customer name.", "warning");
      return;
    }
    if (!customerSearch.trim()) {
      Swal.fire("Phone required", "Please enter customer mobile number.", "warning");
      return;
    }
    if (!items.length) {
      Swal.fire("No items", "Please add at least one item.", "warning");
      return;
    }
    if (!selectedCustomer && (paymentMode === "Wallet" || splitPayments.wallet > 0)) {
      Swal.fire(
        "Customer required",
        "Select a customer before using wallet payment.",
        "warning",
      );
      return;
    }
    if (!isMultiMode && paymentMode === "Wallet" && cashGiven > walletBalance) {
      Swal.fire(
        "Wallet amount exceeded",
        "Wallet payment cannot be greater than available wallet amount.",
        "warning",
      );
      return;
    }
    if (isMultiMode && splitPayments.wallet > walletBalance) {
      Swal.fire(
        "Wallet amount exceeded",
        "Split wallet amount cannot be greater than available wallet amount.",
        "warning",
      );
      return;
    }
    if (paymentStatus === "full" && dueAmount > 0) {
      Swal.fire(
        "Payment incomplete",
        "For fully paid bill, due amount must be 0.",
        "warning",
      );
      return;
    }

    if (couponCode.trim() && couponDiscount <= 0) {
      Swal.fire("Invalid coupon", "Apply a valid coupon before checkout.", "warning");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const normalizedMode = isMultiMode ? "MULTI" : paymentMode.toUpperCase();
    const paymentPayload = {
      mode: normalizedMode,
      paymentStatus,
      paymentBreakdown: {
        cash: isMultiMode ? splitPayments.cash : paymentMode === "Cash" ? cashGiven : 0,
        upi: isMultiMode ? splitPayments.upi : paymentMode === "UPI" ? cashGiven : 0,
        card: isMultiMode ? splitPayments.card : paymentMode === "Card" ? cashGiven : 0,
        wallet:
          isMultiMode ? splitPayments.wallet : paymentMode === "Wallet" ? cashGiven : 0,
        paidAmount: totalPaid,
        dueAmount,
        changeAmount: change,
      },
      paidAmount: totalPaid,
      dueAmount,
      changeAmount: change,
      finalAmount: finalPayable,
      coupon: couponCode.trim()
        ? {
            code: couponCode.trim().toUpperCase(),
            discountAmount: couponDiscount,
          }
        : null,
      customerName: customerName.trim(),
      customerPhone: customerSearch.trim(),
      notes: instructionNotes.trim(),
    };
    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerSearch.trim(),
      invoiceDate: today,
      dueDate: today,
      salesPersonName: staff.m_staff_name ?? "POS Sales",
      notes: instructionNotes.trim(),
      items: items.map((item) => ({
        productName: item.name,
        qty: Number(item.qty),
        unitPrice: Number(item.price),
        discount: Number(item.discount ?? 0),
        image: item.image || "",
      })),
      subTotal: items.reduce(
        (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
        0,
      ),
      discountTotal: items.reduce((sum, item) => sum + Number(item.discount || 0), 0),
      grandTotal: finalPayable,
      coupon: couponCode.trim()
        ? {
            code: couponCode.trim().toUpperCase(),
            discountAmount: couponDiscount,
          }
        : null,
      status: "final" as const,
      mode: paymentPayload.mode,
      paymentStatus: paymentPayload.paymentStatus,
      paymentBreakdown: paymentPayload.paymentBreakdown,
      createdBy: {
        m_staff_id: staff.m_staff_id,
        m_staff_name: staff.m_staff_name,
        m_staff_email: staff.m_staff_email,
      },
    };

    try {
      setSaving(true);
      if (onConfirmPayment) {
        await onConfirmPayment(paymentPayload);
        return;
      }
      const response = await handleCreateInvoice(payload);
      const invoiceCode = response?.invoice?.invoiceCode ?? "N/A";

      printThermalReceipt({
        invoiceNo: invoiceCode,
        customerName: customerName,
        customerPhone: customerSearch,
        items: items.map((it) => ({
          name: it.name,
          qty: Number(it.qty),
          price: Number(it.price),
          discount: Number(it.discount ?? 0),
        })),
        totalMRP: items.reduce(
          (sum, it) => sum + Number(it.qty) * Number(it.price),
          0
        ),
        discountTotal:
          items.reduce((sum, it) => sum + Number(it.discount ?? 0), 0) +
          summary.membershipDiscount +
          couponDiscount,
        finalAmount: finalPayable,
        totalDue: dueAmount,
        totalQty: totalQty,
      });

      await Swal.fire(
        "Saved",
        `Invoice ${invoiceCode} saved successfully.`,
        "success",
      );
      onSaved?.();
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save invoice. Try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-[2px] sm:p-4"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 bg-gradient-to-br from-slate-50 to-white px-5 py-4 sm:px-6">
          <div>
            <h2
              id="checkout-title"
              className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl"
            >
              Checkout
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {items.length} line items · {totalQty} units
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close checkout"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="flex max-h-[min(40vh,320px)] flex-col border-b border-gray-100 bg-slate-50/70 lg:max-h-none lg:w-[min(100%,380px)] lg:shrink-0 lg:border-b-0 lg:border-r lg:border-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-100/90 px-4 py-3">
              <FileText className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Order summary
              </span>
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-medium capitalize text-gray-600 ring-1 ring-gray-200/80">
                {paymentStatus === "full" ? "Fully paid" : "Partial"}
                {isMultiMode ? " · Split" : ""}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm tabular-nums">
              <ul className="space-y-2.5">
                {items.map((item, i) => {
                  const lineTotal =
                    Number(item.qty || 0) * Number(item.price || 0) -
                    Number(item.discount || 0);

                  return (
                    <li
                      key={item.id ?? i}
                      className="flex justify-between gap-3 border-b border-gray-200/70 pb-2.5 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {Number(item.qty)} × {formatInr(Number(item.price || 0))}
                        </div>
                      </div>
                      <div className="shrink-0 font-medium text-gray-800">
                        {formatInr(lineTotal)}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 space-y-2 border-t border-gray-200/90 pt-4 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Lines / qty</span>
                  <span className="font-medium text-gray-800">
                    {items.length} / {totalQty}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Bill total</span>
                  <span className="font-medium text-gray-800">{formatInr(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-sky-700">
                  <span>Membership discount</span>
                  <span className="font-medium">
                    − {formatInr(summary.membershipDiscount)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal before coupon</span>
                  <span className="font-medium text-gray-900">{formatInr(finalAmount)}</span>
                </div>
                {couponDiscount > 0 ? (
                  <div className="flex justify-between text-violet-700">
                    <span>Coupon discount</span>
                    <span className="font-medium">− {formatInr(couponDiscount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-dashed border-gray-200 pt-3 text-base font-semibold text-gray-900">
                  <span>Total payable</span>
                  <span>{formatInr(finalPayable)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total paid</span>
                  <span className="font-medium text-gray-900">{formatInr(totalPaid)}</span>
                </div>
                <div className="rounded-xl border border-dashed border-gray-300 bg-white/90 p-2.5">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Payment breakdown
                  </div>
                  {paymentBreakdown.length > 0 ? (
                    paymentBreakdown.map((entry) => (
                      <div
                        key={entry.label}
                        className="flex justify-between text-[11px] text-gray-700"
                      >
                        <span>{entry.label}</span>
                        <span className="tabular-nums">{formatInr(entry.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-gray-500">No payment entered yet.</div>
                  )}
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Due</span>
                  <span className="font-semibold">{formatInr(dueAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900">
                  <span>Change</span>
                  <span className="text-emerald-600 tabular-nums">{formatInr(change)}</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 text-sm sm:px-6">
            <div className="space-y-6">
              <section className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <User className="h-3.5 w-3.5" aria-hidden />
                  Customer
                </div>

                <div className="grid gap-4 sm:grid-cols-12 sm:items-end">
                  <div className="relative sm:col-span-5" ref={searchRef}>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Mobile search
                    </label>
                    <input
                      placeholder="Search or enter mobile..."
                      className={inputBaseClass}
                      autoComplete="tel"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowDropdown(true);
                        if (selectedCustomer) {
                          setSelectedCustomer(null);
                          setSummary({ membershipDiscount: 0 });
                          setWalletBalance(0);
                          setSplitPayments({ cash: 0, upi: 0, card: 0, wallet: 0 });
                        }
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />

                    {showDropdown && (loadingCustomers || customers.length > 0) && (
                        <div className="absolute z-20 mt-1.5 max-h-48 w-full overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-lg ring-1 ring-black/5">
                          {loadingCustomers ? (
                            <div className="flex items-center gap-2 px-3 py-3 text-gray-500">
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                              <span className="text-xs">Searching…</span>
                            </div>
                          ) : (
                            customers.map((c) => (
                              <button
                                key={c._id}
                                type="button"
                                onClick={() => handleSelectCustomer(c)}
                                className="flex w-full flex-col items-start border-b border-gray-50 px-3 py-2 text-left transition-colors hover:bg-violet-50 last:border-0"
                              >
                                <span className="text-sm font-medium text-gray-900">{c.name}</span>
                                <span className="text-xs text-gray-500">
                                  {c.mobile} · Wallet {formatInr(Number(c.walletAmount ?? 0))}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                  </div>

                  <div className="sm:col-span-4">
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Name on invoice
                    </label>
                    <input
                      placeholder="Customer name"
                      className={inputBaseClass}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="flex sm:col-span-3 sm:justify-end">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide ${membershipTone}`}
                    >
                      <span className="text-[10px] font-normal opacity-80">Member</span>
                      <span className="uppercase">{membership || "general"}</span>
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-white p-4 shadow-sm">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-800">
                  Coupon
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <input
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      if (!e.target.value.trim()) {
                        setCouponDiscount(0);
                        setCouponLabel("");
                      }
                    }}
                    placeholder="e.g. SWIGGY50"
                    className={`${inputBaseClass} sm:flex-1 sm:min-w-0 border-violet-200/70`}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const code = couponCode.trim();
                      if (!code) {
                        Swal.fire("Coupon required", "Enter coupon code first.", "warning");
                        return;
                      }
                      try {
                        const response = await handleValidateCoupon({
                          code,
                          orderAmount: finalAmount,
                          customerPhone: customerSearch.trim() || undefined,
                        });
                        const discount = Number(response?.discountAmount ?? 0);
                        setCouponDiscount(discount);
                        setCouponCode(code.toUpperCase());
                        setCouponLabel(String(response?.coupon?.title ?? "Coupon Applied"));
                        Swal.fire("Coupon applied", `Discount ₹${discount}`, "success");
                      } catch (error: any) {
                        setCouponDiscount(0);
                        setCouponLabel("");
                        Swal.fire(
                          "Coupon invalid",
                          error?.response?.data?.message ?? "Coupon is not applicable.",
                          "error",
                        );
                      }
                    }}
                    className="shrink-0 rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.99]"
                  >
                    Apply
                  </button>
                </div>
                {couponDiscount > 0 ? (
                  <p className="mt-3 text-xs text-violet-800">
                    <span className="font-medium">{couponLabel || "Coupon"}</span> · −{" "}
                    {formatInr(couponDiscount)}
                  </p>
                ) : null}
              </section>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-xs text-amber-950 shadow-sm">
                <div className="flex items-center gap-2 font-medium">
                  <WalletIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  Wallet balance
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatInr(walletBalance)}</span>
              </div>

              <section className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Payment
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className="inline-flex rounded-lg border border-gray-200 bg-gray-50/80 p-0.5"
                      role="group"
                      aria-label="Payment settlement"
                    >
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("full")}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                          paymentStatus === "full"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Fully paid
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("partial")}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                          paymentStatus === "partial"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Partial
                      </button>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={isMultiMode}
                        onChange={(e) => setIsMultiMode(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                        <Split className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                        Split payment
                      </span>
                    </label>
                  </div>
                </div>

                {!isMultiMode ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PAYMENT_METHOD_OPTIONS.map(({ value, label, Icon }) => {
                        const active = paymentMode === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPaymentMode(value)}
                            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition ${
                              active
                                ? "border-violet-500 bg-violet-50 text-violet-900 ring-1 ring-violet-500/30"
                                : "border-gray-200 bg-gray-50/50 text-gray-600 hover:border-gray-300 hover:bg-white"
                            }`}
                          >
                            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                            <span className="text-[11px] font-semibold">{label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {isPartialPayment ? (
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                          Amount received
                        </label>
                        <input
                          type="number"
                          value={cashGiven}
                          onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                          className={inputBaseClass}
                          placeholder="Enter paid amount"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                        <span className="font-medium">{paymentMode}</span> covers the full bill:{" "}
                        <span className="tabular-nums font-semibold">{formatInr(finalPayable)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 rounded-xl border border-sky-200/70 bg-sky-50/40 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                          Cash
                        </label>
                        <input
                          type="number"
                          value={splitPayments.cash}
                          onChange={(e) =>
                            setSplitAmount("cash", Number(e.target.value) || 0)
                          }
                          className={inputBaseClass}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                          UPI
                        </label>
                        <input
                          type="number"
                          value={splitPayments.upi}
                          onChange={(e) =>
                            setSplitAmount("upi", Number(e.target.value) || 0)
                          }
                          className={inputBaseClass}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                          Wallet
                        </label>
                        <input
                          type="number"
                          value={splitPayments.wallet}
                          onChange={(e) =>
                            setSplitAmount("wallet", Number(e.target.value) || 0)
                          }
                          className={inputBaseClass}
                          placeholder="0"
                        />
                        <p className="mt-1 text-[11px] text-gray-500">
                          Max {formatInr(walletBalance)}
                        </p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                          Card
                        </label>
                        <input
                          type="number"
                          value={splitPayments.card}
                          onChange={(e) =>
                            setSplitAmount("card", Number(e.target.value) || 0)
                          }
                          className={inputBaseClass}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        ["cash", "Cash"] as const,
                        ["upi", "UPI"] as const,
                        ["wallet", "Wallet"] as const,
                        ["card", "Card"] as const,
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (key === "wallet") {
                              setSplitAmount(
                                "wallet",
                                Math.min(
                                  walletBalance,
                                  splitPayments.wallet + remainingForFull,
                                ),
                              );
                            } else if (key === "cash") {
                              setSplitAmount(
                                "cash",
                                splitPayments.cash + remainingForFull,
                              );
                            } else if (key === "upi") {
                              setSplitAmount(
                                "upi",
                                splitPayments.upi + remainingForFull,
                              );
                            } else {
                              setSplitAmount(
                                "card",
                                splitPayments.card + remainingForFull,
                              );
                            }
                          }}
                          className="rounded-lg border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-white"
                        >
                          Add remainder to {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isMultiMode ? (
                  <div className="mt-4 rounded-xl border border-sky-200/80 bg-sky-50/60 px-3 py-2.5 text-xs text-sky-950">
                    <div className="flex justify-between">
                      <span className="font-medium">Split paid</span>
                      <span className="tabular-nums font-semibold">
                        {formatInr(totalPaid)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-sky-800/90">
                      <span>Remaining</span>
                      <span className="tabular-nums">{formatInr(remainingForFull)}</span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span>Wallet in split</span>
                      <span className="tabular-nums">{formatInr(splitPayments.wallet)}</span>
                    </div>
                    {paymentStatus === "full" && dueAmount > 0 ? (
                      <div className="mt-2 rounded-lg border border-amber-300/80 bg-amber-50 px-2 py-1.5 text-amber-800">
                        For a fully paid bill, remaining due must be zero.
                      </div>
                    ) : null}
                    {splitPayments.wallet > walletBalance ? (
                      <div className="mt-2 rounded-lg border border-amber-300/80 bg-amber-50 px-2 py-1.5 text-amber-800">
                        Wallet amount cannot exceed the available balance.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Invoice notes
                </label>
                <textarea
                  placeholder="Special instructions — visible on the invoice"
                  rows={4}
                  className={`${inputBaseClass} min-h-[88px] resize-none`}
                  value={instructionNotes}
                  onChange={(e) => setInstructionNotes(e.target.value)}
                />
              </section>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-gray-50/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button
            type="button"
            className="rounded-lg border border-transparent bg-gray-200/90 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-300/90 sm:order-1"
          >
            Save & New
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSaveAndPrint();
            }}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Printer className="h-4 w-4" aria-hidden />
            )}
            {saving ? "Saving…" : "Save & print"}
          </button>
        </footer>
      </div>
    </div>
  );
}
