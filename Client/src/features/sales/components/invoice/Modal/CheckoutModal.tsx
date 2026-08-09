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
  handleGetWalletInstructions,
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
import StaffVerifyModal from "./StaffVerifyModal";
import type { VerifiedStaff } from "@/services/apiClient";

type CheckoutItem = {
  id?: number;
  name: string;
  qty: number;
  price: number;
  discount?: number;
  cashback?: number;
  image?: string;
  category?: string;
  isCsp?: boolean;
  productDiscountAmount?: number;
  membershipDiscountAmount?: number;
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
  /** Catalogue / product-level discount total (separate from membership). */
  initialProductDiscount?: number;
  initialCashbackTotal?: number;
  /** When true, do not auto-credit cashback from checkout (server credits it). Still shows initialCashbackTotal. */
  disableCashback?: boolean;
  extraCharges?: Array<{ label: string; amount: number }>;
  membershipPlans?: MembershipPlanPayload[];
  /**
   * "purchase" adjusts confirm labels and sets purchaseType cash|credit.
   * Full / Partial / Due toggle is always shown; Due = full amount outstanding.
   */
  checkoutContext?: "sale" | "purchase";
  onConfirmPayment?: (payload: {
    mode: string;
    paymentStatus: "full" | "partial";
    purchaseType?: "cash" | "credit";
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
    /** True when user chose coupon instead of membership discount */
    waiveMembershipForCoupon?: boolean;
    extraCharges: Array<{ label: string; amount: number }>;
    customerId?: string | null;
    /** Staff verified via PIN before billing */
    invoiceBy?: {
      staffId: string;
      staffName: string;
      employeeId: string;
      email?: string;
    } | null;
    verifiedAt?: string | null;
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

/** Product-catalogue discount for a checkout line (not membership). */
function getLineProductDiscount(item: CheckoutItem): number {
  const productDisc = Number(item.productDiscountAmount ?? 0);
  if (productDisc > 0) return productDisc;
  const membershipDisc = item.isCsp
    ? 0
    : Number(item.membershipDiscountAmount ?? 0);
  const lineDisc = Number(item.discount ?? 0);
  // When split amounts are missing, treat full line discount as product discount
  if (membershipDisc <= 0 && lineDisc > 0) return lineDisc;
  return Math.max(0, lineDisc - membershipDisc);
}

function getCheckoutLinePricing(item: CheckoutItem) {
  const qty = Number(item.qty || 0);
  const unitPrice = Number(item.price || 0);
  const originalLine = Math.max(0, qty * unitPrice);
  const productDiscount = getLineProductDiscount(item);
  const discountedLine = Math.max(0, originalLine - productDiscount);
  const discountedUnit = qty > 0 ? discountedLine / qty : 0;
  return {
    qty,
    unitPrice,
    originalLine,
    productDiscount,
    discountedLine,
    discountedUnit,
    hasProductDiscount: productDiscount > 0.001,
  };
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

/** Prefer total spendable balance (general + cashback + affiliate). */
function resolveWalletBalance(
  wallet: Record<string, unknown> | null | undefined,
  fallback = 0,
): number {
  if (!wallet || typeof wallet !== "object") {
    return Number.isFinite(Number(fallback)) ? Math.max(0, Number(fallback)) : 0;
  }

  const total = Number(wallet.totalBalance);
  if (Number.isFinite(total)) return Math.max(0, total);

  const general = Number(
    wallet.generalBalance ?? wallet.walletAmount ?? wallet.balance ?? 0,
  );
  const cashback = Number(wallet.cashbackBalance ?? 0);
  const affiliate = Number(
    wallet.affiliateBalance ?? wallet.withdrawableBalance ?? 0,
  );

  // Raw wallet docs store buckets separately; list API already sums into walletAmount.
  if (
    wallet.generalBalance !== undefined ||
    wallet.cashbackBalance !== undefined ||
    wallet.affiliateBalance !== undefined
  ) {
    const sum =
      (Number.isFinite(general) ? general : 0) +
      (Number.isFinite(cashback) ? cashback : 0) +
      (Number.isFinite(affiliate) ? affiliate : 0);
    return Math.max(0, sum);
  }

  const amount = Number(
    wallet.walletAmount ??
      wallet.balance ??
      wallet.currentBalance ??
      wallet.availableBalance ??
      wallet.closingBalance ??
      fallback,
  );
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

/** Max wallet payment while keeping the configured minimum balance. */
function getMaxWalletPaymentAmount(
  spendableBalance: number,
  minimumBalance = 0,
) {
  const available = Math.max(0, Number(spendableBalance) || 0);
  const minBal = Math.max(0, Number(minimumBalance) || 0);
  return Math.max(0, available - minBal);
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
  initialProductDiscount = 0,
  initialCashbackTotal = 0,
  disableCashback = false,
  extraCharges = [],
  membershipPlans = DEFAULT_MEMBERSHIP_PLANS,
  checkoutContext = "sale",
  onConfirmPayment,
}: Props) {
  const isPurchaseCheckout = checkoutContext === "purchase";
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [cashGiven, setCashGiven] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<
    "full" | "partial" | "due"
  >("full");
  /** Due = full amount outstanding (not paid). Same idea as credit purchase. */
  const isDuePayment = paymentStatus === "due";
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
  const [minimumWalletBalance, setMinimumWalletBalance] = useState(0);
  const [instructionNotes, setInstructionNotes] = useState("");
  const [verifiedStaff, setVerifiedStaff] = useState<VerifiedStaff | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [staffVerified, setStaffVerified] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLabel, setCouponLabel] = useState("");
  /** When true, membership line discount is removed so coupon can apply instead */
  const [waiveMembershipForCoupon, setWaiveMembershipForCoupon] =
    useState(false);
  const [promoType, setPromoType] = useState<"coupon" | "referral">("coupon");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [loadingPromo, setLoadingPromo] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [referralLabel, setReferralLabel] = useState("Referral Discount");
  const [referralCodeApplied, setReferralCodeApplied] = useState("");
  const [referralInviterName, setReferralInviterName] = useState("");
  const [referralDiscountAlreadyUsed, setReferralDiscountAlreadyUsed] = useState(false);
  const [referralStatusMessage, setReferralStatusMessage] = useState("");
  const [referralSegments, setReferralSegments] = useState<
    Array<{
      category: string;
      label: string;
      commissionType: string;
      commissionValue: number;
      lineAmount: number;
      discountAmount: number;
      commissionAmount?: number;
      buyerDiscountAmount?: number;
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
    if (!open) return;
    const ac = new AbortController();
    void handleGetWalletInstructions(ac.signal)
      .then((res) => {
        const min = Number(
          res?.minimumBalance ?? res?.instructions?.minimumBalance ?? 0,
        );
        setMinimumWalletBalance(Number.isFinite(min) && min > 0 ? min : 0);
      })
      .catch(() => {
        setMinimumWalletBalance(0);
      });
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
      // Reset until wallet fetch completes for the prefilled customer
      setWalletBalance(0);
      setInstructionNotes("");
      setVerifiedStaff(null);
      setVerifiedAt(null);
      setStaffVerified(false);
      setCouponCode("");
      setCouponDiscount(0);
      setCouponLabel("");
      setWaiveMembershipForCoupon(false);
      setPromoType("coupon");
      setPromoCodeInput("");
      setLoadingPromo(false);
      setReferralCodeInput("");
      setReferralDiscount(0);
      setReferralLabel("Referral Discount");
      setReferralCodeApplied("");
      setReferralInviterName("");
      setReferralSegments([]);
      setReferralDiscountAlreadyUsed(false);
      setReferralStatusMessage("");
    }
  }, [
    open,
    initialCustomerName,
    initialCustomerPhone,
    initialMembership,
    initialCustomerId,
    initialMembershipPlanId,
  ]);

  // Prefill from Create Invoice / POS: load wallet when customer is already selected
  useEffect(() => {
    if (!open) return;
    const customerId = String(initialCustomerId ?? "").trim();
    const phone = String(initialCustomerPhone ?? "").trim();
    if (!customerId && !phone) {
      setWalletBalance(0);
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        let amount = 0;

        if (customerId) {
          try {
            const response = await handleGetWalletById(
              customerId,
              controller.signal,
            );
            const wallet =
              response?.wallet ?? response?.data ?? response ?? null;
            amount = resolveWalletBalance(wallet, 0);
          } catch {
            // Fall through to search by phone
          }
        }

        if (amount <= 0 && phone) {
          const walletResponse = await handleGetWallets(
            { search: phone, limit: 5 },
            controller.signal,
          );
          const walletItems = Array.isArray(walletResponse?.wallets)
            ? walletResponse.wallets
            : Array.isArray(walletResponse?.data)
              ? walletResponse.data
              : [];
          const match =
            walletItems.find(
              (w: any) =>
                String(w?.customerId ?? "") === customerId ||
                String(w?.customerPhone ?? "").trim() === phone ||
                String(w?.customer?.mobile ?? "").trim() === phone,
            ) ?? walletItems[0];
          amount = resolveWalletBalance(match, 0);
        }

        if (!controller.signal.aborted) {
          setWalletBalance(amount);
        }
      } catch {
        if (!controller.signal.aborted) setWalletBalance(0);
      }
    })();

    return () => controller.abort();
  }, [open, initialCustomerId, initialCustomerPhone]);

  const clearReferralDiscount = () => {
    setReferralDiscount(0);
    setReferralLabel("Referral Discount");
    setReferralCodeApplied("");
    setReferralInviterName("");
    setReferralSegments([]);
    setReferralDiscountAlreadyUsed(false);
    setReferralStatusMessage("");
    if (promoType === "referral") setPromoCodeInput("");
  };

  const clearCouponDiscount = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponLabel("");
    setWaiveMembershipForCoupon(false);
    if (promoType === "coupon") setPromoCodeInput("");
  };

  const handleApplyPromoCode = async () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      Swal.fire("Code required", "Enter a coupon or referral code.", "warning");
      return;
    }
    if (!items.length) {
      Swal.fire(
        "No items",
        "Add items before applying a discount code.",
        "warning",
      );
      return;
    }

    setLoadingPromo(true);
    try {
      if (promoType === "coupon") {
        const membershipOnCart = items.reduce(
          (sum, item) =>
            sum +
            (item.isCsp
              ? 0
              : Number(item.membershipDiscountAmount ?? 0)),
          0,
        );
        const activeMembership =
          membershipOnCart > 0
            ? membershipOnCart
            : Math.max(0, Number(initialMembershipDiscount || 0));

        let useCouponInsteadOfMembership = waiveMembershipForCoupon;
        if (activeMembership > 0 && !waiveMembershipForCoupon) {
          const choice = await Swal.fire({
            icon: "question",
            title: "Choose one discount",
            html: `
              <p style="text-align:left;margin:0 0 12px;font-size:14px;color:#334155">
                Membership discount (<strong>₹${activeMembership.toFixed(2)}</strong>) is already applied on this bill.
                <br/><br/>
                Coupon discount and membership discount <strong>cannot be used together</strong>.
                Which one do you want to apply?
              </p>
            `,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: "Use Coupon Discount",
            denyButtonText: "Keep Membership Discount",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#7c3aed",
            denyButtonColor: "#4f46e5",
            reverseButtons: true,
          });

          if (choice.isDismissed) {
            return;
          }
          if (choice.isDenied) {
            clearCouponDiscount();
            await Swal.fire({
              icon: "info",
              title: "Membership discount kept",
              text: "Coupon was not applied. Membership discount remains on this bill.",
              timer: 2200,
              showConfirmButton: false,
            });
            return;
          }
          useCouponInsteadOfMembership = true;
        }

        // If replacing membership, validate coupon against amount without membership discount
        const orderAmountForCoupon = useCouponInsteadOfMembership
          ? Math.max(0, Number(grandTotal || 0) + activeMembership)
          : Math.max(0, Number(grandTotal || 0));

        const response = await handleValidateCoupon({
          code,
          orderAmount: orderAmountForCoupon,
          customerPhone: customerSearch.trim() || undefined,
        });
        const discount = Number(response?.discountAmount ?? 0);
        if (discount <= 0) {
          clearCouponDiscount();
          Swal.fire(
            "Invalid coupon",
            "Coupon did not apply a discount.",
            "error",
          );
          return;
        }
        setWaiveMembershipForCoupon(useCouponInsteadOfMembership);
        setCouponDiscount(discount);
        setCouponCode(code);
        setCouponLabel(
          String(
            response?.coupon?.title ?? response?.title ?? "Coupon Applied",
          ),
        );
        setPromoCodeInput(code);
        void applyReferralDiscount({
          customer: selectedCustomer,
          referralCode: referralCodeInput || referralCodeApplied || "",
        });
        await Swal.fire({
          icon: "success",
          title: useCouponInsteadOfMembership
            ? "Coupon applied (membership removed)"
            : "Coupon applied",
          text: useCouponInsteadOfMembership
            ? `${code}: −₹${discount.toFixed(2)}. Membership discount was removed for this bill.`
            : `${code}: −₹${discount.toFixed(2)}`,
          timer: 2200,
          showConfirmButton: false,
        });
        return;
      }

      if (!selectedCustomer?._id && !customerSearch.trim()) {
        Swal.fire(
          "Customer required",
          "Select a customer before applying a referral code.",
          "warning",
        );
        return;
      }

      setReferralCodeInput(code);
      setPromoCodeInput(code);
      const applied = await applyReferralDiscount({
        customer: selectedCustomer,
        referralCode: code,
      });
      if (applied) {
        await Swal.fire({
          icon: "success",
          title: "Referral applied",
          text: "Referral code verified.",
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        Swal.fire(
          "Referral not applied",
          "Could not apply this referral code.",
          "info",
        );
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      if (promoType === "coupon") {
        clearCouponDiscount();
        Swal.fire(
          "Invalid coupon",
          err?.response?.data?.message ?? "Invalid coupon",
          "error",
        );
      } else {
        clearReferralDiscount();
        console.error(
          "Referral not applied",
          err?.response?.data?.message ?? "Could not apply referral code.",
          "info",
        );
      }
    } finally {
      setLoadingPromo(false);
    }
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
  }): Promise<boolean> => {
    const customer = opts?.customer ?? selectedCustomer;
    const code = String(opts?.referralCode ?? referralCodeInput ?? "").trim();
    const orderAmount = Math.max(0, Number(grandTotal || 0) - Number(couponDiscount || 0));

    if (orderAmount <= 0) {
      clearReferralDiscount();
      return false;
    }

    const customerId = String(customer?._id ?? initialCustomerId ?? "").trim();
    const customerPhone = String(
      customer?.mobile ?? customerSearch ?? initialCustomerPhone ?? "",
    ).trim();

    if (!customerId && !customerPhone && !code) {
      clearReferralDiscount();
      return false;
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
      if (!data?.referralCode && !data?.ok && !data?.commissionAmount) {
        clearReferralDiscount();
        return false;
      }

      const alreadyUsed = data.discountAlreadyUsed === true || data.discountEligible === false;
      const discountAmt = Number(data.discountAmount || 0);
      const commissionAmt = Number(data.commissionAmount || 0);

      setReferralDiscount(discountAmt);
      setReferralLabel(data.label || "Referral Discount");
      setReferralCodeApplied(String(data.referralCode || code || "").toUpperCase());
      setReferralInviterName(String(data.inviterName || ""));
      setReferralSegments(Array.isArray(data.segments) ? data.segments : []);
      setReferralDiscountAlreadyUsed(alreadyUsed && discountAmt <= 0 && commissionAmt > 0);
      setReferralStatusMessage(
        String(
          data.message ||
            (alreadyUsed && discountAmt <= 0
              ? "Referral discount already used on this account. Referrer will still earn commission."
              : ""),
        ),
      );
      if (data.referralCode) {
        setReferralCodeInput(String(data.referralCode).toUpperCase());
      }
      return true;
    } catch (error: unknown) {
      clearReferralDiscount();
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message;
      if (message) {
        void console.error({
          icon: "info",
          title: "Referral not applied",
          text: message,
          timer: 3200,
          showConfirmButton: false,
        });
      }
      return false;
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
        isCsp: Boolean(item.isCsp),
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
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.discount ?? 0),
        0,
      ),
    [items],
  );

  const lineProductDiscountTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.productDiscountAmount ?? 0),
        0,
      ),
    [items],
  );

  const lineMembershipDiscountTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          (item.isCsp ? 0 : Number(item.membershipDiscountAmount ?? 0)),
        0,
      ),
    [items],
  );

  const lineCashbackTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + (item.isCsp ? 0 : Number(item.cashback ?? 0)),
        0,
      ),
    [items],
  );
  const cartHasCsp = items.some((item) => Boolean(item.isCsp));

  // Keep Product Discount and Membership Discount separate in the UI
  const displayProductDiscount =
    lineProductDiscountTotal > 0
      ? lineProductDiscountTotal
      : initialProductDiscount > 0
        ? initialProductDiscount
        : // Fallback: CSP lines or product-only carts where split amounts were not stored
          cartHasCsp && lineDiscountsTotal > 0
            ? lineDiscountsTotal
            : lineDiscountsTotal > 0 &&
                lineMembershipDiscountTotal <= 0 &&
                Number(summary.membershipDiscount || 0) <= 0 &&
                Number(initialMembershipDiscount || 0) <= 0
              ? lineDiscountsTotal
              : 0;

  const rawMembershipDiscount =
    lineMembershipDiscountTotal > 0
      ? lineMembershipDiscountTotal
      : initialMembershipDiscount > 0
        ? initialMembershipDiscount
        : Number(summary.membershipDiscount || 0) > 0
          ? Number(summary.membershipDiscount || 0)
          : 0;

  const displayMembershipDiscount = waiveMembershipForCoupon
    ? 0
    : rawMembershipDiscount;

  // When coupon replaces membership, add membership amount back into payable base
  const payableBase = Math.max(
    0,
    Number(grandTotal || 0) +
      (waiveMembershipForCoupon ? rawMembershipDiscount : 0),
  );

  const displayCashbackTotal = disableCashback
    ? Math.max(0, Number(initialCashbackTotal) || 0)
    : cartHasCsp
      ? lineCashbackTotal > 0
        ? lineCashbackTotal
        : summary.cashbackTotal
      : initialCashbackTotal > 0
        ? initialCashbackTotal
        : lineCashbackTotal > 0
          ? lineCashbackTotal
          : summary.cashbackTotal;

  /** Subtotal after product discounts (membership still listed separately below). */
  const itemsSubtotal = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + getCheckoutLinePricing(item).discountedLine,
        0,
      ),
    [items],
  );

  useEffect(() => {
    if (!open) return;
    setPaymentStatus("full");
    setIsMultiMode(false);
  }, [open]);

  useEffect(() => {
    const payable = Math.max(0, payableBase - couponDiscount - referralDiscount);

    if (paymentStatus === "due") {
      setCashGiven(0);
      setIsMultiMode(false);
      setSplitPayments({ cash: 0, upi: 0, card: 0, wallet: 0 });
      return;
    }

    if (paymentStatus === "full") {
      if (isMultiMode) {
        setSplitPayments({ cash: payable, upi: 0, card: 0, wallet: 0 });
      } else {
        setCashGiven(payable);
      }
    }
  }, [
    paymentStatus,
    isMultiMode,
    payableBase,
    couponDiscount,
    referralDiscount,
  ]);

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
            const amount = resolveWalletBalance(wallet, 0);
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
              acc[key] = amount;
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
      resolveWalletBalance(customer, Number(customer?.closingBalance ?? 0));

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
          setWalletBalance(resolveWalletBalance(wallet, nextWalletBalance));
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

  const finalPayable = Math.max(
    0,
    payableBase - couponDiscount - referralDiscount,
  );
  const isPartialPayment = paymentStatus === "partial";
  const totalPaid = isDuePayment
    ? 0
    : isMultiMode
      ? splitPayments.cash +
        splitPayments.upi +
        splitPayments.card +
        splitPayments.wallet
      : cashGiven;
  const change = isDuePayment
    ? 0
    : Math.max(0, totalPaid - finalPayable);
  const dueAmount = isDuePayment
    ? finalPayable
    : Math.max(0, finalPayable - totalPaid);
  const remainingForFull = Math.max(0, finalPayable - totalPaid);


  const buildReceiptPayload = (invoiceNo: string) => ({
    invoiceNo,
    customerName: customerName.trim() || "Walk-in Customer",
    customerPhone: customerSearch.trim(),
    items: items.map((it) => ({
      name: it.name,
      qty: Number(it.qty),
      price: Number(it.price),
      discount: Number(it.discount ?? 0),
    })),
    totalMRP: items.reduce(
      (sum, it) => sum + Number(it.qty) * Number(it.price),
      0,
    ),
    discountTotal: lineDiscountsTotal + couponDiscount + referralDiscount,
    cashbackAmount: displayCashbackTotal,
    finalAmount: finalPayable,
    totalDue: dueAmount,
    totalQty,
    extraCharges,
  });

  const handlePrintOnly = () => {
    if (!items.length) {
      Swal.fire("No items", "Please add at least one item before printing.", "warning");
      return;
    }
    printThermalReceipt(
      buildReceiptPayload(
        `DRAFT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      ),
    );
  };

  const handleComplete = async () => {
    if (!customerName.trim()) {
      Swal.fire("Customer required", "Please enter customer name.", "warning");
      return;
    }
    if (!customerSearch.trim()) {
      Swal.fire("Phone required", "Please enter customer mobile number.", "warning");
      return;
    }
    if (!verifiedStaff?.staffId || !verifiedStaff?.staffName) {
      Swal.fire(
        "Staff verification required",
        "Verify Staff PIN before completing this bill.",
        "warning",
      );
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

    const walletPaymentAmount = isMultiMode
      ? Number(splitPayments.wallet || 0)
      : paymentMode === "Wallet"
        ? Number(cashGiven || 0)
        : 0;
    if (walletPaymentAmount > 0) {
      const maxPayable = getMaxWalletPaymentAmount(
        walletBalance,
        minimumWalletBalance,
      );
      if (walletPaymentAmount > maxPayable + 0.01) {
        Swal.fire(
          "Minimum wallet balance required",
          `Wallet payment would leave balance below the minimum of ₹${minimumWalletBalance.toFixed(2)}. ` +
            `Available for payment: ₹${maxPayable.toFixed(2)} ` +
            `(balance ₹${walletBalance.toFixed(2)} − minimum ₹${minimumWalletBalance.toFixed(2)}).`,
          "warning",
        );
        return;
      }
    }
    if (!isDuePayment && paymentStatus === "full" && dueAmount > 0) {
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

    if (!verifiedStaff) {
      Swal.fire(
        "Staff verification required",
        "Verify Staff PIN before completing billing.",
        "warning",
      );
      setStaffVerified(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const normalizedMode = isDuePayment
      ? "CREDIT"
      : isMultiMode
        ? "MULTI"
        : paymentMode.toUpperCase();
    const paymentPayload = {
      mode: normalizedMode,
      paymentStatus: isDuePayment
        ? ("partial" as const)
        : paymentStatus === "partial"
          ? ("partial" as const)
          : ("full" as const),
      purchaseType: isPurchaseCheckout
        ? isDuePayment
          ? ("credit" as const)
          : ("cash" as const)
        : isDuePayment
          ? ("credit" as const)
          : undefined,
      paymentBreakdown: {
        cash: isDuePayment
          ? 0
          : isMultiMode
            ? splitPayments.cash
            : paymentMode === "Cash"
              ? cashGiven
              : 0,
        upi: isDuePayment
          ? 0
          : isMultiMode
            ? splitPayments.upi
            : paymentMode === "UPI"
              ? cashGiven
              : 0,
        card: isDuePayment
          ? 0
          : isMultiMode
            ? splitPayments.card
            : paymentMode === "Card"
              ? cashGiven
              : 0,
        wallet: isDuePayment
          ? 0
          : isMultiMode
            ? splitPayments.wallet
            : paymentMode === "Wallet"
              ? cashGiven
              : 0,
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
      referral: referralCodeApplied
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
      waiveMembershipForCoupon,
      extraCharges: extraCharges,
      customerId:
        selectedCustomer?._id ?? initialCustomerId ?? null,
      invoiceBy: {
        staffId: String(verifiedStaff.staffId || verifiedStaff._id),
        staffName: verifiedStaff.staffName || verifiedStaff.name,
        employeeId: verifiedStaff.employeeId || verifiedStaff.m_staff_id || "",
        email: verifiedStaff.email || "",
      },
      verifiedAt: verifiedAt,
    };
    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerSearch.trim(),
      customerId: selectedCustomer?._id ?? initialCustomerId ?? undefined,
      invoiceDate: today,
      dueDate: today,
      salesPersonName:
        verifiedStaff.staffName ||
        verifiedStaff.name ||
        staff.m_staff_name ||
        "POS Sales",
      invoiceBy: {
        staffId: String(verifiedStaff.staffId || verifiedStaff._id),
        staffName: verifiedStaff.staffName || verifiedStaff.name,
        employeeId: verifiedStaff.employeeId || verifiedStaff.m_staff_id || "",
        email: verifiedStaff.email || "",
      },
      verifiedAt: verifiedAt,
      notes: instructionNotes.trim(),
      items: items.map((item) => ({
        productName: item.name,
        qty: Number(item.qty),
        unitPrice: Number(item.price),
        discount: Number(item.discount ?? 0),
        category: item.category || "General",
        image: item.image || "",
        isCsp: Boolean(item.isCsp),
      })),
      subTotal: items.reduce(
        (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
        0,
      ),
      discountTotal:
        items.reduce(
          (sum, item) =>
            sum + Number(item.discount || 0),
          0,
        ) +
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
      referral: referralCodeApplied
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
      cashbackTotal: displayCashbackTotal,
      membershipDiscount: displayMembershipDiscount,
      membershipType:
        selectedCustomer?.membershipType || membership || undefined,
      activityType: "Invoice",
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

      if (!disableCashback && displayCashbackTotal > 0) {
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

  if (!staffVerified) {
    return (
      <StaffVerifyModal
        open
        onClose={onClose}
        onVerified={({ staff: verified, verifiedAt: at }) => {
          setVerifiedStaff(verified);
          setVerifiedAt(at);
          setStaffVerified(true);
        }}
      />
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      className="fixed inset-0 z-[80] flex items-stretch justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="relative flex h-dvh max-h-dvh w-full max-w-5xl flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-3 sm:px-6 sm:py-4">
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
                  const pricing = getCheckoutLinePricing(item);

                  return (
                    <li key={item.id ?? i} className="py-3 first:pt-0">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {pricing.qty} ×{" "}
                            {pricing.hasProductDiscount ? (
                              <span className="inline-flex flex-wrap items-baseline gap-1">
                                <span className="sr-only">
                                  Original {formatInr(pricing.unitPrice)}, sale{" "}
                                  {formatInr(pricing.discountedUnit)}
                                </span>
                                <s
                                  aria-hidden="true"
                                  className="text-slate-400 decoration-slate-400"
                                >
                                  {formatInr(pricing.unitPrice)}
                                </s>
                                <span aria-hidden="true" className="text-slate-400">
                                  →
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="font-semibold text-emerald-700"
                                >
                                  {formatInr(pricing.discountedUnit)}
                                </span>
                              </span>
                            ) : (
                              formatInr(pricing.unitPrice)
                            )}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {pricing.hasProductDiscount ? (
                            <>
                              {/* <p className="text-[11px] text-slate-400 line-through tabular-nums"> */}
                                {/* {formatInr(pricing.originalLine)} */}
                              {/* </p> */}
                              <p className="text-sm font-semibold tabular-nums text-emerald-700">
                                {formatInr(pricing.discountedLine)}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-semibold tabular-nums text-slate-900">
                              {formatInr(pricing.discountedLine)}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                <SummaryLine label="Subtotal" value={formatInr(itemsSubtotal)} />
                {displayProductDiscount > 0 && (
                  <SummaryLine
                    label="Product Discount"
                    value={`− ${formatInr(displayProductDiscount)}`}
                    tone="discount"
                  />
                )}
                {displayMembershipDiscount > 0 && (
                  <SummaryLine
                    label="Membership Discount"
                    value={`− ${formatInr(displayMembershipDiscount)}`}
                    tone="discount"
                  />
                )}
                {waiveMembershipForCoupon && rawMembershipDiscount > 0 && (
                  <SummaryLine
                    label="Membership Discount (removed for coupon)"
                    value={formatInr(0)}
                    tone="muted"
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

                {displayCashbackTotal > 0 && (
                  <SummaryLine
                    label="Wallet Cashback"
                    value={`+ ${formatInr(displayCashbackTotal)}`}
                    tone="cashback"
                  />
                )}

                <div className="space-y-2 pt-2">
                  <SummaryLine label="Paid" value={formatInr(totalPaid)} tone="total" />
                  <SummaryLine label="Due" value={formatInr(dueAmount)} tone="due" />
                  <SummaryLine label="Change" value={formatInr(change)} tone="change" />
                </div>

                {displayCashbackTotal > 0 && (
                  <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-center">
                    <p className="text-[11px] font-bold text-emerald-700">
                      +{formatInr(displayCashbackTotal)} cashback will be credited to wallet
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
                  {displayProductDiscount > 0 && (
                    <span className="text-[11px] font-medium text-sky-700">
                      Product discount applied
                    </span>
                  )}
                  {displayMembershipDiscount > 0 && (
                    <span className="text-[11px] font-medium text-indigo-600">
                      Membership discount applied
                    </span>
                  )}
                  {waiveMembershipForCoupon && couponDiscount > 0 && (
                    <span className="text-[11px] font-medium text-violet-700">
                      Coupon chosen instead of membership
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2 text-xs font-semibold text-amber-600">
                    <WalletIcon className="h-4 w-4" />
                    <span>Balance: {formatInr(walletBalance)}</span>
                  </div>
                </div>
              </SectionCard>

              {/* Coupon / Referral — single input like FoodBill */}
              <section className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-violet-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600">
                    Coupon / Referral
                  </h3>
                </div>

                <div className="flex gap-1 rounded-lg border border-violet-100 bg-white/80 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPromoType("coupon");
                      setPromoCodeInput(couponCode || "");
                    }}
                    className={`flex-1 rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
                      promoType === "coupon"
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-violet-600 hover:bg-violet-50"
                    }`}
                  >
                    Coupon
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPromoType("referral");
                      setPromoCodeInput(
                        referralCodeInput || referralCodeApplied || "",
                      );
                    }}
                    className={`flex-1 rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
                      promoType === "referral"
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-violet-600 hover:bg-violet-50"
                    }`}
                  >
                    Referral
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    value={promoCodeInput}
                    onChange={(e) =>
                      setPromoCodeInput(e.target.value.toUpperCase())
                    }
                    placeholder={
                      promoType === "coupon"
                        ? "ENTER COUPON CODE"
                        : "ENTER REFERRAL CODE"
                    }
                    className="min-w-0 flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold uppercase text-slate-800 outline-none placeholder:font-medium placeholder:tracking-wide placeholder:text-slate-400 focus:border-violet-500"
                  />
                  <button
                    type="button"
                    disabled={loadingPromo || loadingReferral}
                    onClick={() => void handleApplyPromoCode()}
                    className="shrink-0 rounded-lg bg-violet-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                  >
                    {loadingPromo || loadingReferral ? "…" : "Apply"}
                  </button>
                </div>

                {couponDiscount > 0 ? (
                  <div className="flex items-center justify-between gap-2 text-xs text-indigo-700">
                    <span className="truncate font-semibold">
                      {couponLabel || "Coupon"}
                      {couponCode ? ` (${couponCode})` : ""}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-bold text-emerald-600">
                        −{formatInr(couponDiscount)}
                      </span>
                      <button
                        type="button"
                        onClick={clearCouponDiscount}
                        className="text-slate-400 hover:text-rose-500"
                        title="Remove coupon"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {referralDiscount > 0 ? (
                  <div className="flex items-center justify-between gap-2 text-xs text-violet-700">
                    <span className="truncate font-semibold">
                      {referralLabel}
                      {referralCodeApplied ? ` (${referralCodeApplied})` : ""}
                      {referralInviterName ? ` · ${referralInviterName}` : ""}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-bold text-emerald-600">
                        −{formatInr(referralDiscount)}
                      </span>
                      <button
                        type="button"
                        onClick={clearReferralDiscount}
                        className="text-slate-400 hover:text-rose-500"
                        title="Remove referral"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : referralCodeApplied ? (
                  <div className="flex items-center justify-between gap-2 text-xs text-violet-700">
                    <span className="truncate font-semibold">
                      {referralStatusMessage ||
                        referralLabel ||
                        "Referral applied (no buyer discount)"}
                      {referralCodeApplied ? ` (${referralCodeApplied})` : ""}
                      {referralInviterName ? ` · ${referralInviterName}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={clearReferralDiscount}
                      className="shrink-0 text-slate-400 hover:text-rose-500"
                      title="Remove referral"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-violet-500">
                    {referralStatusMessage ||
                      (loadingReferral
                        ? "Checking referral…"
                        : "Choose Coupon or Referral, enter code, then Apply.")}
                  </p>
                )}
              </section>

              <SectionCard 
                title="Payment" 
                icon={Banknote}
                headerAction={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div
                      className="flex shrink-0 rounded-lg bg-slate-100 p-1"
                      role="group"
                      aria-label="Payment status"
                    >
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("full")}
                        className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                          paymentStatus === "full"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Full
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("partial")}
                        className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                          paymentStatus === "partial"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Partial
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("due")}
                        className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                          paymentStatus === "due"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-slate-400 hover:text-amber-700"
                        }`}
                        title="Due / Credit — full amount stays outstanding"
                      >
                        Due
                      </button>
                    </div>
                    {!isDuePayment ? (
                      <label className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isMultiMode}
                          onChange={(e) => setIsMultiMode(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Split</span>
                      </label>
                    ) : null}
                  </div>
                }
              >
                {isDuePayment ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">Due — full amount outstanding</p>
                    <p className="mt-1 text-xs text-amber-800/90">
                      Due amount: {formatInr(finalPayable)}. Paid amount:{" "}
                      {formatInr(0)}. Nothing is marked as paid; settle later.
                    </p>
                  </div>
                ) : !isMultiMode ? (
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

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                  Invoice By (PIN verified)
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {verifiedStaff?.staffName || verifiedStaff?.name || "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {verifiedStaff?.employeeId ||
                        verifiedStaff?.m_staff_id ||
                        ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffVerified(false);
                      setVerifiedStaff(null);
                      setVerifiedAt(null);
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Re-verify
                  </button>
                </div>
              </div>

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
            onClick={handlePrintOnly}
            disabled={saving || items.length === 0}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={() => {
              void handleComplete();
            }}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            <span>
              {saving
                ? "Saving..."
                : isDuePayment
                  ? isPurchaseCheckout
                    ? "Save Due / Credit Purchase"
                    : "Complete as Due"
                  : isPurchaseCheckout
                    ? "Complete Cash Purchase"
                    : "Complete"}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
}
