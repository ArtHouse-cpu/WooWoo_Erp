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
  type CustomerPayload,
} from "@/services/apiClient";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";

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

export default function CreateQuotationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("create");
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [quotationNo, setQuotationNo] = useState(getNextQuotationNumber());
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [membership, setMembership] = useState("");
  const [quotationDate, setQuotationDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const staff = useAppSelector((state) => state.user);
  const staffName = useAppSelector((state) => state.user.m_staff_name);
  const salesPerson = staffName ?? "Not Assigned";
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{ _id: string; name: string; mobile: string; companyName?: string }>
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
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    const state = location.state as { quotation?: any; mode?: Mode } | null;
    if (state?.mode && state?.quotation) {
        setMode(state.mode);
        const quot = state.quotation;
        setQuotationId(quot._id);
        if (quot.quotationCode) setQuotationNo(quot.quotationCode);
        setCustomer(quot.customerName || "");
        setPhone(quot.customerPhone || "");
        if (quot.quotationDate) setQuotationDate(new Date(quot.quotationDate).toISOString().split("T")[0]);
        if (quot.dueDate) setDueDate(new Date(quot.dueDate).toISOString().split("T")[0]);
        setNotes(quot.notes || "");
        if (Array.isArray(quot.items)) {
            setItems(quot.items.map((item: any, idx: number) => ({
                id: idx + 1,
                productName: item.productName || "",
                qty: item.qty || 1,
                unitPrice: item.unitPrice || 0,
                discount: item.discount || 0,
                cashback: item.cashback || 0,
                image: item.image || item.imageUrl || "",
            })));
        }
    }
  }, [location.state]);
  const draft = {
    name: draftName,
    qty: draftQty,
    price: draftPrice,
    discount: draftDiscount,
    cashback: draftCashback,
    image: draftImage,
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
      },
    ]);
    setDraftName("");
    setDraftQty("1");
    setDraftPrice("0");
    setDraftDiscount("0");
    setDraftCashback("0");
    setDraftImage("");
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemQty = (id: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: newQty } : item)),
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
  const grandTotal = subTotal - discountTotal;


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
          String(paymentPayload?.invoicedBy || "").trim() || salesPerson,
        notes: (paymentPayload?.notes || notes).trim(),
        items: items.map((item) => ({
          productName: item.productName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount,
          cashback: item.cashback,
        })),
        subTotal,
        discountTotal,
        grandTotal: paymentPayload?.finalAmount ?? grandTotal,
        status: "draft" as const,
      };

      if (paymentPayload) {
        payload.mode = paymentPayload.mode;
        payload.paymentStatus = paymentPayload.paymentStatus;
        payload.paymentBreakdown = paymentPayload.paymentBreakdown;
        if (paymentPayload.coupon) payload.coupon = paymentPayload.coupon;
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
        setMembership(String(created.membershipType ?? ""));
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
        title={mode === "create" ? "Create Quotation" : mode === "edit" ? "Edit Quotation" : "View Quotation"}
        prefix="QUOT- "
        invoiceNo={quotationNo}
        onBack={() => navigate(-1)}
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
        customerOptions={customers}
        loadingCustomers={loadingCustomers}
        customerDropdownOpen={customerDropdownOpen}
        invoiceDate={quotationDate}
        dueDate={dueDate}
        dueDateMin={today}
        salesPerson={salesPerson}
        onCustomerChange={(value) => {
          setCustomer(value);
          setPhone("");
          setMembership("");
        }}
        onPickCustomer={(selectedCustomer) => {
          setCustomer(selectedCustomer.name);
          setPhone(selectedCustomer.mobile);
          setMembership(selectedCustomer.membershipType ?? "");
          setCustomers([]);
          setCustomerDropdownOpen(false);
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
        onDraftChange={(field, value) => {
          if (field === "name") setDraftName(value);
          if (field === "qty") setDraftQty(value);
          if (field === "price") setDraftPrice(value);
          if (field === "discount") setDraftDiscount(value);
          if (field === "cashback") setDraftCashback(value);
          if (field === "image") setDraftImage(value);
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
          subTotal={subTotal}
          discountTotal={discountTotal}
          grandTotal={grandTotal}
          onSave={
            mode !== "view"
              ? () => setCheckoutOpen(true)
              : () => {}
          }
          isSaving={saving}
        />
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        grandTotal={grandTotal}
        items={items.map((it) => ({
          name: it.productName,
          qty: it.qty,
          price: it.unitPrice,
          discount: it.discount,
          cashback: it.cashback,
          image: it.image,
        }))}
        initialCustomerName={customer}
        initialCustomerPhone={phone}
        initialMembership={membership}
        onConfirmPayment={async (paymentPayload) => {
          await handleSaveDraft(paymentPayload);
          setCheckoutOpen(false);
        }}
      />
      </div>
    </div>
  );
}
