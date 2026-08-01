import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import Swal from "sweetalert2";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleCreateAnnouncement,
  handleGetAllCustomers,
  handleGetCustomers,
  type CreateAnnouncementPayload,
} from "@/services/apiClient";

type CustomerOption = {
  _id: string;
  name: string;
  mobile?: string;
  whatsappNumber?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
};

export default function SendAnnouncementModal({
  open,
  onClose,
  onSent,
}: Props) {
  const [templateName, setTemplateName] = useState("");
  // Exact Meta template name (no spaces). Default matches approved template.
  const [whatsappTemplateName, setWhatsappTemplateName] = useState("newcafe");
  const [languageCode, setLanguageCode] = useState("en");
  const [templateParamsRaw, setTemplateParamsRaw] = useState("");
  const [headerImageLink, setHeaderImageLink] = useState("");
  const [audienceType, setAudienceType] = useState<"all" | "selected">("selected");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedSearch = useDebounce(customerSearch.trim(), 300);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  /** Keeps names for selected chips even after search/list changes */
  const [customerDirectory, setCustomerDirectory] = useState<
    Record<string, CustomerOption>
  >({});
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const mergeDirectory = (list: CustomerOption[]) => {
    setCustomerDirectory((prev) => {
      const next = { ...prev };
      for (const c of list) {
        if (c?._id) next[c._id] = c;
      }
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoadingCustomers(true);
        const res = await handleGetCustomers(
          debouncedSearch,
          controller.signal,
          50,
          1,
        );
        const list = Array.isArray(res?.customers) ? res.customers : [];
        setCustomers(list);
        mergeDirectory(list);
      } catch {
        if (!controller.signal.aborted) setCustomers([]);
      } finally {
        if (!controller.signal.aborted) setLoadingCustomers(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [open, debouncedSearch]);

  const selectedCustomers = useMemo(() => {
    return selectedIds.map(
      (id) =>
        customerDirectory[id] ||
        customers.find((c) => c._id === id) || {
          _id: id,
          name: id,
          mobile: "",
        },
    );
  }, [customerDirectory, customers, selectedIds]);

  const toggleCustomer = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllVisible = () => {
    const ids = customers.map((c) => c._id);
    mergeDirectory(customers);
    setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
  };

  /** Fetch every matching customer, select all — then uncheck unwanted ones */
  const selectAllCustomers = async () => {
    try {
      setSelectingAll(true);
      const res = await handleGetAllCustomers(debouncedSearch);
      const list: CustomerOption[] = Array.isArray(res?.customers)
        ? res.customers
        : [];
      if (!list.length) {
        Swal.fire("No customers", "No customers found to select.", "info");
        return;
      }
      mergeDirectory(list);
      setCustomers(list);
      setSelectedIds(list.map((c) => c._id));
    } catch {
      Swal.fire(
        "Select all failed",
        "Could not load all customers. Try again.",
        "error",
      );
    } finally {
      setSelectingAll(false);
    }
  };

  const clearSelected = () => setSelectedIds([]);

  const resetForm = () => {
    setTemplateName("");
    setWhatsappTemplateName("newcafe");
    setLanguageCode("en");
    setTemplateParamsRaw("");
    setHeaderImageLink("");
    setAudienceType("selected");
    setSelectedIds([]);
    setCustomerSearch("");
    setCustomerDirectory({});
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  /** Meta names: lowercase letters/numbers/underscore only ("new cafe" → "newcafe") */
  const normalizeMetaTemplateName = (raw: string) =>
    raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9_]/g, "");

  const handleSubmit = async () => {
    const metaName = normalizeMetaTemplateName(whatsappTemplateName);
    const displayName = templateName.trim() || metaName;

    if (!displayName || !metaName) {
      Swal.fire(
        "Missing fields",
        "Template display name and WhatsApp template name are required.",
        "warning",
      );
      return;
    }

    if (metaName !== whatsappTemplateName.trim()) {
      // Keep UI in sync if user typed "new cafe" / "New Cafe"
      setWhatsappTemplateName(metaName);
    }

    if (audienceType === "selected" && selectedIds.length === 0) {
      Swal.fire(
        "No recipients",
        "Select at least one customer, or choose All customers.",
        "warning",
      );
      return;
    }

    const templateParams = templateParamsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: CreateAnnouncementPayload = {
      templateName: displayName,
      audienceType,
      selectedCustomerIds:
        audienceType === "selected" ? selectedIds : [],
      whatsappTemplateName: metaName,
      languageCode: languageCode.trim() || "en",
      templateParams,
      headerImageLink: headerImageLink.trim(),
    };

    try {
      setSubmitting(true);
      const res = await handleCreateAnnouncement(payload);
      await Swal.fire(
        "Queued",
        res?.message || "Announcement queued successfully.",
        "success",
      );
      resetForm();
      onClose();
      onSent?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Send failed",
        err?.response?.data?.message || "Could not queue announcement.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Send Announcement
            </h2>
            <p className="text-xs text-slate-500">
              Queue WhatsApp template to all customers or selected ones.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Display name (table)
              </label>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. New Cafe Invite"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                WhatsApp template name <span className="text-rose-500">*</span>
              </label>
              <input
                value={whatsappTemplateName}
                onChange={(e) => setWhatsappTemplateName(e.target.value)}
                onBlur={() =>
                  setWhatsappTemplateName(
                    normalizeMetaTemplateName(whatsappTemplateName) || "newcafe",
                  )
                }
                placeholder="Exact Meta name, e.g. newcafe"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Must match Meta exactly — no spaces (use <code>newcafe</code>, not
                &quot;new cafe&quot;).
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Language code
              </label>
              <input
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                placeholder="en or en_US"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Body params (comma separated)
              </label>
              <input
                value={templateParamsRaw}
                onChange={(e) => setTemplateParamsRaw(e.target.value)}
                placeholder="Leave empty if template has no {{1}}"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Header image URL (HTTPS) — optional override
              </label>
              <input
                value={headerImageLink}
                onChange={(e) => setHeaderImageLink(e.target.value)}
                placeholder="Leave empty to send Client/.../newcafe.jpeg"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                By default every <code>newcafe</code> send uses{' '}
                <code>Client/src/assets/images/logo/newcafe.jpeg</code> as the
                WhatsApp IMAGE header (All and Selected).
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              Audience
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAudienceType("all")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                  audienceType === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                All customers
              </button>
              <button
                type="button"
                onClick={() => setAudienceType("selected")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                  audienceType === "selected"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Selected customers
              </button>
            </div>
          </div>

          {audienceType === "selected" ? (
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  Select customers{" "}
                  <span className="font-normal text-slate-500">
                    ({selectedIds.length} selected)
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void selectAllCustomers()}
                    disabled={selectingAll || loadingCustomers}
                    className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
                    title="Select every customer, then uncheck the ones you want to skip"
                  >
                    {selectingAll ? "Selecting all..." : "Select all"}
                  </button>
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    disabled={loadingCustomers || customers.length === 0}
                    className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Select visible
                  </button>
                  <button
                    type="button"
                    onClick={clearSelected}
                    disabled={selectedIds.length === 0}
                    className="text-xs font-semibold text-slate-500 hover:underline disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <p className="mb-2 text-[11px] text-slate-400">
                Use <b>Select all</b>, then uncheck customers you do not want to
                message.
              </p>

              <div className="relative mb-3">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or mobile..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                />
              </div>

              {selectedIds.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {selectedCustomers.slice(0, 12).map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => toggleCustomer(c._id)}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700"
                      title="Click to remove"
                    >
                      {c.name || c._id}
                      <X size={12} />
                    </button>
                  ))}
                  {selectedIds.length > 12 ? (
                    <span className="text-[11px] text-slate-500">
                      +{selectedIds.length - 12} more
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-100">
                {loadingCustomers || selectingAll ? (
                  <p className="p-3 text-sm text-slate-500">
                    {selectingAll
                      ? "Loading all customers..."
                      : "Loading customers..."}
                  </p>
                ) : customers.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No customers found.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {customers.map((c) => {
                      const checked = selectedIds.includes(c._id);
                      const phone = c.whatsappNumber || c.mobile || "—";
                      return (
                        <li key={c._id}>
                          <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCustomer(c._id)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {c.name || "Unnamed"}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {phone}
                              </p>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This will queue WhatsApp for <b>all customers</b> in the database
              that have a mobile / WhatsApp number.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Queuing..." : "Send Announcement"}
          </button>
        </div>
      </div>
    </div>
  );
}
