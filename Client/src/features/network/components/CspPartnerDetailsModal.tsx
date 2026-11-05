import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  FilePlus2,
  FileText,
  Globe,
  IndianRupee,
  Loader2,
  Mail,
  Package,
  Phone,
  Search,
  ShoppingBag,
  ShoppingCart,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  handleCreateManualPayout,
  handleGetCspPartnerDetails,
  type CspEnrollment,
  type CspPartnerDetails,
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

const membershipExpiryDate = (value?: string | Date | null) => {
  if (!value) return "Lifetime";
  return formatDate(value);
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
  const activity = details?.activity || [];
  const sales = activity.filter((item) => item.kind === "sale");
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
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              CSP Program
            </p>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
              <h2 className="truncate text-lg font-black text-slate-900 sm:text-2xl">
                {fullName}
              </h2>
              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                {membershipLabel(profile?.membershipType)}
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
              <span className="text-[11px] font-medium text-slate-500">
                Expiry {membershipExpiryDate(profile?.membershipEndDate)}
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

        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3 sm:flex-wrap sm:px-5">
          <button
            type="button"
            onClick={() => openPurchase("/create-purchase")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Create Purchase
          </button>
          <button
            type="button"
            onClick={() => openPurchase("/create-purchase-order")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#ff5a36] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e64e2d]"
          >
            <Wallet className="h-3.5 w-3.5" />
            Payout
          </button>
        </div>

        {payoutOpen ? (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
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

        <div className="flex gap-5 overflow-x-auto border-b border-slate-100 px-4 sm:gap-8 sm:px-5">
          {(
            [
              ["overview", "Overview"],
              ["products", "Products"],
              ["sales", "Sales"],
              ["timeline", "Timeline"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`-mb-px shrink-0 border-b-2 py-3 text-sm font-bold cursor-pointer ${
                tab === id
                  ? "border-[#ff5a36] text-[#ff5a36]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
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
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400">
                  {products.length === 0 ? "No products added." : "No products match that search."}
                </p>
              ) : (
                <div className="space-y-2">
                  {shownProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {textOrNA(product.name)}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {textOrNA(product.category)}
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-emerald-600">
                            {money(product.price)}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-slate-500">
                        <p className="font-semibold text-slate-700">In stock</p>
                        <p className="text-base font-bold text-emerald-600">{product.stock}</p>
                        <p className="mt-1">Sold {product.sold}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : tab === "sales" ? (
            <ActivityList
              empty="No sales yet."
              items={sales}
            />
          ) : (
            <ActivityList
              empty="No sales, leads, or payouts yet."
              items={activity}
            />
          )}
        </div>
      </div>
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

function ActivityList({
  items,
  empty,
}: {
  items: CspPartnerDetails["activity"];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400">
        {empty}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={`${item.kind}-${item.at}-${index}`}
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500">
            {item.kind === "sale" ? <Package className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
            <p className="text-xs text-slate-400">
              {formatDate(item.at)}
              {item.detail ? ` · ${item.detail}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-slate-800">{money(item.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
