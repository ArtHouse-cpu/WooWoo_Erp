import {
  Printer,
  X,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet as WalletIcon,
  User,
  FileText,
  Loader2,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import Swal from "sweetalert2";
import {
  handleCreateInvoice,
  handleGetCustomers,
  handleGetWallets,
  handleGetWalletById,
  handleGetMemberships,
  handleValidateCoupon,
  handleValidateReferralDiscount,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { printThermalReceipt } from "@/utils/printUtils";
import { summarizeMembershipForCart } from "../../../utils/membershipInvoiceUtils";
import { creditWalletCashback } from "../../../utils/walletCashback";

type CheckoutItem = {
  id?: number;
  name: string;
  qty: number;
  price: number;
  discount?: number;
  cashback?: number;
  image?: string;
  category?: string;
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
  initialMembershipPlanId?: string | null;
  initialCustomerId?: string | null;
  initialMembershipDiscount?: number;
  initialCashbackTotal?: number;
  extraCharges?: Array<{ label: string; amount: number }>;
  membershipPlans?: MembershipPlanPayload[];
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
    referral?: {
      code: string;
      discountAmount: number;
      inviterName?: string;
      label?: string;
    } | null;
    cashbackTotal: number;
    membershipDiscount: number;
    extraCharges: Array<{ label: string; amount: number }>;
    customerId?: string | null;
  }) => Promise<void>;
};

const DEFAULT_MEMBERSHIP_PLANS: MembershipPlanPayload[] = [];

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

type SummaryTone = "default" | "muted" | "discount" | "cashback" | "total" | "due" | "change";

function SummaryLine({
  label,
  value,
  tone = "default",
  className = "",
}: {
  label: string;
  value: string;
  tone?: SummaryTone;
  className?: string;
}) {
  const valueCls: Record<SummaryTone, string> = {
    default: "text-slate-800",
    muted: "text-slate-400",
    discount: "text-indigo-600 font-semibold",
    cashback: "text-emerald-600 font-semibold",
    total: "text-slate-900 font-bold text-base",
    due: "text-amber-600 font-semibold",
    change: "text-emerald-600 font-bold",
  };

  return (
    <div className={`flex items-start justify-between gap-3 text-xs ${className}`}>
      <span className="text-slate-500 font-medium">{label}</span>
      <span className={`shrink-0 whitespace-nowrap text-right tabular-nums ${valueCls[tone]}`}>{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className = "",
  headerAction,
}: {
  title: string;
  icon?: any;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-slate-400" />}
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </h3>
        </div>
        {headerAction}
      </div>
      <div>{children}</div>
    </section>
  );
}

function PaymentModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-colors ${
        active
          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
          : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-white"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-indigo-600" : "text-slate-400"}`} />
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function Badge({ 
  children, 
  variant = "default",
  className = "" 
}: { 
  children: ReactNode; 
  variant?: "default" | "indigo" | "emerald" | "amber" | "rose" | "purple" | "slate";
  className?: string;
}) {
  const variants = {
    default: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    purple: "bg-purple-50 text-purple-700",
    slate: "bg-slate-900 text-white",
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
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
  initialMembershipPlanId = null,
  initialCustomerId = null,
  initialMembershipDiscount = 0,
  initialCashbackTotal = 0,
  extraCharges = [],
  membershipPlans = DEFAULT_MEMBERSHIP_PLANS,
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
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [referralLabel, setReferralLabel] = useState("Referral Discount");
  const [referralCodeApplied, setReferralCodeApplied] = useState("");
  const [referralInviterName, setReferralInviterName] = useState("");
  const [referralSegments, setReferralSegments] = useState<
    Array<{
      category: string;
      label: string;
      commissionType: string;
      commissionValue: number;
      lineAmount: number;
      discountAmount: number;
    }>
  >([]);
  const [loadingReferral, setLoadingReferral] = useState(false);

  const [resolvedMembershipPlans, setResolvedMembershipPlans] = useState<
    MembershipPlanPayload[]
  >(membershipPlans);

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
    setResolvedMembershipPlans(membershipPlans ?? []);
  }, [membershipPlans]);

  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    void handleGetMemberships({ status: "Active" }, ac.signal)
      .then((res) => {
        const list = res?.memberships;
        if (Array.isArray(list) && list.length > 0) {
          setResolvedMembershipPlans(list as MembershipPlanPayload[]);
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, [open]);

  useEffect(() => {
    if (open) {
      setCustomerName(initialCustomerName);
      setCustomerSearch(initialCustomerPhone);
      setMembership(initialMembership);
      setSelectedCustomer(
        initialCustomerId
          ? {
              _id: initialCustomerId,
              name: initialCustomerName,
              mobile: initialCustomerPhone,
              membershipType: initialMembership,
              membershipPlanId: initialMembershipPlanId,
            }
          : null,
      );
      setInstructionNotes("");
      setCouponCode("");
      setCouponDiscount(0);
      setCouponLabel("");
      setReferralCodeInput("");
      setReferralDiscount(0);
      setReferralLabel("Referral Discount");
      setReferralCodeApplied("");
      setReferralInviterName("");
    }
  }, [
    open,
    initialCustomerName,
    initialCustomerPhone,
    initialMembership,
    initialCustomerId,
    initialMembershipPlanId,
  ]);

  const clearReferralDiscount = () => {
    setReferralDiscount(0);
    setReferralLabel("Referral Discount");
    setReferralCodeApplied("");
    setReferralInviterName("");
    setReferralSegments([]);
  };

  const buildReferralItems = () =>
    items.map((item) => {
      const qty = Number(item.qty || 0);
      const unitPrice = Number(item.price || 0);
      const lineDiscount = Number(item.discount ?? 0);
      return {
        name: item.name,
        productName: item.name,
        qty,
        unitPrice,
        price: unitPrice,
        discount: lineDiscount,
        lineTotal: Math.max(0, qty * unitPrice - lineDiscount),
        category: item.category || "General",
      };
    });

  const applyReferralDiscount = async (opts?: {
    customer?: any | null;
    referralCode?: string;
  }) => {
    const customer = opts?.customer ?? selectedCustomer;
    const code = String(opts?.referralCode ?? referralCodeInput ?? "").trim();
    const orderAmount = Math.max(0, Number(grandTotal || 0) - Number(couponDiscount || 0));

    if (orderAmount <= 0) {
      clearReferralDiscount();
      return;
    }

    const customerId = String(customer?._id ?? initialCustomerId ?? "").trim();
    const customerPhone = String(
      customer?.mobile ?? customerSearch ?? initialCustomerPhone ?? "",
    ).trim();

    if (!customerId && !customerPhone && !code) {
      clearReferralDiscount();
      return;
    }

    setLoadingReferral(true);
    try {
      const response = await handleValidateReferralDiscount({
        ...(customerId ? { customerId } : {}),
        ...(customerPhone ? { customerPhone } : {}),
        ...(code ? { referralCode: code } : {}),
        orderAmount,
        items: buildReferralItems(),
      });
      const data = response?.data || response;
      if (!data?.discountAmount) {
        clearReferralDiscount();
        return;
      }
      setReferralDiscount(Number(data.discountAmount || 0));
      setReferralLabel(data.label || "Referral Discount");
      setReferralCodeApplied(String(data.referralCode || code || "").toUpperCase());
      setReferralInviterName(String(data.inviterName || ""));
      setReferralSegments(Array.isArray(data.segments) ? data.segments : []);
      if (data.referralCode) {
        setReferralCodeInput(String(data.referralCode).toUpperCase());
      }
    } catch {
      clearReferralDiscount();
    } finally {
      setLoadingReferral(false);
    }
  };

  const summary = useMemo(() => {
    const mType =
      selectedCustomer?.membershipType || initialMembership || membership;
    const mId =
      selectedCustomer?.membershipPlanId ?? initialMembershipPlanId ?? null;
    return summarizeMembershipForCart(
      resolvedMembershipPlans,
      mType,
      mId,
      items.map((item) => ({
        price: Number(item.price || 0),
        qty: Number(item.qty || 0),
        category: item.category,
        discount: Number(item.discount ?? 0),
        cashback: Number(item.cashback ?? 0),
      })),
    );
  }, [
    items,
    selectedCustomer,
    initialMembership,
    initialMembershipPlanId,
    membership,
    resolvedMembershipPlans,
  ]);

  const lineDiscountsTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.discount ?? 0), 0),
    [items],
  );

  const lineCashbackTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.cashback ?? 0), 0),
    [items],
  );

  const displayMembershipDiscount =
    initialMembershipDiscount > 0
      ? initialMembershipDiscount
      : lineDiscountsTotal > 0
        ? lineDiscountsTotal
        : summary.membershipDiscount;

  const displayCashbackTotal =
    initialCashbackTotal > 0
      ? initialCashbackTotal
      : lineCashbackTotal > 0
        ? lineCashbackTotal
        : summary.cashbackTotal;

  const itemsSubtotal = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + Number(item.qty || 0) * Number(item.price || 0),
        0,
      ),
    [items],
  );

  useEffect(() => {
    const payable = Math.max(0, grandTotal - couponDiscount - referralDiscount);

    if (paymentStatus === "full") {
      if (isMultiMode) {
        setSplitPayments({ cash: payable, upi: 0, card: 0, wallet: 0 });
      } else {
        setCashGiven(payable);
      }
    }
  }, [paymentStatus, isMultiMode, grandTotal, couponDiscount, referralDiscount]);

  useEffect(() => {
    if (!open) return;
    if (!initialCustomerId && !initialCustomerPhone && !referralCodeInput) return;
    void applyReferralDiscount({
      customer: initialCustomerId
        ? {
            _id: initialCustomerId,
            name: initialCustomerName,
            mobile: initialCustomerPhone,
          }
        : selectedCustomer,
      referralCode: referralCodeInput || referralCodeApplied,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCustomerId, initialCustomerPhone, grandTotal, couponDiscount, items]);

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
    void applyReferralDiscount({ customer, referralCode: "" });

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
  };

  const totalQty = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.qty || 0), 0),
    [items],
  );

  const finalPayable = Math.max(0, grandTotal - couponDiscount - referralDiscount);
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
      referral:
        referralDiscount > 0 && referralCodeApplied
          ? {
              code: referralCodeApplied,
              discountAmount: referralDiscount,
              inviterName: referralInviterName,
              label: referralLabel,
            }
          : null,
      customerName: customerName.trim(),
      customerPhone: customerSearch.trim(),
      notes: instructionNotes.trim(),
      cashbackTotal: displayCashbackTotal,
      membershipDiscount: displayMembershipDiscount,
      extraCharges: extraCharges,
      customerId:
        selectedCustomer?._id ?? initialCustomerId ?? null,
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
      discountTotal:
        items.reduce((sum, item) => sum + Number(item.discount || 0), 0) +
        couponDiscount +
        referralDiscount,
      extraCharges: extraCharges,
      grandTotal: finalPayable,
      coupon: couponCode.trim()
        ? {
            code: couponCode.trim().toUpperCase(),
            discountAmount: couponDiscount,
          }
        : null,
      referral:
        referralDiscount > 0 && referralCodeApplied
          ? {
              code: referralCodeApplied,
              discountAmount: referralDiscount,
              inviterName: referralInviterName,
              label: referralLabel,
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

      if (displayCashbackTotal > 0) {
        try {
          await creditWalletCashback({
            customerId:
              selectedCustomer?._id ?? initialCustomerId ?? null,
            customerPhone: customerSearch.trim(),
            customerName: customerName.trim(),
            amount: displayCashbackTotal,
            note: `Membership cashback for Invoice #${invoiceCode}`,
            referenceId: invoiceCode,
            createdBy: {
              m_staff_id: staff.m_staff_id,
              m_staff_name: staff.m_staff_name,
              m_staff_email: staff.m_staff_email,
            },
          });
        } catch (e) {
          console.error("Failed to credit cashback to wallet", e);
        }
      }

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
          lineDiscountsTotal + couponDiscount,
        cashbackAmount: displayCashbackTotal,
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2
              id="checkout-title"
              className="text-lg font-bold text-slate-900"
            >
              Checkout
            </h2>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <Badge variant="indigo">{items.length} items</Badge>
              <span className="text-xs font-medium text-slate-400">
                {totalQty} units
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            aria-label="Close checkout"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="flex max-h-[min(40vh,380px)] flex-col border-b border-slate-100 bg-slate-50/30 lg:max-h-none lg:w-[320px] lg:shrink-0 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <FileText className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Order Summary
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <ul className="divide-y divide-slate-100">
                {items.map((item, i) => {
                  const lineTotal =
                    Number(item.qty || 0) * Number(item.price || 0)

                  return (
                    <li key={item.id ?? i} className="py-3 first:pt-0">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {Number(item.qty)} × {formatInr(Number(item.price || 0))}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                          {formatInr(lineTotal)}
                        </p>
                      </div>

                      {/* {Number(item.discount ?? 0) > 0 && (
                        <p className="mt-0.5 text-[11px] font-medium text-indigo-600">
                          Discount: −{formatInr(Number(item.discount ?? 0))}
                        </p>
                      )} */}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                <SummaryLine label="Subtotal" value={formatInr(itemsSubtotal)} />
                {displayMembershipDiscount > 0 && (
                  <SummaryLine 
                    label="Membership Discount" 
                    value={`− ${formatInr(displayMembershipDiscount)}`} 
                    tone="discount" 
                  />
                )}
                {couponDiscount > 0 && (
                  <SummaryLine 
                    label="Coupon Discount" 
                    value={`− ${formatInr(couponDiscount)}`} 
                    className="text-violet-600"
                  />
                )}
                {referralDiscount > 0 && (
                  <SummaryLine
                    label={`${referralLabel}${referralCodeApplied ? ` (${referralCodeApplied})` : ""}`}
                    value={`− ${formatInr(referralDiscount)}`}
                    tone="discount"
                  />
                )}
                {referralSegments.map((segment) => (
                  <SummaryLine
                    key={segment.category}
                    label={`${segment.label} (${segment.commissionType === "fixed" ? `₹${segment.commissionValue}` : `${segment.commissionValue}%`})`}
                    value={`− ${formatInr(segment.discountAmount)}`}
                    className="text-violet-600"
                  />
                ))}
                {extraCharges.map((c, i) => (
                  <SummaryLine 
                    key={i}
                    label={c.label || "Extra Charge"} 
                    value={`+ ${formatInr(Number(c.amount || 0))}`} 
                  />
                ))}
                
                <div className="rounded-xl bg-green-400 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white-400 uppercase tracking-wider">Payable</span>
                    <span className="text-lg font-bold tabular-nums">{formatInr(finalPayable)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <SummaryLine label="Paid" value={formatInr(totalPaid)} tone="total" />
                  <SummaryLine label="Due" value={formatInr(dueAmount)} tone="due" />
                  <SummaryLine label="Change" value={formatInr(change)} tone="change" />
                </div>

                {displayCashbackTotal > 0 && (
                  <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-center">
                    <p className="text-[11px] font-bold text-emerald-700">
                      +{formatInr(displayCashbackTotal)} cashback will be credited
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 [scrollbar-width:thin]">
            <div className="mx-auto max-w-3xl space-y-6">
              <SectionCard title="Customer Information" icon={User}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative" ref={searchRef}>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Mobile Number
                    </label>
                    <input
                      placeholder="Search or enter mobile..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      autoComplete="tel"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowDropdown(true);
                        if (selectedCustomer) {
                          setSelectedCustomer(null);
                          setWalletBalance(0);
                          setSplitPayments({ cash: 0, upi: 0, card: 0, wallet: 0 });
                        }
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />
                    {showDropdown && (loadingCustomers || customers.length > 0) && (
                      <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                        {loadingCustomers ? (
                          <div className="p-4 text-center text-xs text-slate-400">Searching...</div>
                        ) : (
                          customers.map((c) => (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="flex w-full flex-col p-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0"
                            >
                              <span className="text-sm font-semibold">{c.name}</span>
                              <span className="text-xs text-slate-500">
                                {c.mobile}
                                {c.referralCode ? ` · Ref ${c.referralCode}` : ""}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Customer Name
                    </label>
                    <input
                      placeholder="Enter billing name"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-50 pt-4">
                  <Badge variant={membership ? "indigo" : "default"}>
                    {membership || "General Customer"}
                  </Badge>
                  {displayMembershipDiscount > 0 && (
                    <span className="text-[11px] font-medium text-indigo-600">
                      Membership discount applied
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2 text-xs font-semibold text-amber-600">
                    <WalletIcon className="h-4 w-4" />
                    <span>Balance: {formatInr(walletBalance)}</span>
                  </div>
                </div>
              </SectionCard>

              <section className="rounded-xl border border-dashed border-slate-300 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Coupon</h3>
                </div>
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      if (!e.target.value.trim()) {
                        setCouponDiscount(0);
                        setCouponLabel("");
                      }
                    }}
                    placeholder="Enter code"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-indigo-600 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const code = couponCode.trim();
                      if (!code) return;
                      try {
                        const response = await handleValidateCoupon({
                          code,
                          orderAmount: grandTotal,
                          customerPhone: customerSearch.trim() || undefined,
                        });
                        const discount = Number(response?.discountAmount ?? 0);
                        setCouponDiscount(discount);
                        setCouponCode(code.toUpperCase());
                        setCouponLabel(String(response?.coupon?.title ?? "Coupon Applied"));
                        void applyReferralDiscount({
                          customer: selectedCustomer,
                          referralCode: referralCodeInput || referralCodeApplied,
                        });
                        Swal.fire("Success", "Coupon applied", "success");
                      } catch (error: any) {
                        setCouponDiscount(0);
                        setCouponLabel("");
                        Swal.fire("Error", "Invalid coupon", "error");
                      }
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {couponDiscount > 0 && (
                  <p className="mt-2 text-xs font-medium text-indigo-600">
                    {couponLabel}: −{formatInr(couponDiscount)}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-violet-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-500">
                    Referral Discount
                  </h3>
                </div>
                <p className="mb-3 text-[11px] text-slate-500">
                  Discount comes from Affiliate Program → Commission Rules for each cart segment (Store Supplies, Services, etc.).
                </p>
                <div className="flex gap-2">
                  <input
                    value={referralCodeInput}
                    onChange={(e) => {
                      setReferralCodeInput(e.target.value.toUpperCase());
                      if (!e.target.value.trim()) clearReferralDiscount();
                    }}
                    placeholder="Enter referral code (e.g. W7QEK05GO)"
                    className="flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-medium uppercase focus:border-violet-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    disabled={loadingReferral}
                    onClick={async () => {
                      await applyReferralDiscount({
                        referralCode: referralCodeInput,
                      });
                    }}
                    className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-bold text-white hover:bg-violet-600 transition-colors disabled:opacity-60"
                  >
                    {loadingReferral ? "..." : "Apply"}
                  </button>
                </div>
                {referralDiscount > 0 ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-violet-800">
                    <p className="font-semibold">
                      {referralLabel}: −{formatInr(referralDiscount)}
                    </p>
                    <p className="text-violet-600">
                      Code {referralCodeApplied}
                      {referralInviterName ? ` · referred by ${referralInviterName}` : ""}
                    </p>
                    {/* {referralSegments.map((segment) => (
                      <p key={segment.category} className="text-violet-700">
                        {segment.label}: {segment.commissionType === "fixed" ? `₹${segment.commissionValue}` : `${segment.commissionValue}%`} on {formatInr(segment.lineAmount)} → −{formatInr(segment.discountAmount)}
                      </p>
                    ))} */}
                  </div>
                ) : null}
              </section>

              <SectionCard 
                title="Payment" 
                icon={Banknote}
                headerAction={
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("full")}
                        className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                          paymentStatus === "full" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                        }`}
                      >
                        Full
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("partial")}
                        className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                          paymentStatus === "partial" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                        }`}
                      >
                        Partial
                      </button>
                    </div>
                    <label className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMultiMode}
                        onChange={(e) => setIsMultiMode(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Split</span>
                    </label>
                  </div>
                }
              >
                {!isMultiMode ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {PAYMENT_METHOD_OPTIONS.map(({ value, label, Icon }) => (
                        <PaymentModeButton
                          key={value}
                          active={paymentMode === value}
                          onClick={() => setPaymentMode(value)}
                          icon={Icon}
                          label={label}
                        />
                      ))}
                    </div>

                    {isPartialPayment && (
                      <div className="rounded-lg bg-slate-50 p-4">
                        <label className="mb-1 block text-xs font-medium text-slate-500">Amount Received</label>
                        <input
                          type="number"
                          value={cashGiven}
                          onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-lg font-bold focus:border-indigo-600 outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {["cash", "upi", "wallet", "card"].map((key) => (
                        <div key={key}>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            {key}
                          </label>
                          <input
                            type="number"
                            value={splitPayments[key as keyof typeof splitPayments]}
                            onChange={(e) => setSplitAmount(key as any, Number(e.target.value) || 0)}
                            className="w-full rounded-lg border border-slate-100 px-3 py-2 text-sm font-bold focus:border-indigo-600 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["Cash", "UPI", "Wallet", "Card"].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            const key = label.toLowerCase() as any;
                            const val = key === "wallet" 
                              ? Math.min(walletBalance, (splitPayments as any).wallet + remainingForFull)
                              : (splitPayments as any)[key] + remainingForFull;
                            setSplitAmount(key, val);
                          }}
                          className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          + Add rest to {label}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-xs font-semibold">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Payable</span>
                        <span>{formatInr(finalPayable)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Allocated</span>
                        <span className="text-indigo-600">{formatInr(totalPaid)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                        <span>Remaining</span>
                        <span className={remainingForFull > 0 ? "text-amber-600" : "text-emerald-600"}>
                          {formatInr(remainingForFull)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Notes</label>
                <textarea
                  placeholder="Additional instructions..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-indigo-600 outline-none resize-none"
                  value={instructionNotes}
                  onChange={(e) => setInstructionNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Save & New
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSaveAndPrint();
            }}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            <span>{saving ? "Saving..." : "Complete & Print"}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
