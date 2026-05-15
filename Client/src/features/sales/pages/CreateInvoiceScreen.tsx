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
  handleGetMemberships,
  type CustomerPayload,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";
import { printThermalReceipt } from "@/utils/printUtils";
import {
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
  const [openCheckout, setOpenCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{ _id: string; name: string; mobile: string; companyName?: string; membershipType?: string; membershipPlanId?: string }>
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(true);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftPrice, setDraftPrice] = useState("0");
  const [draftDiscount, setDraftDiscount] = useState("0");
  const [draftImage, setDraftImage] = useState("");
  const [draftCategory, setDraftCategory] = useState("General");
  const [draftCashback, setDraftCashback] = useState("0");
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
                cashback: item.cashback || 0,
                image: item.image || item.imageUrl || "",
                category: item.category || "General"
            })));
        }
    }
  }, [location.state]);
  const draft = {
    name: draftName,
    qty: draftQty,
    price: draftPrice,
    discount: draftDiscount,
    image: draftImage,
    category: draftCategory,
    cashback: draftCashback,
  };

  const getMembershipBenefitsForItem = (
    price: number,
    qty: number,
    category: string,
    mType: string,
    mId?: string | null,
  ) => {
    const plan = resolveMembershipPlan(membershipPlans, mType, mId);
    return membershipBenefitsForLine(price, qty, category, plan);
  };

  const addItem = () => {
    if (!draftName.trim()) {
      Swal.fire("Missing product", "Please enter a product name.", "warning");
      return;
    }
    const qty = Number(draftQty);
    const price = Number(draftPrice);
    const discount = Number(draftDiscount);
    const cashback = Number(draftCashback);
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
      },
    ]);
    setDraftName("");
    setDraftQty("1");
    setDraftPrice("0");
    setDraftDiscount("0");
    setDraftCashback("0");
    setDraftImage("");
    setDraftCategory("General");
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemQty = (id: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const benefits = getMembershipBenefitsForItem(item.unitPrice, newQty, item.category || "General", membership, membershipPlanId);
          return { 
            ...item, 
            qty: newQty, 
            discount: benefits.discount || item.discount,
            cashback: benefits.cashback || item.cashback
          };
        }
        return item;
      }),
    );
  };

  const updateItemDiscount = (id: number, newDiscount: number) => {
    if (newDiscount < 0) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, discount: newDiscount } : item)),
    );
  };

  const updateItemCashback = (id: number, newCashback: number) => {
    if (newCashback < 0) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cashback: newCashback } : item)),
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
  const cashbackTotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.cashback || 0), 0),
    [items],
  );
  const grandTotal = subTotal - discountTotal;
 
  const checkoutItems = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        name: item.productName,
        qty: item.qty,
        price: item.unitPrice,
        discount: item.discount,
        cashback: item.cashback,
        category: item.category,
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
        invoiceDate,
        dueDate,
        salesPersonName: salesPerson,
        notes: notes.trim(),
        items: items.map((item) => ({
          productName: item.productName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
        subTotal,
        discountTotal,
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
    cashbackTotal: number;
    membershipDiscount?: number;
    customerId?: string | null;
  }) => {
    try {
      setSaving(true);
      if (mode === "edit" && invoiceId) {
        await handleUpdateInvoice(invoiceId, {
          customerName: customer.trim(),
          customerPhone: phone.trim(),
          invoiceDate,
          dueDate,
          salesPersonName: salesPerson,
          notes: notes.trim(),
          items: items.map((item) => ({
            productName: item.productName,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discount: item.discount,
          })),
          subTotal,
          discountTotal,
          grandTotal: payment.finalAmount,
          coupon: payment.coupon ?? null,
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

        printThermalReceipt({
          invoiceNo: invoiceNo,
          customerName: customer.trim(),
          customerPhone: phone.trim(),
          items: items.map((item) => ({
            name: item.productName,
            qty: item.qty,
            price: item.unitPrice,
            discount: item.discount,
          })),
          totalMRP: items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
          discountTotal: discountTotal + Number(payment.coupon?.discountAmount ?? 0),
          cashbackAmount: payment.cashbackTotal,
          finalAmount: payment.finalAmount,
          totalDue: payment.paymentBreakdown.dueAmount,
          totalQty: items.reduce((sum, item) => sum + item.qty, 0),
        });

        Swal.fire("Invoice Updated", "Invoice updated successfully.", "success").then(() => navigate(-1));
      } else {
        const response = await handleCreateInvoice({
          customerName: customer.trim(),
          customerPhone: phone.trim(),
          invoiceDate,
          dueDate,
          salesPersonName: salesPerson,
          notes: notes.trim(),
          items: items.map((item) => ({
            productName: item.productName,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discount: item.discount,
          })),
          subTotal,
          discountTotal,
          grandTotal: payment.finalAmount,
          coupon: payment.coupon ?? null,
          status: "final",
          mode: payment.mode,
          paymentStatus: payment.paymentStatus,
          paymentBreakdown: payment.paymentBreakdown,
          pendingAmount: payment.paymentBreakdown.dueAmount,
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

        printThermalReceipt({
          invoiceNo: savedCode,
          customerName: customer.trim(),
          customerPhone: phone.trim(),
          items: items.map((item) => ({
            name: item.productName,
            qty: item.qty,
            price: item.unitPrice,
            discount: item.discount,
          })),
          totalMRP: items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
          discountTotal: discountTotal + Number(payment.coupon?.discountAmount ?? 0),
          cashbackAmount: payment.cashbackTotal,
          finalAmount: payment.finalAmount,
          totalDue: payment.paymentBreakdown.dueAmount,
          totalQty: items.reduce((sum, item) => sum + item.qty, 0),
        });

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
      <div className={mode === "view" ? "pointer-events-none opacity-90" : ""}>
      <InvoiceDetailsSection
        customer={customer}
        phone={phone}
        membership={membership}
        customerOptions={customers}
        loadingCustomers={loadingCustomers}
        customerDropdownOpen={customerDropdownOpen}
        invoiceDate={invoiceDate}
        dueDate={dueDate}
        dueDateMin={today}
        salesPerson={salesPerson}
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

          // Auto-apply discounts to existing items
          setItems(prev => prev.map(item => {
            const benefits = getMembershipBenefitsForItem(item.unitPrice, item.qty, item.category || "General", mType, mId);
            return {
                ...item,
                discount: benefits.discount,
                cashback: benefits.cashback
            };
          }));
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
        membershipType={membership}
        membershipPlans={membershipPlans}
        membershipPlanId={membershipPlanId}
        onDraftChange={(field, value) => {
          if (field === "name") setDraftName(value);
          if (field === "qty") setDraftQty(value);
          if (field === "price") setDraftPrice(value);
          if (field === "discount") setDraftDiscount(value);
          if (field === "image") setDraftImage(value);
          if (field === "category") {
            // Re-calculate discount based on membership when category is selected
            const benefits = getMembershipBenefitsForItem(Number(draftPrice), Number(draftQty), value, membership, membershipPlanId);
            if (benefits.discount > 0) setDraftDiscount(String(benefits.discount));
            if (benefits.cashback > 0) setDraftCashback(String(benefits.cashback));
          }
          if (field === "cashback") setDraftCashback(value);
        }}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItemQty={updateItemQty}
        onUpdateItemDiscount={updateItemDiscount}
        onUpdateItemCashback={updateItemCashback}
      />

      {/* <PaymentSection /> */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <NotesSection notes={notes} onChange={setNotes} />
        <InvoiceSummaryCard
          subTotal={subTotal}
          discountTotal={discountTotal}
          cashbackTotal={cashbackTotal}
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
      <CheckoutModal
        open={openCheckout}
        grandTotal={grandTotal}
        items={checkoutItems}
        initialCustomerName={customer}
        initialCustomerPhone={phone}
        initialCustomerId={customerId}
        initialMembership={membership}
        initialMembershipPlanId={membershipPlanId}
        initialMembershipDiscount={discountTotal}
        initialCashbackTotal={cashbackTotal}
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
