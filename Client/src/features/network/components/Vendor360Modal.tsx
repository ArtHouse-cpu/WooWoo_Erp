import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Download,
  Phone,
  Scale,
  Search,
  Wallet,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  handleGetVendor360,
  handleRecordVendorPayment,
  type Vendor360Response,
  type VendorBillRow,
  type VendorPaymentRow,
} from "@/services/apiClient";
import type { VendorDetails } from "./VendorDetailsModal";

type Tab = "overview" | "purchases" | "orders" | "payments";

const money = (value?: number | null) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const when = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const tone = (status: string, overdue?: boolean) => {
  if (overdue) return "bg-rose-50 text-rose-700";
  if (status === "paid") return "bg-emerald-50 text-emerald-700";
  if (status === "partial") return "bg-amber-50 text-amber-800";
  if (status === "due" || status === "pending") return "bg-orange-50 text-orange-800";
  return "bg-slate-100 text-slate-600";
};

function downloadReceipt(vendorName: string, payment: VendorPaymentRow) {
  const lines = [
    "Vendor payment receipt",
    `Vendor: ${vendorName}`,
    `Receipt: ${payment.id.slice(-8).toUpperCase()}`,
    `Type: ${payment.direction}`,
    `Amount: ${money(payment.amount)}`,
    payment.appliedAmount ? `Applied to bill: ${money(payment.appliedAmount)}` : "",
    payment.advanceAmount ? `Advance: ${money(payment.advanceAmount)}` : "",
    payment.purchaseInvoice ? `Bill: ${payment.purchaseInvoice}` : "",
    payment.method ? `Method: ${payment.method}` : "",
    payment.reference ? `Reference: ${payment.reference}` : "",
    `Date: ${when(payment.paidAt)}`,
    payment.createdBy ? `Recorded by: ${payment.createdBy}` : "",
    payment.note ? `Note: ${payment.note}` : "",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vendor-receipt-${payment.id.slice(-6)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Vendor360Modal({
  vendor,
  onClose,
  onChanged,
}: {
  vendor: VendorDetails & { _id: string };
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Vendor360Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    direction: "pay-out" as "pay-out" | "pay-in" | "adjustment",
    adjustmentEffect: "decrease" as "increase" | "decrease",
    amount: "",
    method: "Cash",
    reference: "",
    note: "",
    paidAt: new Date().toISOString().slice(0, 10),
    purchaseId: "",
  });

  const load = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const next = await handleGetVendor360(vendor._id, signal);
      setData(next);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "CanceledError") return;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not load this vendor.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [vendor._id]);

  const summary = data?.summary;
  const profile = data?.vendor;
  const bills = tab === "orders" ? data?.orders || [] : tab === "purchases" ? data?.purchases || [] : [];
  const filteredBills = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bills.filter(row => {
      if (status && row.status !== status && !(status === "overdue" && row.overdue)) return false;
      if (!term) return true;
      return row.invoiceNumber.toLowerCase().includes(term);
    });
  }, [bills, search, status]);
  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.payments || []).filter(row => {
      if (status && row.direction !== status) return false;
      if (!term) return true;
      return `${row.reference} ${row.purchaseInvoice} ${row.note}`.toLowerCase().includes(term);
    });
  }, [data?.payments, search, status]);

  const openBills = (data?.purchases || []).filter(row => row.dueAmount > 0);

  const submitPayment = async () => {
    const amount = Number(form.amount);
    if (!(amount > 0)) {
      await Swal.fire("Amount required", "Enter an amount greater than zero.", "warning");
      return;
    }
    const confirm = await Swal.fire({
      title: "Record this payment?",
      text: `${form.direction} of ${money(amount)}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Record",
    });
    if (!confirm.isConfirmed) return;
    try {
      setSaving(true);
      await handleRecordVendorPayment(vendor._id, {
        direction: form.direction,
        adjustmentEffect: form.direction === "adjustment" ? form.adjustmentEffect : undefined,
        amount,
        method: form.direction === "adjustment" ? undefined : form.method,
        reference: form.reference,
        note: form.note,
        paidAt: form.paidAt,
        purchaseId: form.purchaseId || undefined,
        clientKey: crypto.randomUUID(),
      });
      setPayOpen(false);
      setForm(current => ({ ...current, amount: "", reference: "", note: "", purchaseId: "" }));
      await load();
      onChanged?.();
      await Swal.fire({ icon: "success", title: "Payment recorded", timer: 1400, showConfirmButton: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not record the payment.";
      await Swal.fire("Payment failed", message, "error");
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { label: "Total payable", value: money(summary?.payable), hint: "Opening + purchases − returns" },
    { label: "Paid on bills", value: money(summary?.paidOnBills), hint: `${money(summary?.paidOut)} recorded as pay-out` },
    { label: "Pending dues", value: money(summary?.pending), hint: summary?.credit ? `Credit ${money(summary.credit)}` : "Still owed to the vendor" },
    { label: "Overdue", value: money(summary?.overdue), hint: `${summary?.purchaseCount || 0} bills · ${summary?.orderCount || 0} orders` },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="flex h-dvh w-full max-w-6xl flex-col overflow-hidden bg-[#F6F7FB] sm:h-[92vh] sm:rounded-2xl sm:shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">Vendor 360</p>
            <h2 className="truncate text-lg font-bold text-slate-900">{profile?.name || vendor.name}</h2>
            <p className="truncate text-xs text-slate-500">
              {profile?.companyName || vendor.companyName || "No company"} · {profile?.mobile || vendor.mobile}
              {profile?.isActive === false ? " · Inactive" : " · Active"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Can permission={PERMISSIONS.VENDOR_UPDATE}>
              <button
                type="button"
                onClick={() => setPayOpen(true)}
                className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white"
              >
                Record payment
              </button>
            </Can>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
          {(
            [
              ["overview", "Overview"],
              ["purchases", "Purchases"],
              ["orders", "Orders"],
              ["payments", "Payments"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setSearch("");
                setStatus("");
              }}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${
                tab === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          {loading ? <p className="text-sm text-slate-500">Loading vendor…</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {!loading && data && tab === "overview" ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(card => (
                  <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
                  </article>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Building2 size={16} /> Profile</h3>
                  <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <Field label="Phone" value={profile?.mobile} />
                    <Field label="WhatsApp" value={profile?.whatsappNumber} />
                    <Field label="Email" value={profile?.email} />
                    <Field label="GSTIN" value={profile?.gstin} />
                    <Field label="City" value={[profile?.city, profile?.state].filter(Boolean).join(", ")} />
                    <Field label="UPI" value={profile?.UPIID} />
                  </dl>
                  <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                    <Phone size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    {[profile?.billingAddress1, profile?.address, profile?.pincode].filter(Boolean).join(", ") || "No address"}
                  </p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Wallet size={16} /> Balance</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li className="flex justify-between"><span>Opening balance</span><span className="font-semibold">{money(summary?.openingBalance)}</span></li>
                    <li className="flex justify-between"><span>Purchases</span><span className="font-semibold">{money(summary?.purchaseTotal)}</span></li>
                    <li className="flex justify-between"><span>Returns</span><span className="font-semibold">{money(summary?.returnTotal)}</span></li>
                    <li className="flex justify-between"><span>Paid on bills</span><span className="font-semibold">{money(summary?.paidOnBills)}</span></li>
                    <li className="flex justify-between"><span>Advance paid</span><span className="font-semibold">{money(summary?.advance)}</span></li>
                    <li className="flex justify-between"><span>Pay-in received</span><span className="font-semibold">{money(summary?.payIn)}</span></li>
                    <li className="flex justify-between border-t border-slate-100 pt-2 text-slate-900"><span className="flex items-center gap-1"><Scale size={14} /> Outstanding</span><span className="font-bold">{money(summary?.outstanding)}</span></li>
                  </ul>
                </article>
              </div>
            </div>
          ) : null}

          {!loading && data && (tab === "purchases" || tab === "orders") ? (
            <BillTable
              rows={filteredBills}
              search={search}
              status={status}
              onSearch={setSearch}
              onStatus={setStatus}
              empty={tab === "orders" ? "No purchase orders for this vendor." : "No purchases for this vendor."}
            />
          ) : null}

          {!loading && data && tab === "payments" ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search reference or bill" className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-sm" />
                </label>
                <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">All types</option>
                  <option value="pay-out">Pay-out</option>
                  <option value="pay-in">Pay-in</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              {filteredPayments.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredPayments.map(payment => (
                    <li key={payment.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          {payment.direction === "pay-in" ? <ArrowDownLeft size={15} className="text-emerald-600" /> : <ArrowUpRight size={15} className="text-violet-600" />}
                          {payment.direction} · {money(payment.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {when(payment.paidAt)}
                          {payment.method ? ` · ${payment.method}` : ""}
                          {payment.reference ? ` · ${payment.reference}` : ""}
                          {payment.purchaseInvoice ? ` · ${payment.purchaseInvoice}` : ""}
                          {payment.advanceAmount ? ` · Advance ${money(payment.advanceAmount)}` : ""}
                        </p>
                      </div>
                      <button type="button" onClick={() => downloadReceipt(profile?.name || vendor.name, payment)} className="inline-flex items-center gap-1 self-start rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        <Download size={13} /> Receipt
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>

      {payOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Record payment</h3>
            <p className="mt-1 text-sm text-slate-500">Pay-out settles a bill or stays as an advance. Pay-in is money received from the vendor. An adjustment corrects the outstanding balance.</p>
            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                {(["pay-out", "pay-in", "adjustment"] as const).map(direction => (
                  <button key={direction} type="button" onClick={() => setForm(current => ({ ...current, direction, purchaseId: direction === "pay-out" ? current.purchaseId : "" }))} className={`rounded-xl px-2 py-2 text-xs font-bold ${form.direction === direction ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {direction}
                  </button>
                ))}
              </div>
              {form.direction === "adjustment" ? (
                <select value={form.adjustmentEffect} onChange={event => setForm(current => ({ ...current, adjustmentEffect: event.target.value as "increase" | "decrease" }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="decrease">Decrease outstanding</option>
                  <option value="increase">Increase outstanding</option>
                </select>
              ) : (
                <select value={form.method} onChange={event => setForm(current => ({ ...current, method: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {["Cash", "UPI", "Card", "Bank", "Other"].map(method => <option key={method}>{method}</option>)}
                </select>
              )}
              <input type="number" min={0} value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} placeholder="Amount" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input type="date" value={form.paidAt} onChange={event => setForm(current => ({ ...current, paidAt: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              {form.direction === "pay-out" ? (
                <select value={form.purchaseId} onChange={event => setForm(current => ({ ...current, purchaseId: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Advance — do not apply to a bill</option>
                  {openBills.map(bill => (
                    <option key={bill.id} value={bill.id}>
                      {bill.invoiceNumber} · due {money(bill.dueAmount)}
                    </option>
                  ))}
                </select>
              ) : null}
              <input value={form.reference} onChange={event => setForm(current => ({ ...current, reference: event.target.value }))} placeholder="Transaction reference" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={form.note} onChange={event => setForm(current => ({ ...current, note: event.target.value }))} rows={2} placeholder="Note" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPayOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void submitPayment()} className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function BillTable({
  rows,
  search,
  status,
  onSearch,
  onStatus,
  empty,
}: {
  rows: VendorBillRow[];
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={event => onSearch(event.target.value)} placeholder="Search invoice number" className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-sm" />
        </label>
        <select value={status} onChange={event => onStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="due">Due</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              {["Invoice", "Date", "Total", "Paid", "Due", "Status"].map(label => (
                <th key={label} className="px-3 py-3 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">{empty}</td></tr>
            ) : rows.map(row => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-3 font-semibold">{row.invoiceNumber || "—"}</td>
                <td className="px-3 py-3">{when(row.invoiceDate)}</td>
                <td className="px-3 py-3">{money(row.amount)}</td>
                <td className="px-3 py-3">{money(row.paidAmount)}</td>
                <td className="px-3 py-3">{money(row.dueAmount)}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone(row.status, row.overdue)}`}>
                    {row.overdue ? "Overdue" : row.status || "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
