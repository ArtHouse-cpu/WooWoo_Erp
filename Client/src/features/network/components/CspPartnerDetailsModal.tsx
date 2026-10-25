import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  FilePlus2,
  Globe,
  IndianRupee,
  Loader2,
  Mail,
  Package,
  Phone,
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

type Props = {
  partner: CspEnrollment | null;
  onClose: () => void;
};

type Tab = "overview" | "details";

const textOrNA = (value?: string | number | null) => {
  const text = String(value ?? "").trim();
  return text || "N/A";
};

const money = (value?: number | null) => {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return `₹${Number(value).toLocaleString("en-IN")}`;
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
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [partner, onClose]);

  useEffect(() => {
    if (!partner) return;
    setTab("overview");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "88vh" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              CSP Partner
            </p>
            <h2 className="mt-0.5 truncate text-lg font-semibold text-slate-900">
              {fullName}
            </h2>
            <div className="mt-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(status)}`}
              >
                {statusLabel(status)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close partner details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={() => openPurchase("/create-purchase")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Create Purchase
          </button>
          <button
            type="button"
            onClick={() => openPurchase("/create-purchase-order")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5a36] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e64e2d]"
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

        <div className="flex gap-1 border-b border-slate-100 px-5">
          {(
            [
              ["overview", "Overview"],
              ["details", "CSP Details"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold cursor-pointer ${
                tab === id
                  ? "border-[#ff5a36] text-[#ff5a36]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "overview" ? (
            <div className="grid gap-3 sm:grid-cols-2">
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
              <Field icon={User} label="Enrollment Status">
                {statusLabel(status)}
              </Field>
              <Field icon={Calendar} label="Join Date">
                {formatDate(joinDate)}
              </Field>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
              <p className="mt-3 text-sm">Loading CSP details…</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error ? (
                <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Kpi icon={ShoppingBag} label="Products Sold" value={performance ? String(performance.productsSold) : "N/A"} />
                <Kpi icon={IndianRupee} label="Total Earnings" value={performance ? money(performance.totalEarnings) : "N/A"} />
                <Kpi icon={Wallet} label="Pending Payout" value={performance ? money(performance.pendingPayout) : "N/A"} />
                <Kpi
                  icon={Users}
                  label="Total Leads"
                  value={
                    performance?.totalLeads == null
                      ? "N/A"
                      : String(performance.totalLeads)
                  }
                />
              </div>

              <section className="rounded-xl border border-slate-100 p-3.5">
                <h3 className="text-sm font-semibold text-slate-900">Enrollment</h3>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Info label="Brand" value={textOrNA(brand)} />
                  <Info label="Membership" value={textOrNA(profile?.membershipType)} />
                  <Info
                    label="Sailor share"
                    value={
                      profile?.sailorSharePercent == null
                        ? "N/A"
                        : `${profile.sailorSharePercent}%`
                    }
                  />
                  <Info
                    label="Platform share"
                    value={
                      profile?.platformSharePercent == null
                        ? "N/A"
                        : `${profile.platformSharePercent}%`
                    }
                  />
                  <Info
                    label="Categories"
                    value={
                      profile?.categories?.length
                        ? profile.categories.join(", ")
                        : "N/A"
                    }
                  />
                  <Info label="Prosite" value={textOrNA(profile?.prositeUrl)} />
                </dl>
              </section>

              <section className="rounded-xl border border-slate-100 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Products</h3>
                  <span className="text-xs font-medium text-slate-400">
                    {details ? `${details.products.length} listed` : "N/A"}
                  </span>
                </div>
                {!details || details.products.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">
                    {details ? "No products added." : "N/A"}
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs text-slate-500">
                          <th className="pb-2 pr-3 font-semibold">Product</th>
                          <th className="pb-2 pr-3 font-semibold">Category</th>
                          <th className="pb-2 pr-3 text-right font-semibold">Price</th>
                          <th className="pb-2 pr-3 text-right font-semibold">Sold</th>
                          <th className="pb-2 text-right font-semibold">Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {details.products.map((product) => (
                          <tr key={product.id}>
                            <td className="py-2 pr-3 font-medium text-slate-800">
                              {textOrNA(product.name)}
                            </td>
                            <td className="py-2 pr-3 text-slate-600">
                              {textOrNA(product.category)}
                            </td>
                            <td className="py-2 pr-3 text-right text-slate-700">
                              {money(product.price)}
                            </td>
                            <td className="py-2 pr-3 text-right text-slate-700">
                              {product.sold}
                            </td>
                            <td className="py-2 text-right font-medium text-slate-800">
                              {money(product.sales)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-100 p-3.5">
                <h3 className="text-sm font-semibold text-slate-900">Payouts</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Info
                    label="Available balance"
                    value={performance ? money(performance.availableBalance) : "N/A"}
                  />
                  <Info
                    label="Pending"
                    value={performance ? money(performance.pendingPayout) : "N/A"}
                  />
                  <Info
                    label="Completed"
                    value={performance ? money(performance.completedPayout) : "N/A"}
                  />
                </div>
                {details && details.payouts.length > 0 ? (
                  <ul className="mt-3 divide-y divide-slate-50">
                    {details.payouts.map((payout) => (
                      <li
                        key={payout.id}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">
                            {money(payout.amount)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDate(payout.at)}
                            {payout.method ? ` · ${payout.method.toUpperCase()}` : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(payout.status)}`}
                        >
                          {statusLabel(payout.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    {details ? "No payout requests yet." : "N/A"}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-slate-100 p-3.5">
                <h3 className="text-sm font-semibold text-slate-900">Recent activity</h3>
                {!details || details.activity.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">
                    {details ? "No sales, leads, or payouts yet." : "N/A"}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {details.activity.map((item, index) => (
                      <li
                        key={`${item.kind}-${item.at}-${index}`}
                        className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-500">
                          {item.kind === "sale" ? (
                            <Package className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDate(item.at)}
                            {item.detail ? ` · ${item.detail}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-slate-800">
                          {money(item.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800 break-words">
        {value}
      </dd>
    </div>
  );
}
