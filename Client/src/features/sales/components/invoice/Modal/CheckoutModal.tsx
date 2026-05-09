import { Printer, X } from "lucide-react";
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Checkout</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
            aria-label="Close checkout"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6 text-sm">
          <div className="grid grid-cols-12 gap-3 items-end">
            {/* Customer Search */}
            <div className="col-span-5 relative" ref={searchRef}>
              <label className="text-xs text-gray-500 mb-1 block">
                Customer
              </label>

              <input
                placeholder="Search or enter mobile..."
                className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
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

              {/* Dropdown */}
              {showDropdown && (loadingCustomers || customers.length > 0) && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-lg border bg-white shadow-lg">
                  {loadingCustomers ? (
                    <div className="p-3 text-gray-500 text-sm">
                      Searching...
                    </div>
                  ) : (
                    customers.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="flex w-full flex-col items-start border-b px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="text-sm font-medium text-gray-800">
                          {c.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {c.mobile} • Wallet ₹{" "}
                          {Number(c.walletAmount ?? 0).toLocaleString("en-IN")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Customer Name */}
            <div className="col-span-4">
              <label className="text-xs text-gray-500 mb-1 block">Name</label>

              <input
                placeholder="Customer name"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Membership (Small + Premium Look) */}
            <div className="col-span-3 flex items-end">
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-full tracking-wide flex items-center gap-1
    ${
      membership === "premium"
        ? "bg-purple-100 text-purple-700"
        : membership === "pro"
          ? "bg-blue-100 text-blue-700"
          : membership === "special"
            ? "bg-green-100 text-green-700"
            : membership === "junior"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-gray-100 text-gray-700"
    }`}
              >
                <span className="text-[10px] opacity-70">Membership</span>
                <span className="uppercase">{membership || "GENERAL"}</span>
              </span>
            </div>
          </div>

          <div>
            <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3">
              <label className="mb-1 block text-xs font-semibold text-violet-700">
                Coupon Code
              </label>
              <div className="flex items-center gap-2">
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
                  className="flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
                >
                  Apply
                </button>
              </div>
              {couponDiscount > 0 && (
                <div className="mt-2 text-xs text-violet-700">
                  {couponLabel || "Coupon"} applied: - ₹{couponDiscount.toLocaleString("en-IN")}
                </div>
              )}
            </div>
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <div className="flex items-center justify-between">
                <span className="font-medium">Available Wallet Balance</span>
                <span className="font-semibold">
                  ₹ {walletBalance.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <label className="font-medium text-gray-700">Payment Details</label>

            <div className="mt-2 grid grid-cols-1 gap-3 rounded-xl border bg-gray-50 p-3 md:grid-cols-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={paymentStatus === "full"}
                  onChange={() => setPaymentStatus("full")}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Fully Paid
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={paymentStatus === "partial"}
                  onChange={() => setPaymentStatus("partial")}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Partially Paid
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={isMultiMode}
                  onChange={(e) => setIsMultiMode(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Multi-Mode Payment
                </span>
              </label>
            </div>

            {!isMultiMode ? (
              <div className="mt-3 flex items-center gap-3">
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-40 rounded-lg border px-3 py-2"
                >
                  <option>Cash</option>
                  <option>Card</option>
                  <option>UPI</option>
                  <option>Wallet</option>
                </select>

                {isPartialPayment ? (
                  <input
                    type="number"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                    className="flex-1 rounded-lg border px-3 py-2"
                    placeholder="Enter paid amount"
                  />
                ) : (
                  <div className="flex-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    Fully paid by {paymentMode}: ₹{" "}
                    {finalPayable.toLocaleString("en-IN")}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Cash Amount
                    </label>
                    <input
                      type="number"
                      value={splitPayments.cash}
                      onChange={(e) =>
                        setSplitAmount("cash", Number(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border bg-white px-3 py-2"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      UPI Amount
                    </label>
                    <input
                      type="number"
                      value={splitPayments.upi}
                      onChange={(e) =>
                        setSplitAmount("upi", Number(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border bg-white px-3 py-2"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Wallet Amount
                    </label>
                    <input
                      type="number"
                      value={splitPayments.wallet}
                      onChange={(e) =>
                        setSplitAmount("wallet", Number(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border bg-white px-3 py-2"
                      placeholder="0"
                    />
                    <div className="mt-1 text-[11px] text-slate-500">
                      Max usable: ₹ {walletBalance.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Card Amount
                    </label>
                    <input
                      type="number"
                      value={splitPayments.card}
                      onChange={(e) =>
                        setSplitAmount("card", Number(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border bg-white px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setSplitAmount(
                        "cash",
                        splitPayments.cash + remainingForFull,
                      )
                    }
                    className="rounded-md border bg-white px-2.5 py-1.5 text-gray-700 hover:bg-gray-100"
                  >
                    Add Remaining to Cash
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSplitAmount(
                        "upi",
                        splitPayments.upi + remainingForFull,
                      )
                    }
                    className="rounded-md border bg-white px-2.5 py-1.5 text-gray-700 hover:bg-gray-100"
                  >
                    Add Remaining to UPI
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSplitAmount(
                        "wallet",
                        Math.min(walletBalance, splitPayments.wallet + remainingForFull),
                      )
                    }
                    className="rounded-md border bg-white px-2.5 py-1.5 text-gray-700 hover:bg-gray-100"
                  >
                    Add Remaining to Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSplitAmount(
                        "card",
                        splitPayments.card + remainingForFull,
                      )
                    }
                    className="rounded-md border bg-white px-2.5 py-1.5 text-gray-700 hover:bg-gray-100"
                  >
                    Add Remaining to Card
                  </button>
                </div>
              </div>
            )}

            {isMultiMode && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Split Paid</span>
                  <span>₹ {totalPaid.toLocaleString("en-IN")}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-medium">Remaining</span>
                  <span>₹ {remainingForFull.toLocaleString("en-IN")}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-medium">Wallet Used</span>
                  <span>₹ {splitPayments.wallet.toLocaleString("en-IN")}</span>
                </div>
                {paymentStatus === "full" && dueAmount > 0 && (
                  <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">
                    For Fully Paid bill, remaining must be 0.
                  </div>
                )}
                {splitPayments.wallet > walletBalance && (
                  <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">
                    Wallet amount cannot exceed available balance.
                  </div>
                )}
              </div>
            )}
            {paymentStatus === "full" && !isMultiMode && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                Full payment received via {paymentMode}.
              </div>
            )}
          </div>
          <div>
            <div className="mt-1 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span>Payment Status</span>
                <span className="font-semibold capitalize">
                  {paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border bg-gray-50 p-4 text-xs font-mono">
            {items.map((item, i) => {
              const lineTotal =
                Number(item.qty || 0) * Number(item.price || 0) -
                Number(item.discount || 0);

              return (
                <div key={item.id ?? i} className="flex justify-between">
                  <div>
                    <div>{item.name}</div>
                    <div className="text-gray-500">
                      {item.qty} x {item.price}
                    </div>
                  </div>
                  <div>₹ {lineTotal}</div>
                </div>
              );
            })}

            <hr />
            <div className="flex justify-between">
              <span>Items / Qty</span>
              <span>
                {items.length} / {totalQty}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal Amount</span>
              <span>₹ {grandTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>Membership Discount</span>
              <span>
                - ₹ {summary.membershipDiscount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
              <span>Total Payable</span>
              <span>₹ {finalPayable.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-violet-600">
              <span>Coupon Discount</span>
              <span>- ₹ {couponDiscount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total Paid</span>
              <span>₹ {totalPaid.toLocaleString("en-IN")}</span>
            </div>
            <div className="rounded-lg border border-dashed border-gray-300 bg-white/80 p-2">
              <div className="mb-1 text-[11px] font-semibold text-gray-600">
                Payment Breakdown
              </div>
              {paymentBreakdown.length > 0 ? (
                paymentBreakdown.map((entry) => (
                  <div
                    key={entry.label}
                    className="flex justify-between text-[11px] text-gray-700"
                  >
                    <span>{entry.label}</span>
                    <span>₹ {entry.amount.toLocaleString("en-IN")}</span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-gray-500">
                  No payment entered yet.
                </div>
              )}
            </div>
            <div className="flex justify-between text-orange-600">
              <span>Due Amount</span>
              <span>₹ {dueAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Change</span>
              <span className={change < 0 ? "text-red-600" : "text-green-600"}>
                ₹ {change.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              Instructions / Notes
            </label>

            <textarea
              placeholder="Add any special instructions (e.g. discount note, customer request...)"
              className="rounded-lg border px-3 py-2 min-h-[80px] resize-none 
    focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              value={instructionNotes}
              onChange={(e) => setInstructionNotes(e.target.value)}
            />

            <span className="text-xs text-gray-400">
              This will appear on the invoice
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            type="button"
            className="rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Save & New
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSaveAndPrint();
            }}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
          >
            <Printer size={16} />
            {saving ? "Saving..." : "Save & Print"}
          </button>
        </div>
      </div>
    </div>
  );
}
