import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import CreateInvoiceHeader from "../components/invoice/CreateInvoiceHeader";
import InvoiceDetailsSection from "../components/invoice/InvoiceDetailsSection";
import InvoiceSummaryCard from "../components/invoice/InvoiceSummaryCard";
import NotesSection from "../components/invoice/NotesSection";
import ProductsServicesSection from "../components/invoice/ProductsServicesSection";
import type { InvoiceItem } from "../components/invoice/types";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleCreateCustomer,
  handleCreateInvoice,
  handleUpdateInvoice,
  handleGetCustomers,
  handleGetCustomerById,
  handleGetMemberships,
  type CustomerPayload,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";
import {
  calcStackedLineBenefits,
  membershipBenefitsForLine,
  resolveMembershipPlan,
  toMembershipPlanId,
} from "../utils/membershipInvoiceUtils";
import { creditWalletCashback } from "../utils/walletCashback";

const today = new Date().toISOString().split("T")[0];
const INVOICE_SEQ_KEY = "wooerp-invoice-seq";

const getNextInvoiceNumber = (): string => {
  const fallback = 10975;
  try {
    const currentRaw = localStorage.getItem(INVOICE_SEQ_KEY);
    const current = currentRaw ? Number(currentRaw) : fallback;
    const next = Number.isFinite(current) ? current + 1 : fallback + 1;
    localStorage.setItem(INVOICE_SEQ_KEY, String(next));
    return String(next);
  } catch {
    return String(fallback + 1);
  }
};

type Mode = "create" | "edit" | "view";

export default function CreateInvoiceScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("create");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState(getNextInvoiceNumber());
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [membership, setMembership] = useState("none");
  const [membershipPlanId, setMembershipPlanId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const staff = useAppSelector((state) => state.user);
  const staffName = useAppSelector((state) => state.user.m_staff_name);
  const salesPerson = staffName ?? "Not Assigned";
  const [notes, setNotes] = useState("");
  const [extraCharges, setExtraCharges] = useState<Array<{ label: string; amount: number }>>([]);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{ _id: string; name: string; mobile: string; companyName?: string; membershipType?: string; membershipPlanId?: string }>
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftPrice, setDraftPrice] = useState("0");
  const [draftDiscount, setDraftDiscount] = useState("0");
  const [draftImage, setDraftImage] = useState("");
  const [draftCategory, setDraftCategory] = useState("General");
  const [draftCashback, setDraftCashback] = useState("0");
  const [draftIsCsp, setDraftIsCsp] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlanPayload[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    handleGetMemberships({ status: "Active" }, ac.signal)
      .then((res) => setMembershipPlans(res.memberships || []))
      .catch(() => setMembershipPlans([]));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const state = location.state as { invoice?: any; mode?: Mode } | null;
    if (state?.mode && state?.invoice) {
        setMode(state.mode);
        const inv = state.invoice;
        setInvoiceId(inv._id);
        if (inv.invoiceCode) setInvoiceNo(inv.invoiceCode);
        setCustomer(inv.customerName || "");
        setPhone(inv.customerPhone || "");
        const linkedCustomerId =
          typeof inv.customerId === "object" && inv.customerId
            ? String(inv.customerId._id ?? "")
            : String(inv.customerId ?? "");
        setCustomerId(linkedCustomerId || null);
        // Never open name-search dropdown when opening an existing invoice
        setCustomerDropdownOpen(false);
        setCustomers([]);
        if (inv.invoiceDate) setInvoiceDate(new Date(inv.invoiceDate).toISOString().split("T")[0]);
        if (inv.dueDate) setDueDate(new Date(inv.dueDate).toISOString().split("T")[0]);
        setNotes(inv.notes || "");
        if (Array.isArray(inv.items)) {
            setItems(inv.items.map((item: any, idx: number) => ({
                id: idx + 1,
                productName: item.productName || "",
                qty: item.qty || 1,
                unitPrice: item.unitPrice || 0,
                discount: item.discount || 0,
                cashback: item.isCsp ? 0 : item.cashback || 0,
                image: item.image || item.imageUrl || "",
                category: item.category || "General",
                isCsp: Boolean(item.isCsp),
                cspLabel: item.cspLabel || (item.isCsp ? "CSP" : null),
                productDiscountType: item.productDiscountType,
                productDiscountValue: item.productDiscountValue,
            })));
        }
        if (inv.extraCharges) setExtraCharges(inv.extraCharges);
    }
  }, [location.state]);

  /** Resolve exact CRM customer for view/edit (by invoice customerId, else exact phone). */
  useEffect(() => {
    if (mode === "create") return;
    const phoneTerm = phone.trim();
    const linkedId = String(customerId ?? "").trim();
    if (!linkedId && !phoneTerm) return;

    const controller = new AbortController();
    const applyMatch = (match: {
      _id?: string;
      name?: string;
      mobile?: string;
      membershipType?: string;
      membershipPlanId?: string;
    }) => {
      setCustomer(String(match.name || customer));
      setPhone(String(match.mobile || phone));
      setMembership(String(match.membershipType ?? "none"));
      setMembershipPlanId(toMembershipPlanId(match.membershipPlanId));
      if (match._id) setCustomerId(String(match._id));
      setCustomers([]);
      setCustomerDropdownOpen(false);
    };

    const resolveExactCustomer = async () => {
      try {
        if (linkedId) {
          const byId = await handleGetCustomerById(
            linkedId,
            controller.signal,
          );
          if (byId?.customer?._id) {
            applyMatch(byId.customer);
            return;
          }
        }

        // Legacy invoices without customerId: match by phone only (never by name)
        if (!phoneTerm) return;
        const response = await handleGetCustomers(
          phoneTerm,
          controller.signal,
          50,
          1,
        );
        const list = Array.isArray(response?.customers)
          ? response.customers
          : [];
        const digits = phoneTerm.replace(/\D/g, "");
        const match = list.find((c: { mobile?: string }) => {
          const m = String(c.mobile ?? "").replace(/\D/g, "");
          return m === digits || m.endsWith(digits) || digits.endsWith(m);
        });
        if (match) applyMatch(match);
      } catch {
        // keep invoice-stored name/phone
      }
    };

    void resolveExactCustomer();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, invoiceId, customerId]);
  const draft = {
    name: draftName,
    qty: draftQty,
    price: draftPrice,
    discount: draftDiscount,
    image: draftImage,
    category: draftCategory,
    cashback: draftCashback,
    isCsp: draftIsCsp ? "true" : "false",
  };

  const getMembershipBenefitsForItem = (
    price: number,
    qty: number,
    category: string,
    mType: string,
    mId?: string | null,
    isCsp?: boolean,
  ) => {
    const plan = resolveMembershipPlan(membershipPlans, mType, mId);
    return membershipBenefitsForLine(price, qty, category, plan, { isCsp });
  };

  const addItem = () => {
    if (!draftName.trim()) {
      Swal.fire("Missing product", "Please enter a product name.", "warning");
      return;
    }
    const qty = Number(draftQty);
    const price = Number(draftPrice);
    const discount = Number(draftDiscount);
    const cashback = draftIsCsp ? 0 : Number(draftCashback);
    if (qty <= 0 || price < 0 || discount < 0 || cashback < 0) {
      Swal.fire("Invalid values", "Check quantity, price, discount and cashback.", "error");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        productName: draftName.trim(),
        qty,
        unitPrice: price,
        discount,
        cashback,
        image: draftImage,
        category: draftCategory,
        isCsp: draftIsCsp,
        cspLabel: draftIsCsp ? "CSP" : null,
      },
    ]);
    setDraftName("");
    setDraftQty("1");
    setDraftPrice("0");
    setDraftDiscount("0");
    setDraftCashback("0");
    setDraftImage("");
    setDraftCategory("General");
    setDraftIsCsp(false);
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemQty = (id: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const plan = resolveMembershipPlan(
          membershipPlans,
          membership,
          membershipPlanId,
        );
        const stacked = calcStackedLineBenefits({
          unitPrice: item.unitPrice,
          qty: newQty,
          category: item.category || "General",
          plan,
          discountType: item.productDiscountType,
          discountValue: item.productDiscountValue,
          isCsp: Boolean(item.isCsp),
        });
        return {
          ...item,
          qty: newQty,
          discount: stacked.discount,
          cashback: stacked.cashback,
          productDiscountAmount: stacked.productDiscount,
          membershipDiscountAmount: stacked.membershipDiscount,
        };
      }),
    );
  };

  const updateItemDiscount = (id: number, newDiscount: number) => {
    if (newDiscount < 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, discount: newDiscount };
      }),
    );
  };

  const updateItemCashback = (id: number, newCashback: number) => {
    if (newCashback < 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.isCsp) return { ...item, cashback: 0 };
        return { ...item, cashback: newCashback };
      }),
    );
  };

  const subTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [items],
  );
  const discountTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.discount, 0),
    [items],
  );
  const productDiscountTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.productDiscountAmount ?? 0),
        0,
      ),
    [items],
  );
  const membershipDiscountTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          (item.isCsp ? 0 : Number(item.membershipDiscountAmount ?? 0)),
        0,
      ),
    [items],
  );
  const cashbackTotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.cashback || 0), 0),
    [items],
  );
  const extraChargesTotal = extraCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const grandTotal = subTotal - discountTotal + extraChargesTotal;
 
  const checkoutItems = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        name: item.productName,
        qty: item.qty,
        price: item.unitPrice,
        discount: item.discount,
        cashback: item.isCsp ? 0 : item.cashback,
        category: item.category,
        isCsp: Boolean(item.isCsp),
        productDiscountAmount: Number(item.productDiscountAmount ?? 0),
        membershipDiscountAmount: item.isCsp
          ? 0
          : Number(item.membershipDiscountAmount ?? 0),
      })),
    [items],
  );

  const creditCashbackForInvoice = async (
    amount: number,
    invoiceCode: string,
    paymentCustomerId?: string | null,
  ) => {
    if (amount <= 0) return;
    try {
      await creditWalletCashback({
        customerId: paymentCustomerId ?? customerId,
        customerPhone: phone.trim(),
        customerName: customer.trim(),
        amount,
        note: `Membership cashback for Invoice #${invoiceCode} via Invoice`,
        referenceId: invoiceCode,
        createdBy: {
          m_staff_id: staff.m_staff_id,
          m_staff_name: staff.m_staff_name,
          m_staff_email: staff.m_staff_email,
        },
      });
    } catch (err) {
      console.error("Failed to credit cashback to wallet", err);
    }
  };


  const handleSaveDraft = async () => {
    if (!customer.trim()) {
      Swal.fire("Customer required", "Please select or enter customer.", "warning");
      return;
    }
    if (!phone.trim()) {
      Swal.fire("Phone required", "Please enter customer phone number.", "warning");
      return;
    }
    if (!items.length) {
      Swal.fire("No items", "Add at least one product in invoice.", "warning");
      return;
    }

    try {
      setSaving(true);
      const draftPayload = {
        customerName: customer.trim(),
        customerPhone: phone.trim(),
        customerId: customerId || undefined,
        invoiceDate,
        dueDate,
        salesPersonName: salesPerson,
        notes: notes.trim(),
        items: items.map((item) => ({
          productName: item.productName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount,
          category: item.category || "General",
        })),
        subTotal,
        discountTotal,
        extraCharges,
        grandTotal,
        status: "draft" as const,
        mode: "Draft",
        paymentStatus: "partial" as const,
        pendingAmount: grandTotal,
        paymentBreakdown: {
          cash: 0,
          upi: 0,
          card: 0,
          wallet: 0,
          paidAmount: 0,
          dueAmount: grandTotal,
          changeAmount: 0,
        },
      };

      if (invoiceId) {
        await handleUpdateInvoice(invoiceId, draftPayload);
      } else {
        const response = await handleCreateInvoice({
          ...draftPayload,
          createdBy: {
            m_staff_id: staff.m_staff_id,
            m_staff_name: staff.m_staff_name,
            m_staff_email: staff.m_staff_email,
          },
        });
        const createdId = String(response?.invoice?._id ?? "");
        const createdCode = String(response?.invoice?.invoiceCode ?? "");
        if (createdId) setInvoiceId(createdId);
        if (createdCode) setInvoiceNo(createdCode);
      }

      Swal.fire("Saved", "Invoice has been saved as draft.", "success").then(() => {
        navigate(-1);
      });
    } catch (error: unknown) {
      const err = error as {response?: {data?: {message?: string}}};
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save draft. Try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrint = () => {
    Swal.fire("Saved", "Invoice saved. Print flow can be connected next.", "success");
  };

  const validateBeforeCheckout = () => {
    if (!customer.trim()) {
      Swal.fire("Customer required", "Please select or enter customer.", "warning");
      return false;
    }
    if (!phone.trim()) {
      Swal.fire("Phone required", "Please enter customer phone number.", "warning");
      return false;
    }
    if (dueDate < today) {
      Swal.fire("Invalid due date", "Due date cannot be before today.", "warning");
      return false;
    }
    if (!items.length) {
      Swal.fire("No items", "Add at least one product in invoice.", "warning");
      return false;
    }
    return true;
  };


  const handleSave = async (payment: {
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
    finalAmount: number;
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
    membershipDiscount?: number;
    waiveMembershipForCoupon?: boolean;
    extraCharges: Array<{ label: string; amount: number }>;
    customerId?: string | null;
    invoiceBy?: {
      staffId: string;
      staffName: string;
      employeeId: string;
      email?: string;
    } | null;
    verifiedAt?: string | null;
  }) => {
    try {
      setSaving(true);
      const waiveMembership = Boolean(payment.waiveMembershipForCoupon);
      const lineItems = items.map((item) => {
        const productOnly = Number(item.productDiscountAmount ?? 0);
        const membershipOnly = item.isCsp
          ? 0
          : Number(item.membershipDiscountAmount ?? 0);
        const discount = waiveMembership
          ? productOnly > 0
            ? productOnly
            : Math.max(0, Number(item.discount || 0) - membershipOnly)
          : Number(item.discount || 0);
        return {
          productName: item.productName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount,
          category: item.category || "General",
        };
      });
      const lineDiscountTotal = lineItems.reduce(
        (sum, item) => sum + Number(item.discount || 0),
        0,
      );
      if (mode === "edit" && invoiceId) {
        await handleUpdateInvoice(invoiceId, {
          customerName: customer.trim(),
          customerPhone: phone.trim(),
          customerId: payment.customerId || customerId || undefined,
          invoiceDate,
          dueDate,
          salesPersonName:
            payment.invoiceBy?.staffName?.trim() || salesPerson,
          invoiceBy: payment.invoiceBy
            ? {
                staffId: payment.invoiceBy.staffId,
                staffName: payment.invoiceBy.staffName,
                employeeId: payment.invoiceBy.employeeId,
                email: payment.invoiceBy.email,
              }
            : null,
          verifiedAt: payment.verifiedAt || null,
          notes: notes.trim(),
          items: lineItems,
          subTotal,
          discountTotal:
            lineDiscountTotal +
            Number(payment.coupon?.discountAmount ?? 0) +
            Number(payment.referral?.discountAmount ?? 0),
          extraCharges,
          grandTotal: payment.finalAmount,
          coupon: payment.coupon ?? null,
          referral: payment.referral ?? null,
          status: "final",
          mode: payment.mode,
          paymentStatus: payment.paymentStatus,
          paymentBreakdown: payment.paymentBreakdown,
          pendingAmount: payment.paymentBreakdown.dueAmount,
        });

        await creditCashbackForInvoice(
          payment.cashbackTotal,
          invoiceNo,
          payment.customerId,
        );

        Swal.fire("Invoice Updated", "Invoice updated successfully.", "success").then(() => navigate(-1));
      } else {
        const response = await handleCreateInvoice({
          customerName: customer.trim(),
          customerPhone: phone.trim(),
          customerId: payment.customerId || customerId || undefined,
          invoiceDate,
          dueDate,
          salesPersonName:
            payment.invoiceBy?.staffName?.trim() || salesPerson,
          invoiceBy: payment.invoiceBy
            ? {
                staffId: payment.invoiceBy.staffId,
                staffName: payment.invoiceBy.staffName,
                employeeId: payment.invoiceBy.employeeId,
                email: payment.invoiceBy.email,
              }
            : null,
          verifiedAt: payment.verifiedAt || null,
          notes: notes.trim(),
          items: lineItems,
          subTotal,
          discountTotal:
            lineDiscountTotal +
            Number(payment.coupon?.discountAmount ?? 0) +
            Number(payment.referral?.discountAmount ?? 0),
          extraCharges,
          grandTotal: payment.finalAmount,
          coupon: payment.coupon ?? null,
          referral: payment.referral ?? null,
          status: "final",
          mode: payment.mode,
          paymentStatus: payment.paymentStatus,
          paymentBreakdown: payment.paymentBreakdown,
          pendingAmount: payment.paymentBreakdown.dueAmount,
          cashbackTotal: payment.cashbackTotal,
          membershipDiscount: payment.membershipDiscount,
          membershipType: membership || undefined,
          activityType: "Invoice",
          createdBy: {
            m_staff_id: staff.m_staff_id,
            m_staff_name: staff.m_staff_name,
            m_staff_email: staff.m_staff_email,
          },
        });

        const savedCode = response?.invoice?.invoiceCode || invoiceNo;

        await creditCashbackForInvoice(
          payment.cashbackTotal,
          savedCode,
          payment.customerId,
        );

        Swal.fire(
          "Invoice Saved",
          response?.invoice?.invoiceCode
            ? `Invoice ${response.invoice.invoiceCode} saved successfully.`
            : "Invoice saved successfully.",
          "success",
        ).then(() => navigate(-1));
      }
    } catch (error: unknown) {
      const err = error as {response?: {data?: {message?: string}}};
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save invoice. Try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const fetchCustomers = async (searchText = "", signal?: AbortSignal) => {
    try {
      setLoadingCustomers(true);
      const response = await handleGetCustomers(searchText, signal);
      setCustomers(Array.isArray(response?.customers) ? response.customers : []);
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const debouncedCustomer = useDebounce(customer.trim(), 250);

  useEffect(() => {
    // View Invoice: never search/list customers by name
    if (mode === "view") return;
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
  }, [debouncedCustomer, customerDropdownOpen, mode]);

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
        setCustomer(String(created.name));
        setPhone(String(created.mobile ?? ""));
        setMembership(String(created.membershipType ?? "none"));
        setMembershipPlanId(toMembershipPlanId(created.membershipPlanId));
        setCustomerId(created._id ?? null);
      }
      setShowCreateCustomerModal(false);
      await fetchCustomers();
      Swal.fire("Customer created", "Customer saved successfully.", "success");
    } catch (error: unknown) {
      const err = error as {response?: {data?: {message?: string}}};
      Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create customer. Try again.",
        "error",
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  return (
    <div className="space-y-4 p-2">
      <CreateInvoiceHeader
        invoiceNo={invoiceNo}
        onBack={() => navigate(-1)}
        onSaveDraft={handleSaveDraft}
        onSavePrint={handleSavePrint}
        onSave={() => {
          if (validateBeforeCheckout()) setOpenCheckout(true);
        }}
        isSaving={saving}
        mode={mode}
      />
      <div className={`${mode === "view" ? "pointer-events-none opacity-90" : ""}`}>
        <div className="space-y-4">
          <InvoiceDetailsSection
            customer={customer}
            phone={phone}
            membership={membership}
            membershipPlanId={membershipPlanId}
            membershipPlans={membershipPlans}
            customerOptions={customers}
            loadingCustomers={loadingCustomers}
            customerDropdownOpen={mode !== "view" && customerDropdownOpen}
            invoiceDate={invoiceDate}
            dueDate={dueDate}
            dueDateMin={today}
            salesPerson={salesPerson}
            readOnly={mode === "view"}
            onCustomerChange={(value) => {
              setCustomer(value);
              setPhone("");
              setMembership("none");
              setMembershipPlanId(null);
              setCustomerId(null);
            }}
            onPickCustomer={(selectedCustomer) => {
              const mType = selectedCustomer.membershipType ?? "none";
              const mId = toMembershipPlanId(selectedCustomer.membershipPlanId);
              setCustomer(selectedCustomer.name);
              setPhone(selectedCustomer.mobile);
              setMembership(mType);
              setMembershipPlanId(mId);
              setCustomerId(selectedCustomer._id);
              setCustomers([]);
              setCustomerDropdownOpen(false);

              // Stack product catalogue discount + membership category discount
              setItems((prev) =>
                prev.map((item) => {
                  const plan = resolveMembershipPlan(
                    membershipPlans,
                    mType,
                    mId,
                  );
                  const stacked = calcStackedLineBenefits({
                    unitPrice: item.unitPrice,
                    qty: item.qty,
                    category: item.category || "General",
                    plan,
                    discountType: item.productDiscountType,
                    discountValue: item.productDiscountValue,
                    isCsp: Boolean(item.isCsp),
                  });
                  return {
                    ...item,
                    discount: stacked.discount,
                    cashback: stacked.cashback,
                    productDiscountAmount: stacked.productDiscount,
                    membershipDiscountAmount: stacked.membershipDiscount,
                  };
                }),
              );
            }}
            onOpenCreateCustomer={() => setShowCreateCustomerModal(true)}
            onOpenCustomerDropdown={() => setCustomerDropdownOpen(true)}
            onCloseCustomerDropdown={() => setCustomerDropdownOpen(false)}
            onPhoneChange={setPhone}
            onInvoiceDateChange={setInvoiceDate}
            onDueDateChange={setDueDate}
          />
          {showCreateCustomerModal && (
            <CreateCustomerModal
              onClose={() => setShowCreateCustomerModal(false)}
              onSubmit={handleCreateCustomerSubmit}
              loading={creatingCustomer}
            />
          )}
          <ProductsServicesSection
            draft={draft}
            items={items}
            readOnly={mode === "view"}
            membershipType={membership}
            membershipPlans={membershipPlans}
            membershipPlanId={membershipPlanId}
            onDraftChange={(field, value) => {
              if (field === "name") setDraftName(value);
              if (field === "qty") {
                setDraftQty(value);
                if (!draftIsCsp && draftCategory) {
                  const benefits = getMembershipBenefitsForItem(
                    Number(draftPrice),
                    Number(value),
                    draftCategory,
                    membership,
                    membershipPlanId,
                    false,
                  );
                  if (benefits.discount > 0) setDraftDiscount(String(benefits.discount));
                  setDraftCashback(String(benefits.cashback));
                }
              }
              if (field === "price") {
                setDraftPrice(value);
                if (!draftIsCsp && draftCategory) {
                  const benefits = getMembershipBenefitsForItem(
                    Number(value),
                    Number(draftQty),
                    draftCategory,
                    membership,
                    membershipPlanId,
                    false,
                  );
                  if (benefits.discount > 0) setDraftDiscount(String(benefits.discount));
                  setDraftCashback(String(benefits.cashback));
                }
              }
              if (field === "discount") setDraftDiscount(value);
              if (field === "image") setDraftImage(value);
              if (field === "isCsp") {
                const next = value === "true";
                setDraftIsCsp(next);
                if (next) {
                  setDraftCashback("0");
                }
              }
              if (field === "category") {
                setDraftCategory(value);
                // Re-calculate membership benefits when category is selected (not for CSP)
                if (!draftIsCsp) {
                  const benefits = getMembershipBenefitsForItem(
                    Number(draftPrice),
                    Number(draftQty),
                    value,
                    membership,
                    membershipPlanId,
                    false,
                  );
                  if (benefits.discount > 0) setDraftDiscount(String(benefits.discount));
                  // Always set cashback (including 0) so stale values don't stick
                  setDraftCashback(String(benefits.cashback));
                } else {
                  setDraftCashback("0");
                }
              }
              if (field === "cashback") {
                if (!draftIsCsp) setDraftCashback(value);
              }
            }}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onUpdateItemQty={updateItemQty}
            onUpdateItemDiscount={updateItemDiscount}
            onUpdateItemCashback={updateItemCashback}
            onAddDirectItem={(newItem) => {
              setItems((prev) => {
                const nextId = prev.length > 0 ? Math.max(...prev.map((i) => i.id)) + 1 : 1;
                const isCsp = Boolean(newItem.isCsp);
                return [
                  ...prev,
                  {
                    ...newItem,
                    id: nextId,
                    discount: Number(newItem.discount || 0),
                    cashback: isCsp ? 0 : Number(newItem.cashback || 0),
                    isCsp,
                    productDiscountType: newItem.productDiscountType,
                    productDiscountValue: newItem.productDiscountValue,
                    productDiscountAmount: Number(
                      newItem.productDiscountAmount ?? 0,
                    ),
                    membershipDiscountAmount: isCsp
                      ? 0
                      : Number(newItem.membershipDiscountAmount ?? 0),
                  },
                ];
              });
            }}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <NotesSection notes={notes} onChange={setNotes} />
            <InvoiceSummaryCard
              subTotal={subTotal}
              discountTotal={discountTotal}
              productDiscountTotal={productDiscountTotal}
              membershipDiscountTotal={membershipDiscountTotal}
              cashbackTotal={cashbackTotal}
              extraCharges={extraCharges}
              onExtraChargesChange={setExtraCharges}
              grandTotal={grandTotal}
              onSave={
                mode !== "view"
                  ? () => {
                      if (validateBeforeCheckout()) setOpenCheckout(true);
                    }
                  : () => {}
              }
              isSaving={saving}
            />
          </div>
        </div>
      </div>
      <CheckoutModal
        open={openCheckout}
        grandTotal={grandTotal}
        items={checkoutItems}
        initialCustomerName={customer}
        initialCustomerPhone={phone}
        initialCustomerId={customerId}
        initialMembership={membership}
        initialMembershipPlanId={membershipPlanId}
        initialMembershipDiscount={membershipDiscountTotal}
        initialProductDiscount={productDiscountTotal}
        initialCashbackTotal={cashbackTotal}
        extraCharges={extraCharges}
        membershipPlans={membershipPlans}
        onClose={() => setOpenCheckout(false)}
        onConfirmPayment={async (payment) => {
          setOpenCheckout(false);
          await handleSave(payment);
        }}
      />
    </div>
  );
}
