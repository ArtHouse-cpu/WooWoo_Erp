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
  handleGetCustomers,
  handleCreateQuotation,
  handleUpdateQuotation,
  handleGetMemberships,
  type CustomerPayload,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";
import DocumentFormModal from "@/components/DocumentFormModal";
import {
  calcStackedLineBenefits,
  membershipBenefitsForLine,
  resolveMembershipPlan,
  toMembershipPlanId,
} from "../utils/membershipInvoiceUtils";

const today = new Date().toISOString().split("T")[0];
const QUOT_SEQ_KEY = "wooerp-quotation-seq";

const getNextQuotationNumber = (): string => {
  const fallback = 1000;
  try {
    const currentRaw = localStorage.getItem(QUOT_SEQ_KEY);
    const current = currentRaw ? Number(currentRaw) : fallback;
    const next = Number.isFinite(current) ? current + 1 : fallback + 1;
    localStorage.setItem(QUOT_SEQ_KEY, String(next));
    return String(next);
  } catch {
    return String(fallback + 1);
  }
};

type Mode = "create" | "edit" | "view";

type CreateQuotationScreenProps = {
  onClose?: () => void;
  initialData?: any;
  initialMode?: Mode;
};

export default function CreateQuotationScreen({
  onClose,
  initialData,
  initialMode,
}: CreateQuotationScreenProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>(initialMode || "create");
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [quotationNo, setQuotationNo] = useState(getNextQuotationNumber());
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [membership, setMembership] = useState("none");
  const [membershipPlanId, setMembershipPlanId] = useState<string | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlanPayload[]>([]);
  const [quotationDate, setQuotationDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const staff = useAppSelector((state) => state.user);
  const staffName = useAppSelector((state) => state.user.m_staff_name);
  const salesPerson = staffName ?? "Not Assigned";
  const [createdByDisplay, setCreatedByDisplay] = useState(salesPerson);
  const [billBy, setBillBy] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{
      _id: string;
      name: string;
      mobile: string;
      companyName?: string;
      membershipType?: string;
      membershipPlanId?: string;
    }>
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(true);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftPrice, setDraftPrice] = useState("0");
  const [draftDiscount, setDraftDiscount] = useState("0");
  const [draftCashback, setDraftCashback] = useState("0");
  const [draftImage, setDraftImage] = useState("");
  const [draftCategory, setDraftCategory] = useState("General");
  const [draftIsCsp, setDraftIsCsp] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [extraCharges, setExtraCharges] = useState<Array<{ label: string; amount: number }>>([]);
  const [viewCashbackTotal, setViewCashbackTotal] = useState<number | null>(null);
  const [viewMembershipDiscount, setViewMembershipDiscount] = useState<number | null>(null);
  const [viewCouponDiscount, setViewCouponDiscount] = useState(0);
  const [viewCouponCode, setViewCouponCode] = useState("");
  const [viewGrandTotal, setViewGrandTotal] = useState<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    handleGetMemberships({ status: "Active" }, ac.signal)
      .then((res) => setMembershipPlans(res.memberships || []))
      .catch(() => setMembershipPlans([]));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const applyQuotation = (quot: any, nextMode: Mode) => {
      setMode(nextMode);
      setQuotationId(quot._id);
      if (quot.quotationCode) setQuotationNo(quot.quotationCode);
      setCustomer(quot.customerName || "");
      setPhone(quot.customerPhone || "");
      setMembership(String(quot.membershipType ?? "none"));
      setMembershipPlanId(toMembershipPlanId(quot.membershipPlanId));
      if (quot.quotationDate) setQuotationDate(new Date(quot.quotationDate).toISOString().split("T")[0]);
      if (quot.dueDate) setDueDate(new Date(quot.dueDate).toISOString().split("T")[0]);
      setNotes(quot.notes || "");
      const creator = String(quot.createdBy?.m_staff_name ?? "").trim();
      setCreatedByDisplay(creator || salesPerson);
      const pinBilledBy = String(
        quot.invoiceBy?.staffName ??
          quot.invoiceBy?.name ??
          quot.billBy ??
          "",
      ).trim();
      setBillBy(pinBilledBy || String(quot.salesPersonName ?? "").trim());
      if (Array.isArray(quot.items)) {
        setItems(quot.items.map((item: any, idx: number) => {
          const discount = Number(item.discount || 0);
          const membershipAmt = Number(item.membershipDiscountAmount ?? 0);
          const productAmt = Number(item.productDiscountAmount ?? 0);
          return {
          id: idx + 1,
          productName: item.productName || "",
          qty: item.qty || 1,
          unitPrice: item.unitPrice || 0,
          discount,
          cashback: item.isCsp ? 0 : item.cashback || 0,
          image: item.image || item.imageUrl || "",
          category: item.category || "General",
          isCsp: Boolean(item.isCsp),
          cspLabel: item.cspLabel || (item.isCsp ? "CSP" : null),
          productDiscountType: item.productDiscountType,
          productDiscountValue: item.productDiscountValue,
          productDiscountAmount:
            productAmt > 0
              ? productAmt
              : membershipAmt > 0
                ? Math.max(0, discount - membershipAmt)
                : 0,
          membershipDiscountAmount: membershipAmt,
        };
        }));
      }
      if (Array.isArray(quot.extraCharges)) setExtraCharges(quot.extraCharges);
      setViewCashbackTotal(
        quot.cashbackTotal != null ? Number(quot.cashbackTotal) || 0 : null,
      );
      setViewMembershipDiscount(
        quot.membershipDiscount != null
          ? Number(quot.membershipDiscount) || 0
          : null,
      );
      setViewCouponDiscount(Number(quot.coupon?.discountAmount ?? 0) || 0);
      setViewCouponCode(String(quot.coupon?.code ?? "").trim());
      setViewGrandTotal(
        quot.grandTotal != null && Number.isFinite(Number(quot.grandTotal))
          ? Math.max(0, Number(quot.grandTotal))
          : null,
      );
    };

    if (initialData && initialMode) {
      applyQuotation(initialData, initialMode);
      return;
    }

    const state = location.state as { quotation?: any; mode?: Mode } | null;
    if (state?.mode && state?.quotation) {
      applyQuotation(state.quotation, state.mode);
    }
  }, [location.state, initialData, initialMode]);

  useEffect(() => {
    if (mode !== "view") return;
    const phoneTerm = phone.trim();
    if (!phoneTerm) return;
    const controller = new AbortController();
    handleGetCustomers(phoneTerm, controller.signal)
      .then((response) => {
        const list = Array.isArray(response?.customers) ? response.customers : [];
        const match =
          list.find(
            (c: { mobile?: string }) =>
              String(c.mobile ?? "").trim() === phoneTerm,
          ) || list[0];
        if (!match) return;
        setMembership((prev) =>
          prev && prev !== "none"
            ? prev
            : String(match.membershipType ?? "none"),
        );
        setMembershipPlanId((prev) => prev || toMembershipPlanId(match.membershipPlanId));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [mode, phone]);
  const draft = {
    name: draftName,
    qty: draftQty,
    price: draftPrice,
    discount: draftDiscount,
    cashback: draftCashback,
    image: draftImage,
    category: draftCategory,
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
    const plan = resolveMembershipPlan(
      membershipPlans,
      membership,
      membershipPlanId,
    );
    const stacked = calcStackedLineBenefits({
      unitPrice: price,
      qty,
      category: draftCategory,
      plan,
      isCsp: draftIsCsp,
    });
    const membershipAmt = draftIsCsp
      ? 0
      : Math.min(discount, stacked.membershipDiscount);
    const productAmt = Math.max(0, discount - membershipAmt);
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
        productDiscountAmount: productAmt,
        membershipDiscountAmount: membershipAmt,
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
      prev.map((item) => (item.id === id ? { ...item, discount: newDiscount } : item)),
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
          sum + (item.isCsp ? 0 : Number(item.membershipDiscountAmount ?? 0)),
        0,
      ),
    [items],
  );
  const cashbackTotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.cashback || 0), 0),
    [items],
  );
  const displayCashbackTotal =
    mode === "view" && viewCashbackTotal != null
      ? viewCashbackTotal
      : cashbackTotal;
  const displayMembershipDiscount =
    mode === "view" &&
    viewMembershipDiscount != null &&
    membershipDiscountTotal <= 0
      ? viewMembershipDiscount
      : membershipDiscountTotal;
  const displayProductDiscount =
    productDiscountTotal > 0
      ? productDiscountTotal
      : displayMembershipDiscount > 0
        ? Math.max(0, discountTotal - displayMembershipDiscount)
        : 0;
  const extraChargesTotal = extraCharges.reduce(
    (sum, c) => sum + Number(c.amount || 0),
    0,
  );
  const computedGrandTotal = Math.max(
    0,
    subTotal -
      discountTotal -
      (mode === "view" ? viewCouponDiscount : 0) +
      extraChargesTotal,
  );
  const grandTotal =
    mode === "view" && viewGrandTotal != null
      ? viewGrandTotal
      : computedGrandTotal;


  const handleSaveDraft = async (paymentPayload?: any) => {
    const finalCustomer = paymentPayload?.customerName?.trim() || customer.trim();
    const finalPhone = paymentPayload?.customerPhone?.trim() || phone.trim();

    if (!finalCustomer) {
      Swal.fire("Customer required", "Please select or enter customer.", "warning");
      return;
    }
    if (!finalPhone) {
      Swal.fire("Phone required", "Please enter customer phone number.", "warning");
      return;
    }
    if (!items.length) {
      Swal.fire("No items", "Add at least one product in quotation.", "warning");
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        customerName: finalCustomer,
        customerPhone: finalPhone,
        quotationDate,
        dueDate,
        salesPersonName:
          String(paymentPayload?.invoiceBy?.staffName || "").trim() ||
          salesPerson,
        notes: (paymentPayload?.notes || notes).trim(),
        items: items.map((item) => ({
          productName: item.productName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount,
          cashback: item.isCsp ? 0 : item.cashback,
          category: item.category || "General",
          isCsp: Boolean(item.isCsp),
          productDiscountType: item.productDiscountType,
          productDiscountValue: item.productDiscountValue,
          productDiscountAmount: Number(item.productDiscountAmount ?? 0),
          membershipDiscountAmount: item.isCsp
            ? 0
            : Number(item.membershipDiscountAmount ?? 0),
        })),
        subTotal,
        discountTotal,
        grandTotal: paymentPayload?.finalAmount ?? grandTotal,
        membershipType: membership,
        membershipPlanId,
        membershipDiscount: membershipDiscountTotal,
        cashbackTotal,
        extraCharges,
        status: "draft" as const,
      };

      if (paymentPayload) {
        payload.mode = paymentPayload.mode;
        payload.paymentStatus = paymentPayload.paymentStatus;
        payload.paymentBreakdown = paymentPayload.paymentBreakdown;
        if (paymentPayload.coupon) payload.coupon = paymentPayload.coupon;
        if (Array.isArray(paymentPayload.extraCharges)) {
          payload.extraCharges = paymentPayload.extraCharges;
        }
        if (paymentPayload.membershipDiscount != null) {
          payload.membershipDiscount = Number(paymentPayload.membershipDiscount) || 0;
        }
        if (paymentPayload.cashbackTotal != null) {
          payload.cashbackTotal = Number(paymentPayload.cashbackTotal) || 0;
        }
      }

      if (quotationId) {
        await handleUpdateQuotation(quotationId, payload);
        Swal.fire("Saved", "Quotation has been updated.", "success").then(() => {
          navigate(-1);
        });
      } else {
        const response = await handleCreateQuotation({
          ...payload,
          createdBy: {
            m_staff_id: staff.m_staff_id,
            m_staff_name: staff.m_staff_name,
            m_staff_email: staff.m_staff_email,
          },
        });
        const createdId = String(response?.quotation?._id ?? "");
        const createdCode = String(response?.quotation?.quotationCode ?? "");
        if (createdId) setQuotationId(createdId);
        if (createdCode) setQuotationNo(createdCode);
        
        Swal.fire("Saved", "Quotation has been saved.", "success").then(() => {
          navigate(-1);
        });
      }
    } catch (error: unknown) {
      const err = error as {response?: {data?: {message?: string}}};
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save quotation. Try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrint = () => {
    Swal.fire("Saved", "Quotation saved. Print flow can be connected next.", "success");
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

  const handleBack = () => {
    if (onClose) onClose();
    else navigate(-1);
  };

  const content = (
    <div className="min-w-0 space-y-4 p-1 sm:p-2">
      <CreateInvoiceHeader
        title={mode === "create" ? "Create Quotation" : mode === "edit" ? "Edit Quotation" : "View Quotation"}
        prefix="QUOT- "
        invoiceNo={quotationNo}
        onBack={handleBack}
        onSaveDraft={() => handleSaveDraft()}
        onSavePrint={handleSavePrint}
        onSave={() => setCheckoutOpen(true)}
        isSaving={saving}
        mode={mode}
      />
      <div className={mode === "view" ? "pointer-events-none opacity-90" : ""}>
      <InvoiceDetailsSection
        customer={customer}
        phone={phone}
        membership={membership}
        membershipPlanId={membershipPlanId}
        membershipPlans={membershipPlans}
        customerOptions={customers}
        loadingCustomers={loadingCustomers}
        customerDropdownOpen={mode !== "view" && customerDropdownOpen}
        invoiceDate={quotationDate}
        dueDate={dueDate}
        dueDateMin={today}
        dateLabel="Quotation Date"
        billedByLabel="Quoted By"
        selectorLabel="Select Customer"
        createLabel="Create Customer"
        salesPerson={
          mode === "view" || mode === "edit" ? createdByDisplay : salesPerson
        }
        billBy={
          mode === "view" || mode === "edit" ? billBy || "—" : undefined
        }
        readOnly={mode === "view"}
        onCustomerChange={(value) => {
          setCustomer(value);
          setPhone("");
          setMembership("none");
          setMembershipPlanId(null);
        }}
        onPickCustomer={(selectedCustomer) => {
          const mType = selectedCustomer.membershipType ?? "none";
          const mId = toMembershipPlanId(selectedCustomer.membershipPlanId);
          setCustomer(selectedCustomer.name);
          setPhone(selectedCustomer.mobile);
          setMembership(mType);
          setMembershipPlanId(mId);
          setCustomers([]);
          setCustomerDropdownOpen(false);
          setItems((prev) =>
            prev.map((item) => {
              const plan = resolveMembershipPlan(membershipPlans, mType, mId);
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
        onInvoiceDateChange={setQuotationDate}
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
        documentKind="quotation"
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
          if (field === "price") setDraftPrice(value);
          if (field === "discount") setDraftDiscount(value);
          if (field === "cashback") setDraftCashback(value);
          if (field === "image") setDraftImage(value);
          if (field === "category") setDraftCategory(value);
          if (field === "isCsp") setDraftIsCsp(value === "true");
        }}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItemQty={updateItemQty}
        onUpdateItemDiscount={updateItemDiscount}
        onUpdateItemCashback={updateItemCashback}
        onAddDirectItem={(newItem) => {
          setItems((prev) => {
            const nextId = prev.length > 0 ? Math.max(...prev.map((i) => i.id)) + 1 : 1;
            return [...prev, { ...newItem, id: nextId }];
          });
        }}
      />

      {/* <PaymentSection /> */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <NotesSection notes={notes} onChange={setNotes} />
        <InvoiceSummaryCard
          title="Quotation Summary"
          subTotal={subTotal}
          discountTotal={discountTotal}
          productDiscountTotal={displayProductDiscount}
          membershipDiscountTotal={displayMembershipDiscount}
          cashbackTotal={displayCashbackTotal}
          couponDiscount={mode === "view" ? viewCouponDiscount : 0}
          couponCode={mode === "view" ? viewCouponCode : ""}
          extraCharges={extraCharges}
          onExtraChargesChange={mode === "view" ? undefined : setExtraCharges}
          grandTotal={grandTotal}
          readOnly={mode === "view"}
          onSave={
            mode !== "view"
              ? () => setCheckoutOpen(true)
              : () => {}
          }
          isSaving={saving}
        />
      </div>
      </div>

      {mode !== "view" && (
        <CheckoutModal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          grandTotal={grandTotal}
          items={items.map((it) => ({
            name: it.productName,
            qty: it.qty,
            price: it.unitPrice,
            discount: it.discount,
            cashback: it.isCsp ? 0 : it.cashback,
            image: it.image,
            category: it.category,
            isCsp: Boolean(it.isCsp),
            productDiscountAmount: Number(it.productDiscountAmount ?? 0),
            membershipDiscountAmount: it.isCsp
              ? 0
              : Number(it.membershipDiscountAmount ?? 0),
          }))}
          extraCharges={extraCharges}
          membershipPlans={membershipPlans}
          initialCustomerName={customer}
          initialCustomerPhone={phone}
          initialMembership={membership}
          initialMembershipPlanId={membershipPlanId}
          initialMembershipDiscount={membershipDiscountTotal}
          initialProductDiscount={productDiscountTotal}
          initialCashbackTotal={cashbackTotal}
          onConfirmPayment={async (paymentPayload) => {
            await handleSaveDraft(paymentPayload);
            setCheckoutOpen(false);
          }}
        />
      )}
    </div>
  );

  if (onClose) {
    return (
      <DocumentFormModal
        onClose={onClose}
        confirmOnClose={mode !== "view"}
      >
        {content}
      </DocumentFormModal>
    );
  }

  return content;
}
