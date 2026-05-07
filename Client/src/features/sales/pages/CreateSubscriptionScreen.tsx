import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleCreateCustomer,
  handleCreateSubscription,
  handleGetMemberships,
  handleUpdateCustomer,
  handleUpdateSubscription,
  handleGetCustomers,
  type CustomerPayload,
} from "@/services/apiClient";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";
import { printThermalReceipt } from "@/utils/printUtils";
import { Printer, X } from "lucide-react";

const today = new Date().toISOString().split("T")[0];
const SUBSCRIPTION_SEQ_KEY = "wooerp-subscription-seq";

const getNextSubscriptionNumber = (): string => {
  const fallback = 1000;
  try {
    const currentRaw = localStorage.getItem(SUBSCRIPTION_SEQ_KEY);
    const current = currentRaw ? Number(currentRaw) : fallback;
    const next = Number.isFinite(current) ? current + 1 : fallback + 1;
    localStorage.setItem(SUBSCRIPTION_SEQ_KEY, String(next));
    return String(next);
  } catch {
    return String(fallback + 1);
  }
};

type Mode = "create" | "edit" | "view";
type RepeatType = "weekly" | "monthly" | "yearly";
type MembershipOption = {
  _id: string;
  planId: string;
  displayName: string;
  amount: number;
  period: string;
};

export default function CreateSubscriptionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("create");
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [subscriptionNo, setSubscriptionNo] = useState(
    getNextSubscriptionNumber(),
  );
  const [customer, setCustomer] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [repeatType, setRepeatType] = useState<RepeatType>("monthly");
  const staff = useAppSelector((state) => state.user);
  const staffName = useAppSelector((state) => state.user.m_staff_name);
  const salesPerson = staffName ?? "Not Assigned";
  const [notes, setNotes] = useState("");
  const [openCheckout, setOpenCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{ _id: string; name: string; mobile: string; companyName?: string }>
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(true);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [memberships, setMemberships] = useState<MembershipOption[]>([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");

  useEffect(() => {
    type Line = {
      productName?: string;
      qty?: number;
      unitPrice?: number;
      discount?: number;
    };
    type Doc = {
      _id?: string;
      subscriptionCode?: string;
      invoiceCode?: string;
      customerName?: string;
      customerPhone?: string;
      invoiceDate?: string;
      dueDate?: string;
      repeatType?: string;
      repeatEvery?: number | string | null;
      repeatUnit?: string | null;
      notes?: string;
      items?: Line[];
    };
    const state = location.state as {
      mode?: Mode;
      subscription?: Doc;
    } | null;

    const applyDoc = (doc: Doc, nextMode: Mode) => {
      setMode(nextMode);
      if (doc._id) setSubscriptionId(String(doc._id));
      if (doc.subscriptionCode) setSubscriptionNo(String(doc.subscriptionCode));
      else if (doc.invoiceCode) setSubscriptionNo(String(doc.invoiceCode));
      setCustomer(doc.customerName || "");
      setSelectedCustomerId("");
      setPhone(doc.customerPhone || "");
      if (doc.invoiceDate) {
        setStartDate(new Date(doc.invoiceDate).toISOString().split("T")[0]);
      }
      if (doc.dueDate) {
        setEndDate(new Date(doc.dueDate).toISOString().split("T")[0]);
      }
      const rawType = String(doc.repeatType ?? "").toLowerCase();
      if (rawType === "weekly") {
        setRepeatType("weekly");
      } else if (
        rawType === "yearly" ||
        String(doc.repeatUnit ?? "").toLowerCase() === "year"
      ) {
        setRepeatType("yearly");
      } else {
        setRepeatType("monthly");
      }
      setNotes(doc.notes || "");
    };

    if (state?.subscription) {
      applyDoc(state.subscription, state.mode ?? "edit");
    }
  }, [location.state]);
  const selectedMembership = useMemo(
    () => memberships.find((m) => m._id === selectedMembershipId) ?? null,
    [memberships, selectedMembershipId],
  );
  const subTotal = selectedMembership?.amount ?? 0;
  const discountTotal = 0;
  const grandTotal = subTotal;

  const buildPayload = (status: "draft" | "active") => {
    const repeatUnit: "month" | "year" | null =
      repeatType === "yearly" ? "year" : "month";
    const repeatEvery = repeatType === "weekly" ? 1 : 1;

    return {
      customerName: customer.trim(),
      customerPhone: phone.trim(),
      invoiceDate: startDate,
      dueDate: endDate,
      repeatType,
      repeatEvery,
      repeatUnit,
      salesPersonName: salesPerson,
      notes: notes.trim(),
      items: selectedMembership
        ? [
            {
              productName: selectedMembership.displayName,
              qty: 1,
              unitPrice: selectedMembership.amount,
              discount: 0,
            },
          ]
        : [],
      subTotal,
      discountTotal,
      grandTotal,
      status,
      createdBy: {
        m_staff_id: staff.m_staff_id,
        m_staff_name: staff.m_staff_name,
        m_staff_email: staff.m_staff_email,
      },
    };
  };

  const validateBeforeCheckout = () => {
    if (!customer.trim()) {
      Swal.fire(
        "Customer required",
        "Please select or enter customer.",
        "warning",
      );
      return false;
    }
    if (!phone.trim()) {
      Swal.fire(
        "Phone required",
        "Please enter customer phone number.",
        "warning",
      );
      return false;
    }
    if (endDate < startDate) {
      Swal.fire(
        "Invalid end date",
        "End date cannot be before start date.",
        "warning",
      );
      return false;
    }
    if (!selectedMembership) {
      Swal.fire(
        "Membership required",
        "Please select a membership plan.",
        "warning",
      );
      return false;
    }
    return true;
  };

  const fetchCustomers = async (searchText = "", signal?: AbortSignal) => {
    try {
      setLoadingCustomers(true);
      const response = await handleGetCustomers(searchText, signal);
      setCustomers(
        Array.isArray(response?.customers) ? response.customers : [],
      );
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const debouncedCustomer = useDebounce(customer.trim(), 250);

  useEffect(() => {
    if (!customerDropdownOpen) return;

    const term = debouncedCustomer;
    if (!term) {
      setCustomers([]);
      setLoadingCustomers(false);
      return;
    }

    const controller = new AbortController();
    fetchCustomers(term, controller.signal);

    return () => {
      controller.abort();
    };
  }, [debouncedCustomer, customerDropdownOpen]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchMemberships = async () => {
      try {
        setLoadingMemberships(true);
        const response = await handleGetMemberships(
          { status: "Active" },
          controller.signal,
        );
        const list = Array.isArray(response?.memberships)
          ? response.memberships
          : [];
        const mapped: MembershipOption[] = list
          .map((m: Record<string, any>) => ({
            _id: String(m?._id ?? m?.planId ?? ""),
            planId: String(m?.planId ?? ""),
            displayName: String(m?.displayName ?? m?.planId ?? "Membership"),
            amount: Number(m?.pricing?.amount ?? 0),
            period: String(m?.pricing?.period ?? "monthly"),
          }))
          .filter((m: MembershipOption) => Boolean(m._id));
        setMemberships(mapped);
      } catch {
        setMemberships([]);
      } finally {
        setLoadingMemberships(false);
      }
    };
    void fetchMemberships();
    return () => controller.abort();
  }, []);

  const handleCreateCustomerSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    try {
      setCreatingCustomer(true);
      const response = await handleCreateCustomer({
        ...args.payload,
        createdBy: {
          m_staff_id: staff.m_staff_id,
          m_staff_name: staff.m_staff_name,
          m_staff_email: staff.m_staff_email,
        },
      });
      const created = response?.customer;
      if (created?.name) {
        setSelectedCustomerId(String(created._id ?? ""));
        setCustomer(String(created.name));
        setPhone(String(created.mobile ?? ""));
      }
      setShowCreateCustomerModal(false);
      await fetchCustomers();
      Swal.fire("Customer created", "Customer saved successfully.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create customer. Try again.",
        "error",
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSaveSubscription = async (payment: {
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
  }) => {
    try {
      setSaving(true);
      const payload = {
        ...buildPayload("active"),
        subscriptionCode: subscriptionNo,
        mode: payment.mode,
        paymentStatus: payment.paymentStatus,
        paymentBreakdown: payment.paymentBreakdown,
      };
      if (mode === "edit" && subscriptionId) {
        await handleUpdateSubscription(
          subscriptionId,
          payload as Parameters<typeof handleUpdateSubscription>[1],
        );
        if (selectedCustomerId && selectedMembership) {
          await handleUpdateCustomer(selectedCustomerId, {
            membershipType: selectedMembership.planId || selectedMembership.displayName,
          });
        }
        printThermalReceipt({
          invoiceNo: subscriptionNo,
          customerName: customer.trim(),
          customerPhone: phone.trim(),
          items: [
            {
              name: selectedMembership?.displayName ?? "Membership",
              qty: 1,
              price: selectedMembership?.amount ?? 0,
              discount: 0,
            },
          ],
          totalMRP: grandTotal,
          discountTotal,
          finalAmount: grandTotal,
          totalDue: payment.paymentBreakdown.dueAmount,
          totalQty: 1,
        });
        Swal.fire("Updated", "Subscription updated successfully.", "success").then(
          () => navigate(-1),
        );
        return;
      }
      const response = await handleCreateSubscription(payload as any);
      if (selectedCustomerId && selectedMembership) {
        await handleUpdateCustomer(selectedCustomerId, {
          membershipType: selectedMembership.planId || selectedMembership.displayName,
        });
      }
      const savedCode = String(
        response?.subscription?.subscriptionCode ?? subscriptionNo,
      );
      printThermalReceipt({
        invoiceNo: savedCode,
        customerName: customer.trim(),
        customerPhone: phone.trim(),
        items: [
          {
            name: selectedMembership?.displayName ?? "Membership",
            qty: 1,
            price: selectedMembership?.amount ?? 0,
            discount: 0,
          },
        ],
        totalMRP: grandTotal,
        discountTotal,
        finalAmount: grandTotal,
        totalDue: payment.paymentBreakdown.dueAmount,
        totalQty: 1,
      });
      Swal.fire(
        "Saved",
        `Subscription ${savedCode} saved successfully.`,
        "success",
      ).then(() => navigate(-1));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save subscription.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) navigate(-1);
      }}
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {mode === "edit" ? "Edit Subscription" : "Create Subscription"}
            </h2>
            <p className="text-xs text-gray-500">
              Invoice No: <span className="font-semibold">{subscriptionNo}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Customer
              </label>
              <input
                value={customer}
                onChange={(e) => {
                  setCustomer(e.target.value);
                  setSelectedCustomerId("");
                  setPhone("");
                  setCustomerDropdownOpen(true);
                }}
                onFocus={() => setCustomerDropdownOpen(true)}
                placeholder="Search customer by name or phone"
                className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
              />
              {customerDropdownOpen && (loadingCustomers || customers.length > 0) && (
                <div className="mt-1 max-h-40 overflow-auto rounded-md border border-gray-200 bg-white">
                  {loadingCustomers ? (
                    <div className="p-2 text-sm text-gray-500">Searching...</div>
                  ) : (
                    customers.map((selectedCustomer) => (
                      <button
                        key={selectedCustomer._id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(selectedCustomer._id);
                          setCustomer(selectedCustomer.name);
                          setPhone(selectedCustomer.mobile);
                          setCustomerDropdownOpen(false);
                        }}
                        className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-800">
                          {selectedCustomer.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedCustomer.mobile}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowCreateCustomerModal(true)}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                + Add New Customer
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Phone Number
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Customer phone number"
                className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Sales Person
              </label>
              <input
                value={salesPerson}
                disabled
                className="h-10 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Repeat Type
              </label>
              <select
                value={repeatType}
                onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Membership Plan
            </label>
            <select
              value={selectedMembershipId}
              onChange={(e) => setSelectedMembershipId(e.target.value)}
              className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">
                {loadingMemberships
                  ? "Loading memberships..."
                  : "Select membership plan"}
              </option>
              {memberships.map((m) => (
                <option key={m._id} value={m._id}>
                  {`${m.displayName} • ₹${m.amount.toLocaleString("en-IN")} / ${m.period} • ${m.planId}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[72px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Add notes for this subscription..."
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Invoice Number</span>
              <span className="font-semibold text-gray-800">{subscriptionNo}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Amount</span>
              <span className="text-lg font-semibold text-gray-900">
                ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (validateBeforeCheckout()) setOpenCheckout(true);
            }}
            disabled={saving || mode === "view"}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={16} />
            Checkout
          </button>
        </div>
      </div>

      {showCreateCustomerModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateCustomerModal(false)}
          onSubmit={handleCreateCustomerSubmit}
          loading={creatingCustomer}
        />
      )}

      <CheckoutModal
        open={openCheckout}
        grandTotal={grandTotal}
        items={
          selectedMembership
            ? [
                {
                  id: 1,
                  name: selectedMembership.displayName,
                  qty: 1,
                  price: selectedMembership.amount,
                  discount: 0,
                },
              ]
            : []
        }
        initialCustomerName={customer}
        initialCustomerPhone={phone}
        initialMembership={selectedMembership?.displayName ?? ""}
        onClose={() => setOpenCheckout(false)}
        onConfirmPayment={async (payment) => {
          setOpenCheckout(false);
          await handleSaveSubscription(payment);
        }}
      />
      {mode === "view" && (
        <div className="pointer-events-none fixed inset-0 z-[55] rounded-2xl bg-transparent" />
      )}
    </div>
  );
}
