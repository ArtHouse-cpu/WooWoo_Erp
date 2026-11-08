import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  FilePlus2,
  FileText,
  Globe,
  History,
  IndianRupee,
  LayoutDashboard,
  Loader2,
  Mail,
  Package,
  Phone,
  Search,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  ChevronDown,
  ChevronUp,
  Boxes,
  FileX,
  AlertCircle,
  CheckCircle2,
  Filter,
} from "lucide-react";
import {
  handleCreateManualPayout,
  handleGetCspPartnerDetails,
  type CspEnrollment,
  type CspPartnerDetails,
  type CspSoldProduct,
  type CspTimelineEvent,
} from "@/services/apiClient";
import { closeIfConfirmed } from "@/utils/confirmClose";

type Props = {
  partner: CspEnrollment | null;
  onClose: () => void;
};

type Tab = "overview" | "products" | "sales" | "timeline";

const textOrNA = (value?: string | number | null) => {
  const text = String(value ?? "").trim();
  return text || "N/A";
};

const money = (value?: number | null) => {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

const membershipLabel = (value?: string | null) => {
  const raw = String(value || "Premium").trim();
  if (!raw || ["none", "guest", "new"].includes(raw.toLowerCase())) return "Premium";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
};

const formatMembershipExpiryDisplay = (
  type?: string | null,
  endDate?: string | Date | null,
  isExpired?: boolean,
) => {
  const isLifetime = String(type || "").toLowerCase().includes("lifetime");

  if (endDate) {
    const date = endDate instanceof Date ? endDate : new Date(endDate);
    if (!Number.isNaN(date.getTime())) {
      const formatted = date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const expired = Boolean(isExpired) || diffDays < 0;

      if (expired) {
        const expiredAgo = Math.abs(diffDays);
        return {
          text: `Expired (${formatted})`,
          fullText: `Expired on ${formatted}${expiredAgo > 0 ? ` (${expiredAgo}d ago)` : ""}`,
          badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
          isExpired: true,
        };
      }
      if (diffDays === 0) {
        return {
          text: `${formatted} (today)`,
          fullText: `${formatted} (Expires today)`,
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
          isExpired: false,
        };
      }
      if (diffDays <= 7) {
        return {
          text: `${formatted} (${diffDays}d left)`,
          fullText: `${formatted} (${diffDays}d left)`,
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
          isExpired: false,
        };
      }
      return {
        text: formatted,
        fullText: formatted,
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        isExpired: false,
      };
    }
  }

  if (isLifetime) {
    return {
      text: "Lifetime",
      fullText: "Lifetime",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      isExpired: false,
    };
  }

  return {
    text: "N/A",
    fullText: "N/A",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
    isExpired: false,
  };
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const isSavedPartner = (id?: string) => Boolean(id && /^[a-f\d]{24}$/i.test(id));

const linkedCustomerId = (partner: CspEnrollment) => {
  if (partner.customer?._id) return String(partner.customer._id);
  if (typeof partner.customerId === "string") return partner.customerId;
  return partner.customerId?._id ? String(partner.customerId._id) : "";
};

const linkedVendor = (partner: CspEnrollment) => {
  const raw = partner.vendorId;
  return {
    vendorId:
      partner.vendor?._id ||
      (typeof raw === "string" ? raw : raw?._id ? String(raw._id) : ""),
    name: partner.vendor?.companyName || partner.vendor?.name || partner.displayName || "",
    mobile: partner.vendor?.mobile || partner.mobile || partner.customer?.mobile || "",
  };
};

const statusLabel = (status?: string) => {
  const value = String(status || "").trim().toLowerCase();
  if (value === "active") return "Active";
  if (value === "inactive") return "Inactive";
  if (!value) return "N/A";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const statusClass = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value === "active" || value === "paid" || value === "settled") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }
  if (value === "inactive" || value === "rejected") {
    return "bg-rose-50 text-rose-700 border-rose-100";
  }
  if (value === "requested" || value === "under_review" || value === "approved") {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
};

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-sm font-semibold text-slate-800 break-all">
        {children}
      </div>
    </div>
  );
}

function WebsiteValue({ value }: { value?: string }) {
  const text = String(value || "").trim();
  if (!text) return <span>N/A</span>;
  const href = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#ff5a36] hover:underline"
    >
      {text.replace(/^https?:\/\//i, "")}
    </a>
  );
}


const PRODUCT_CARD_PALETTES = [
  {
    cardBg: "bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/40 border-blue-200/80 hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5",
    imgBg: "bg-blue-100/70 border-blue-200/90 text-blue-600",
    categoryBadge: "bg-blue-100/90 text-blue-800 border-blue-200/80",
    priceText: "text-blue-700",
  },
  {
    cardBg: "bg-gradient-to-r from-purple-50/80 via-white to-fuchsia-50/40 border-purple-200/80 hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/5",
    imgBg: "bg-purple-100/70 border-purple-200/90 text-purple-600",
    categoryBadge: "bg-purple-100/90 text-purple-800 border-purple-200/80",
    priceText: "text-purple-700",
  },
  {
    cardBg: "bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/40 border-emerald-200/80 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/5",
    imgBg: "bg-emerald-100/70 border-emerald-200/90 text-emerald-600",
    categoryBadge: "bg-emerald-100/90 text-emerald-800 border-emerald-200/80",
    priceText: "text-emerald-700",
  },
  {
    cardBg: "bg-gradient-to-r from-amber-50/80 via-white to-orange-50/40 border-amber-200/80 hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/5",
    imgBg: "bg-amber-100/70 border-amber-200/90 text-amber-600",
    categoryBadge: "bg-amber-100/90 text-amber-800 border-amber-200/80",
    priceText: "text-amber-700",
  },
  {
    cardBg: "bg-gradient-to-r from-rose-50/80 via-white to-pink-50/40 border-rose-200/80 hover:border-rose-400 hover:shadow-md hover:shadow-rose-500/5",
    imgBg: "bg-rose-100/70 border-rose-200/90 text-rose-600",
    categoryBadge: "bg-rose-100/90 text-rose-800 border-rose-200/80",
    priceText: "text-rose-700",
  },
  {
    cardBg: "bg-gradient-to-r from-teal-50/80 via-white to-cyan-50/40 border-teal-200/80 hover:border-teal-400 hover:shadow-md hover:shadow-teal-500/5",
    imgBg: "bg-teal-100/70 border-teal-200/90 text-teal-600",
    categoryBadge: "bg-teal-100/90 text-teal-800 border-teal-200/80",
    priceText: "text-teal-700",
  },
];

export default function CspPartnerDetailsModal({ partner, onClose }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [productQuery, setProductQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<CspPartnerDetails | null>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("UPI");
  const [paying, setPaying] = useState(false);
  const [payoutError, setPayoutError] = useState("");
  const [payoutDone, setPayoutDone] = useState("");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!partner) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void closeIfConfirmed(onClose);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [partner, onClose]);

  useEffect(() => {
    if (!partner) return;
    setTab("overview");
    setProductQuery("");
    setDetails(null);
    setError("");
    setPayoutOpen(false);
    setPayoutAmount("");
    setPayoutError("");
    setPayoutDone("");
    setImageErrors({});
    setImagePreview(null);
    if (!isSavedPartner(partner._id)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    handleGetCspPartnerDetails(partner._id)
      .then((res) => {
        if (cancelled) return;
        if (!res?.success || !res.partner || !res.performance) {
          setError(res?.message || "Could not load partner details.");
          return;
        }
        setDetails({
          partner: res.partner,
          performance: res.performance,
          products: res.products || [],
          payouts: res.payouts || [],
          sales: res.sales || [],
          timeline: res.timeline || [],
          activity: res.activity || [],
        });
      })
      .catch(() => {
        if (!cancelled) setError("Could not load partner details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [partner]);

  if (!partner) return null;

  const profile = details?.partner;
  const customerRecord = (partner.customer as Record<string, any>) || {};
  const effectiveMembershipType =
    profile?.membershipType ||
    customerRecord?.membershipType ||
    "";
  const effectiveEndDate =
    profile?.membershipEndDate ??
    customerRecord?.membershipEndDate ??
    null;
  const effectiveExpired =
    profile?.membershipExpired ??
    customerRecord?.membershipExpired ??
    (effectiveEndDate ? new Date(effectiveEndDate).getTime() < Date.now() : false);

  const expiryInfo = formatMembershipExpiryDisplay(
    effectiveMembershipType,
    effectiveEndDate,
    effectiveExpired,
  );
  const fullName =
    profile?.fullName ||
    partner.customer?.name ||
    partner.displayName ||
    "N/A";
  const email =
    profile?.email ||
    partner.customer?.email ||
    partner.vendor?.email ||
    partner.vendor?.businessEmail ||
    "";
  const phone = profile?.phone || partner.mobile || partner.customer?.mobile || "";
  const website = profile?.website || partner.vendor?.website || "";
  const status = profile?.status || partner.status || "";
  const joinDate = profile?.joinDate || partner.createdAt || null;
  const brand =
    profile?.brandName ||
    partner.vendor?.companyName ||
    partner.vendor?.name ||
    partner.label ||
    "";
  const performance = details?.performance;
  const availableBalance =
    performance?.availableBalance ??
    Number(partner.withdrawable ?? partner.withdrawableBalance ?? 0);
  const customerId = linkedCustomerId(partner);
  const products = details?.products || [];
  const sales = details?.sales || [];
  const timeline = details?.timeline || details?.activity || [];
  const activity = timeline;
  const paidPayouts = (details?.payouts || []).filter(
    (item) => String(item.status || "").toLowerCase() === "paid",
  ).length;
  const shownProducts = products.filter((product) => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return true;
    return `${product.name} ${product.category}`.toLowerCase().includes(query);
  });

  const openPurchase = (path: "/create-purchase" | "/create-purchase-order") => {
    const vendor = linkedVendor(partner);
    onClose();
    navigate(path, {
      state: {
        prefillVendor: {
          vendorId: vendor.vendorId,
          name: vendor.name || brand || fullName,
          mobile: vendor.mobile || phone,
        },
      },
    });
  };

  const submitPayout = async () => {
    const amount = Number(payoutAmount);
    if (!customerId) {
      setPayoutError("This partner has no customer record to pay.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayoutError("Enter a payout amount greater than 0.");
      return;
    }
    if (amount > availableBalance) {
      setPayoutError("Amount is higher than the available balance.");
      return;
    }
    setPaying(true);
    setPayoutError("");
    setPayoutDone("");
    try {
      await handleCreateManualPayout({
        affiliateId: customerId,
        amount,
        payoutMethod,
        markPending: false,
      });
      setPayoutDone("Payout recorded.");
      setPayoutAmount("");
      const res = await handleGetCspPartnerDetails(partner._id);
      if (res?.success && res.partner && res.performance) {
        setDetails({
          partner: res.partner,
          performance: res.performance,
          products: res.products || [],
          payouts: res.payouts || [],
          sales: res.sales || [],
          timeline: res.timeline || [],
          activity: res.activity || [],
        });
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not create the payout.";
      setPayoutError(message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={() => void closeIfConfirmed(onClose)}
    >
      <div
        className="flex h-[90vh] min-h-[90vh] max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[85vh] sm:min-h-[85vh] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              CSP Program
            </p>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
              <h2 className="truncate text-lg font-black text-slate-900 sm:text-2xl">
                {fullName}
              </h2>
              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                {membershipLabel(effectiveMembershipType)}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 sm:text-sm">
              Creative Seller Partner
              {brand ? ` · ${brand}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(status)}`}
              >
                {statusLabel(status)}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${expiryInfo.badgeClass}`}
              >
                Expiry: {expiryInfo.fullText}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close partner details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3 sm:flex-wrap sm:px-5">
          <button
            type="button"
            onClick={() => openPurchase("/create-purchase")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Create Purchase
          </button>
          <button
            type="button"
            onClick={() => openPurchase("/create-purchase-order")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Create Purchase Order
          </button>
          <button
            type="button"
            onClick={() => {
              setPayoutOpen((open) => !open);
              setPayoutError("");
              setPayoutDone("");
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#ff5a36] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e64e2d] shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Wallet className="h-3.5 w-3.5" />
            Payout
          </button>
        </div>

        {payoutOpen ? (
          <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <p className="text-xs font-semibold text-slate-500">
              Available balance {money(availableBalance)}
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs font-semibold text-slate-600">
                Amount
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={payoutAmount}
                  onChange={(event) => setPayoutAmount(event.target.value)}
                  className="mt-1 block w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Method
                <select
                  value={payoutMethod}
                  onChange={(event) => setPayoutMethod(event.target.value)}
                  className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank</option>
                  <option value="Manual">Manual</option>
                </select>
              </label>
              <button
                type="button"
                disabled={paying}
                onClick={() => void submitPayout()}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {paying ? "Paying…" : "Pay now"}
              </button>
            </div>
            {payoutError ? (
              <p className="mt-2 text-xs font-medium text-rose-600">{payoutError}</p>
            ) : null}
            {payoutDone ? (
              <p className="mt-2 text-xs font-medium text-emerald-700">{payoutDone}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:px-5 scrollbar-none">
          {(
            [
              {
                id: "overview",
                label: "Overview",
                Icon: LayoutDashboard,
                activeClass:
                  "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-600",
                inactiveClass:
                  "bg-blue-50/70 text-blue-700 hover:bg-blue-100/90 border border-blue-200/70",
                badge: null,
              },
              {
                id: "products",
                label: "Products",
                Icon: Package,
                activeClass:
                  "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-500/25 ring-1 ring-purple-600",
                inactiveClass:
                  "bg-purple-50/70 text-purple-700 hover:bg-purple-100/90 border border-purple-200/70",
                badge: products.length,
              },
              {
                id: "sales",
                label: "Sales",
                Icon: TrendingUp,
                activeClass:
                  "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-600",
                inactiveClass:
                  "bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/90 border border-emerald-200/70",
                badge: sales.length,
              },
              {
                id: "timeline",
                label: "Timeline",
                Icon: History,
                activeClass:
                  "bg-gradient-to-r from-amber-500 to-[#ff5a36] text-white shadow-md shadow-orange-500/25 ring-1 ring-[#ff5a36]",
                inactiveClass:
                  "bg-orange-50/70 text-orange-700 hover:bg-orange-100/90 border border-orange-200/70",
                badge: null,
              },
            ] as const
          ).map((item) => {
            const isActive = tab === item.id;
            const Icon = item.Icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-95 ${
                  isActive ? item.activeClass : item.inactiveClass
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {item.badge != null && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                      isActive
                        ? "bg-white text-purple-900 shadow-xs"
                        : "bg-white/90 text-slate-700 border border-slate-200/70"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] px-3 py-3 sm:px-5 sm:py-4">
          {loading && tab !== "overview" ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
              <p className="mt-3 text-sm">Loading CSP details…</p>
            </div>
          ) : tab === "overview" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-6 lg:gap-3">
                <StatCard
                  icon={Package}
                  label="Products Displayed"
                  value={loading ? "—" : String(products.length)}
                  tone="orange"
                />
                <StatCard
                  icon={ShoppingBag}
                  label="Products Sold"
                  value={performance ? String(performance.productsSold) : loading ? "—" : "0"}
                  tone="green"
                />
                <StatCard
                  icon={IndianRupee}
                  label="Earnings"
                  value={performance ? money(performance.totalEarnings) : loading ? "—" : "₹0"}
                  tone="amber"
                />
                <StatCard
                  icon={Wallet}
                  label="Payouts"
                  value={performance ? money(performance.completedPayout) : loading ? "—" : "₹0"}
                  hint={performance ? `${paidPayouts} completed` : undefined}
                  tone="blue"
                />
                <StatCard
                  icon={Users}
                  label="Leads"
                  value={
                    performance?.totalLeads == null
                      ? loading
                        ? "—"
                        : "0"
                      : String(performance.totalLeads)
                  }
                  tone="rose"
                />
                <StatCard
                  icon={FileText}
                  label="History"
                  value={loading ? "—" : String(activity.length)}
                  hint="Total activities"
                  tone="slate"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Field icon={User} label="Full Name">
                  {textOrNA(fullName === "N/A" ? "" : fullName)}
                </Field>
                <Field icon={Mail} label="Email Address">
                  {textOrNA(email)}
                </Field>
                <Field icon={Phone} label="Phone Number">
                  {textOrNA(phone)}
                </Field>
                <Field icon={Globe} label="Profile / Website">
                  <WebsiteValue value={website || profile?.prositeUrl} />
                </Field>
                <Field icon={Calendar} label="Join Date">
                  {formatDate(joinDate)}
                </Field>
                <Field icon={User} label="Enrollment Status">
                  {statusLabel(status)}
                </Field>
              </div>
            </div>
          ) : tab === "products" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder="Search products by name or category..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-orange-300"
                />
              </div>
              {shownProducts.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
                  <Package className="mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">
                    {products.length === 0 ? "No products added." : "No products match that search."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {shownProducts.map((product, idx) => {
                    const palette = PRODUCT_CARD_PALETTES[idx % PRODUCT_CARD_PALETTES.length];
                    const imgUrl =
                      (typeof (product as any).imageUrl === "string" && (product as any).imageUrl.trim()
                        ? (product as any).imageUrl.trim()
                        : null) ||
                      (typeof (product as any).image === "string" && (product as any).image.trim()
                        ? (product as any).image.trim()
                        : null) ||
                      (Array.isArray((product as any).images) &&
                      (product as any).images.length > 0 &&
                      typeof (product as any).images[0] === "string" &&
                      (product as any).images[0].trim()
                        ? (product as any).images[0].trim()
                        : null);
                    const hasImage = Boolean(imgUrl && !imageErrors[product.id]);

                    return (
                      <div
                        key={product.id}
                        className={`group relative flex items-center justify-between gap-3.5 rounded-2xl border p-3 sm:p-3.5 shadow-2xs transition-all duration-200 hover:shadow-md ${palette.cardBg}`}
                      >
                        <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
                          {/* Product Image / Colorful Icon Frame */}
                          <div
                            onClick={() => hasImage && imgUrl && setImagePreview(imgUrl)}
                            className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border flex items-center justify-center transition-all ${palette.imgBg} ${
                              hasImage ? "cursor-pointer hover:opacity-90 active:scale-95 shadow-xs" : ""
                            }`}
                            title={hasImage ? "Click to view full image" : product.name}
                          >
                            {hasImage && imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={product.name || "Product"}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={() =>
                                  setImageErrors((prev) => ({ ...prev, [product.id]: true }))
                                }
                              />
                            ) : (
                              <Package className="h-6 w-6 sm:h-7 sm:w-7 transition-transform group-hover:scale-110" />
                            )}
                          </div>

                          {/* Product Information */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm sm:text-base font-bold text-slate-900">
                              {textOrNA(product.name)}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${palette.categoryBadge}`}
                              >
                                {textOrNA(product.category)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="inline-flex items-center text-sm sm:text-base font-extrabold text-emerald-700">
                                {money(product.price)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stock & Sold Right Column */}
                        <div className="shrink-0 text-right">
                          {product.stock > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{product.stock} in stock</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200/90 px-2.5 py-1 text-xs font-bold text-rose-700 shadow-2xs">
                              Out of stock
                            </span>
                          )}
                          <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                            Sold <span className="font-bold text-slate-700">{product.sold}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : tab === "sales" ? (
            <CspSalesTab
              sales={sales}
              performance={performance}
              onPreviewImage={(url) => setImagePreview(url)}
            />
          ) : (
            <CspTimelineTab
              events={timeline}
              onPreviewImage={(url) => setImagePreview(url)}
            />
          )}
        </div>
      </div>

      {imagePreview && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setImagePreview(null)}
        >
          <div
            className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900 shadow-md transition cursor-pointer"
              aria-label="Close image preview"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={imagePreview}
              alt="Product preview"
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

const STAT_TONES = {
  orange: "border-[#FFEADA] bg-[#FFF9F5] text-orange-600",
  green: "border-[#E1F4E7] bg-[#F3FAF5] text-emerald-600",
  amber: "border-[#F6EED8] bg-[#FCFAF2] text-amber-700",
  blue: "border-[#E2EEFB] bg-[#F4F8FC] text-blue-600",
  rose: "border-[#FBE0E3] bg-[#FCF4F5] text-rose-500",
  slate: "border-[#E9EBEF] bg-[#F6F7F9] text-slate-700",
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  hint?: string;
  tone: keyof typeof STAT_TONES;
}) {
  const toneClass = STAT_TONES[tone];
  return (
    <div className={`flex min-h-[72px] flex-col justify-between rounded-xl border p-2 sm:min-h-[92px] sm:rounded-2xl sm:p-3.5 ${toneClass}`}>
      <div className="flex items-start gap-1 sm:gap-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/80 sm:h-8 sm:w-8 sm:rounded-xl">
          <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
        </div>
        <span className="text-[9px] font-semibold leading-tight text-slate-600 sm:text-xs">
          {label}
        </span>
      </div>
      <div className="mt-1.5">
        <p className="text-sm font-black leading-none text-slate-900 sm:text-xl">{value}</p>
        {hint ? (
          <p className="mt-1 text-[9px] font-medium leading-tight text-slate-400 sm:text-[11px]">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function CspSalesTab({
  sales,
  performance,
  onPreviewImage,
}: {
  sales: CspSoldProduct[];
  performance?: CspPartnerDetails["performance"];
  onPreviewImage: (url: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Summary Metrics
  const totalSalesAmount =
    performance?.salesAmount ??
    sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  const totalProductsSold =
    performance?.productsSold ??
    sales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

  const successfulTxCount =
    performance?.successfulTransactionsCount ??
    new Set(sales.map((s) => s.invoiceCode || s.id)).size;

  const filteredSales = sales.filter((sale) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      sale.productName.toLowerCase().includes(query) ||
      sale.customerName.toLowerCase().includes(query) ||
      (sale.invoiceCode && sale.invoiceCode.toLowerCase().includes(query)) ||
      (sale.category && sale.category.toLowerCase().includes(query));

    if (!matchesQuery) return false;

    if (dateFilter === "all" || !sale.saleDate) return true;
    const d = new Date(sale.saleDate);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    if (dateFilter === "today") {
      return d.toDateString() === now.toDateString();
    }
    if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    if (dateFilter === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="flex min-h-[76px] flex-col justify-between rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 p-2.5 sm:min-h-[92px] sm:rounded-2xl sm:p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-700">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100/80 text-emerald-600 sm:h-8 sm:w-8 sm:rounded-xl">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <span className="text-[10px] font-bold sm:text-xs leading-tight">Total Sales</span>
          </div>
          <p className="mt-1.5 text-sm font-black leading-none text-emerald-950 sm:text-xl">
            {money(totalSalesAmount)}
          </p>
        </div>

        <div className="flex min-h-[76px] flex-col justify-between rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/30 p-2.5 sm:min-h-[92px] sm:rounded-2xl sm:p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 text-blue-700">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100/80 text-blue-600 sm:h-8 sm:w-8 sm:rounded-xl">
              <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <span className="text-[10px] font-bold sm:text-xs leading-tight">Products Sold</span>
          </div>
          <p className="mt-1.5 text-sm font-black leading-none text-blue-950 sm:text-xl">
            {totalProductsSold} <span className="text-xs font-semibold text-blue-600 sm:text-sm">Units</span>
          </p>
        </div>

        <div className="flex min-h-[76px] flex-col justify-between rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-pink-50/30 p-2.5 sm:min-h-[92px] sm:rounded-2xl sm:p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 text-purple-700">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-100/80 text-purple-600 sm:h-8 sm:w-8 sm:rounded-xl">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <span className="text-[10px] font-bold sm:text-xs leading-tight">Successful Tx</span>
          </div>
          <p className="mt-1.5 text-sm font-black leading-none text-purple-950 sm:text-xl">
            {successfulTxCount} <span className="text-xs font-semibold text-purple-600 sm:text-sm">Orders</span>
          </p>
        </div>
      </div>

      {/* Search and Date Filter Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product, customer, or invoice…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/90 bg-slate-50/80 p-1">
          {(
            [
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "week", label: "7 Days" },
              { id: "month", label: "This Month" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDateFilter(item.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                dateFilter === item.id
                  ? "bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200/60"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sold Products List */}
      {filteredSales.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
          <ShoppingBag className="mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">
            {sales.length === 0
              ? "No products sold yet"
              : "No sales match your filter"}
          </p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {sales.length === 0
              ? "Completed customer sales for this partner's catalogue will appear here automatically."
              : "Try adjusting your search query or date range filter."}
          </p>
          {(searchQuery || dateFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setDateFilter("all");
              }}
              className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSales.map((sale, index) => {
            const hasImage = Boolean(sale.image && !imageErrors[sale.id]);
            return (
              <div
                key={sale.id || index}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-emerald-50/40 via-white to-teal-50/20 p-3 sm:p-3.5 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-200"
              >
                <div className="flex min-w-0 items-start sm:items-center gap-3">
                  {/* Thumbnail / Icon */}
                  <div
                    onClick={() => hasImage && sale.image && onPreviewImage(sale.image)}
                    className={`relative h-13 w-13 sm:h-15 sm:w-15 shrink-0 overflow-hidden rounded-xl border border-emerald-200/80 bg-emerald-100/60 flex items-center justify-center transition-all ${
                      hasImage ? "cursor-pointer hover:opacity-90 active:scale-95 shadow-xs" : ""
                    }`}
                    title={hasImage ? "Click to view full image" : sale.productName}
                  >
                    {hasImage && sale.image ? (
                      <img
                        src={sale.image}
                        alt={sale.productName}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() =>
                          setImageErrors((prev) => ({ ...prev, [sale.id]: true }))
                        }
                      />
                    ) : (
                      <Package className="h-6 w-6 text-emerald-600 transition-transform group-hover:scale-110" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm sm:text-base font-bold text-slate-900">
                      {textOrNA(sale.productName)}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {sale.category ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          {sale.category}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {sale.invoiceCode || `INV-${sale.invoiceNumber || ""}`}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <User className="h-3 w-3 text-slate-400" />
                        {sale.customerName || "Customer"}
                        {sale.customerPhone ? (
                          <span className="text-[11px] text-slate-400 font-normal">({sale.customerPhone})</span>
                        ) : null}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatDateTime(sale.saleDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Details: Price, Qty, Sailor Earnings */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-black text-emerald-700 leading-none">
                      {money(sale.totalAmount)}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-500">
                      <span className="inline-block rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-800 font-bold border border-emerald-200/80 mr-1">
                        Qty: {sale.quantity}
                      </span>
                      @{money(sale.unitPrice)}
                    </div>
                  </div>

                  {sale.sailorEarnings > 0 && (
                    <div className="mt-1 inline-flex items-center rounded-lg bg-purple-50 border border-purple-200/90 px-2 py-0.5 text-[11px] font-bold text-purple-700 shadow-2xs">
                      Partner: {money(sale.sailorEarnings)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CspTimelineTab({
  events,
  onPreviewImage,
}: {
  events: CspTimelineEvent[];
  onPreviewImage: (url: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "purchases" | "sales" | "stock">("all");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const purchaseCount = events.filter((e) => e.kind === "purchase").length;
  const salesCount = events.filter((e) => e.kind === "sale").length;
  const stockCount = events.filter((e) => e.kind === "stock_add").length;

  const filteredEvents = events.filter((e) => {
    if (filter === "purchases") return e.kind === "purchase";
    if (filter === "sales") return e.kind === "sale";
    if (filter === "stock") return e.kind === "stock_add";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { id: "all", label: "All Activities", count: events.length, color: "text-slate-700", activeBg: "bg-slate-900 text-white" },
            { id: "purchases", label: "Purchases", count: purchaseCount, color: "text-blue-700", activeBg: "bg-blue-600 text-white" },
            { id: "sales", label: "Sales", count: salesCount, color: "text-emerald-700", activeBg: "bg-emerald-600 text-white" },
            { id: "stock", label: "Stock Updates", count: stockCount, color: "text-amber-700", activeBg: "bg-amber-600 text-white" },
          ] as const
        ).map((item) => {
          const isActive = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                isActive
                  ? `${item.activeBg} shadow-xs ring-1 ring-black/5`
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vertical Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
          <History className="mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No activity recorded yet</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Activity history will track purchases, product sales, stock updates, and payouts in chronological order.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-3.5 before:absolute before:bottom-3 before:top-3 before:left-[11px] sm:before:left-[15px] before:w-0.5 before:bg-slate-200">
          {filteredEvents.map((item, index) => {
            const isExpanded = Boolean(expandedIds[item.id || String(index)]);
            const hasDetails = Boolean(
              (item.details?.items && item.details.items.length > 0) ||
              item.details?.notes ||
              item.details?.paidAmount != null ||
              item.details?.sailorEarnings != null ||
              item.details?.reason ||
              item.details?.method
            );

            // Icon and styling mapping
            let config = {
              Icon: History,
              dotBg: "bg-slate-600 text-white ring-4 ring-slate-100",
              cardBorder: "border-slate-200 hover:border-slate-300",
              cardBg: "bg-white",
              badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
              badgeText: "Activity",
            };

            if (item.kind === "purchase") {
              config = {
                Icon: ShoppingCart,
                dotBg: "bg-blue-600 text-white ring-4 ring-blue-100",
                cardBorder: "border-blue-100/90 hover:border-blue-300",
                cardBg: "bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/20",
                badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
                badgeText: item.type === "purchase_order" ? "Purchase Order" : "Purchase Created",
              };
            } else if (item.kind === "sale") {
              config = {
                Icon: TrendingUp,
                dotBg: "bg-emerald-600 text-white ring-4 ring-emerald-100",
                cardBorder: "border-emerald-100/90 hover:border-emerald-300",
                cardBg: "bg-gradient-to-r from-emerald-50/40 via-white to-teal-50/20",
                badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
                badgeText: "Product Sold",
              };
            } else if (item.kind === "stock_add") {
              config = {
                Icon: Boxes,
                dotBg: "bg-amber-500 text-white ring-4 ring-amber-100",
                cardBorder: "border-amber-100/90 hover:border-amber-300",
                cardBg: "bg-gradient-to-r from-amber-50/40 via-white to-orange-50/20",
                badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
                badgeText: "Stock Added",
              };
            } else if (item.kind === "cancellation") {
              config = {
                Icon: FileX,
                dotBg: "bg-rose-500 text-white ring-4 ring-rose-100",
                cardBorder: "border-rose-100/90 hover:border-rose-300",
                cardBg: "bg-gradient-to-r from-rose-50/40 via-white to-red-50/20",
                badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
                badgeText: "Cancelled",
              };
            } else if (item.kind === "payout") {
              config = {
                Icon: Wallet,
                dotBg: "bg-purple-600 text-white ring-4 ring-purple-100",
                cardBorder: "border-purple-100/90 hover:border-purple-300",
                cardBg: "bg-gradient-to-r from-purple-50/40 via-white to-pink-50/20",
                badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
                badgeText: "Payout",
              };
            }

            const Icon = config.Icon;

            return (
              <div key={item.id || index} className="relative group">
                {/* Timeline Dot Marker */}
                <div
                  className={`absolute -left-[23px] sm:-left-[27px] top-3.5 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-transform group-hover:scale-110 shadow-xs ${config.dotBg}`}
                >
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>

                {/* Event Card */}
                <div
                  className={`rounded-2xl border p-3 sm:p-3.5 shadow-2xs transition-all duration-200 hover:shadow-md ${config.cardBorder} ${config.cardBg}`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${config.badgeBg}`}
                      >
                        {config.badgeText}
                      </span>
                      {item.idRef ? (
                        <span className="text-[11px] font-bold text-slate-700">
                          #{item.idRef}
                        </span>
                      ) : null}
                    </div>

                    <span className="text-[11px] font-medium text-slate-400">
                      {formatDateTime(item.date || item.at)}
                    </span>
                  </div>

                  {/* Title & Core Details */}
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 leading-tight">
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p className="mt-0.5 text-xs text-slate-500 font-medium truncate">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      {item.quantity != null && item.quantity > 0 && (
                        <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                          Qty: {item.quantity}
                        </span>
                      )}
                      <span className="text-sm sm:text-base font-extrabold text-slate-900">
                        {money(item.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Details Toggle */}
                  {hasDetails && (
                    <div className="mt-2.5 border-t border-slate-100/90 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id || String(index))}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      >
                        <span>{isExpanded ? "Hide details" : "View details"}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 rounded-xl bg-slate-50/90 border border-slate-200/70 p-2.5 text-xs space-y-2 animate-in fade-in duration-150">
                          {item.details?.items && item.details.items.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Purchased Items Breakdown
                              </p>
                              <div className="space-y-1">
                                {item.details.items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200/50"
                                  >
                                    <span className="truncate font-medium">{it.productName}</span>
                                    <span className="shrink-0 font-semibold text-slate-900 ml-2">
                                      {it.qty} × {money(it.unitPrice)} = {money(it.lineTotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {item.details?.supplierName && (
                              <div>
                                <span className="text-slate-400">Supplier: </span>
                                <span className="font-semibold text-slate-700">{item.details.supplierName}</span>
                              </div>
                            )}
                            {item.details?.customerName && (
                              <div>
                                <span className="text-slate-400">Customer: </span>
                                <span className="font-semibold text-slate-700">
                                  {item.details.customerName}
                                  {item.details.customerPhone ? ` (${item.details.customerPhone})` : ""}
                                </span>
                              </div>
                            )}
                            {item.details?.paidAmount != null && item.details.paidAmount > 0 && (
                              <div>
                                <span className="text-slate-400">Paid: </span>
                                <span className="font-semibold text-emerald-700">{money(item.details.paidAmount)}</span>
                              </div>
                            )}
                            {item.details?.dueAmount != null && item.details.dueAmount > 0 && (
                              <div>
                                <span className="text-slate-400">Due: </span>
                                <span className="font-semibold text-rose-600">{money(item.details.dueAmount)}</span>
                              </div>
                            )}
                            {item.details?.sailorEarnings != null && item.details.sailorEarnings > 0 && (
                              <div>
                                <span className="text-slate-400">Partner Share: </span>
                                <span className="font-semibold text-purple-700">{money(item.details.sailorEarnings)}</span>
                              </div>
                            )}
                            {item.details?.method && (
                              <div>
                                <span className="text-slate-400">Method: </span>
                                <span className="font-semibold text-slate-700">{item.details.method}</span>
                              </div>
                            )}
                            {item.details?.status && (
                              <div>
                                <span className="text-slate-400">Status: </span>
                                <span className="font-semibold text-slate-700 capitalize">{item.details.status}</span>
                              </div>
                            )}
                          </div>

                          {item.details?.notes && (
                            <p className="text-[11px] text-slate-500 italic">
                              Note: {item.details.notes}
                            </p>
                          )}
                          {item.details?.reason && (
                            <p className="text-[11px] text-rose-600 font-medium">
                              Reason: {item.details.reason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
