import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import InvoiceDetailsSection from "../components/invoice/InvoiceDetailsSection";
import InvoiceSummaryCard from "../components/invoice/InvoiceSummaryCard";
import NotesSection from "../components/invoice/NotesSection";
import ProductsServicesSection from "../components/invoice/ProductsServicesSection";
import type { InvoiceItem } from "../components/invoice/types";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleCreateCustomer,
  handleCreateReturnSale,
  handleUpdateReturnSale,
  handleGetCustomers,
  type CustomerPayload,
} from "@/services/apiClient";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import CreateSalesReturnHeader from "../components/invoice/CreateSalesReturnHeader";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";
import DocumentFormModal from "@/components/DocumentFormModal";
import {
  resolveBilledBy,
  resolveCreatedByName,
} from "../utils/resolveBilledBy";
import { printThermalReceipt } from "@/utils/printUtils";


const today = new Date().toISOString().split("T")[0];
const RETURN_SEQ_KEY = "wooerp-return-seq";

const getNextReturnNumber = (): string => {
  const fallback = 1000;
  try {
    const currentRaw = localStorage.getItem(RETURN_SEQ_KEY);
    const current = currentRaw ? Number(currentRaw) : fallback;
    const next = Number.isFinite(current) ? current + 1 : fallback + 1;
    localStorage.setItem(RETURN_SEQ_KEY, String(next));
    return String(next);
  } catch {
    return String(fallback + 1);
  }
};

type Mode = "create" | "edit" | "view";

type CreateSalesReturnScreenProps = {
  onClose?: () => void;
  initialData?: any;
  initialMode?: Mode;
};

export default function CreateSalesReturnScreen({
  onClose,
  initialData,
  initialMode,
}: CreateSalesReturnScreenProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>(initialMode || "create");
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);
  const [originalInvoiceId, setOriginalInvoiceId] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState(getNextReturnNumber());
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const staff = useAppSelector((state) => state.user);
  const staffName = useAppSelector((state) => state.user.m_staff_name);
  const salesPerson = staffName ?? "Not Assigned";
  const [createdByDisplay, setCreatedByDisplay] = useState(salesPerson);
  const [billBy, setBillBy] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{ _id: string; name: string; mobile: string; companyName?: string }>
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
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    type Line = {
      productName?: string;
      qty?: number;
      unitPrice?: number;
      discount?: number;
    };
    type Doc = {
      _id?: string;
      returnCode?: string;
      invoiceCode?: string;
      customerName?: string;
      customerPhone?: string;
      invoiceDate?: string;
      dueDate?: string;
      notes?: string;
      items?: Line[];
      originalInvoiceId?: string | null;
      salesPersonName?: string;
      billBy?: string;
      billedBy?: string;
      invoiceBy?: {
        staffName?: string;
        name?: string;
      };
      createdBy?: { m_staff_name?: string | null };
    };

    const applyDoc = (doc: Doc, nextMode: Mode, idField: "return" | "invoice") => {
      setMode(nextMode);
      if (idField === "return" && doc._id) setReturnSaleId(String(doc._id));
      if (doc.returnCode) setInvoiceNo(String(doc.returnCode));
      else if (doc.invoiceCode) setInvoiceNo(String(doc.invoiceCode));
      setCustomer(doc.customerName || "");
      setPhone(doc.customerPhone || "");
      if (doc.invoiceDate) {
        setInvoiceDate(new Date(doc.invoiceDate).toISOString().split("T")[0]);
      }
      if (doc.dueDate) {
        setDueDate(new Date(doc.dueDate).toISOString().split("T")[0]);
      }
      setNotes(doc.notes || "");
      setCreatedByDisplay(resolveCreatedByName(doc, salesPerson));
      setBillBy(
        resolveBilledBy(doc) || String(doc.salesPersonName ?? "").trim(),
      );
      if (Array.isArray(doc.items)) {
        setItems(
          doc.items.map((item, idx) => ({
            id: idx + 1,
            productName: item.productName || "",
            qty: item.qty ?? 1,
            unitPrice: item.unitPrice ?? 0,
            discount: item.discount ?? 0,
            cashback: 0,
          })),
        );
      }
    };

    if (initialData && initialMode) {
      setOriginalInvoiceId(
        initialData.originalInvoiceId
          ? String(initialData.originalInvoiceId)
          : null,
      );
      applyDoc(initialData, initialMode, "return");
      return;
    }

    const state = location.state as {
      mode?: Mode;
      invoice?: Doc;
      returnSale?: Doc;
    } | null;

    if (state?.returnSale) {
      setOriginalInvoiceId(
        state.returnSale.originalInvoiceId
          ? String(state.returnSale.originalInvoiceId)
          : null,
      );
      applyDoc(state.returnSale, state.mode ?? "edit", "return");
      return;
    }

    if (state?.invoice) {
      const inv = state.invoice;
      const isReturnDoc = Boolean(inv.returnCode);
      if (isReturnDoc) {
        setOriginalInvoiceId(
          inv.originalInvoiceId ? String(inv.originalInvoiceId) : null,
        );
        applyDoc(inv, state.mode ?? "edit", "return");
        return;
      }
      setMode(state.mode ?? "create");
      setReturnSaleId(null);
      setOriginalInvoiceId(inv._id ? String(inv._id) : null);
      if (inv.invoiceCode) setInvoiceNo(String(inv.invoiceCode));
      setCustomer(inv.customerName || "");
      setPhone(inv.customerPhone || "");
      if (inv.invoiceDate) {
        setInvoiceDate(new Date(inv.invoiceDate).toISOString().split("T")[0]);
      }
      if (inv.dueDate) {
        setDueDate(new Date(inv.dueDate).toISOString().split("T")[0]);
      }
      setNotes(inv.notes || "");
      if (Array.isArray(inv.items)) {
        setItems(
          inv.items.map((item, idx) => ({
            id: idx + 1,
            productName: item.productName || "",
            qty: item.qty ?? 1,
            unitPrice: item.unitPrice ?? 0,
            discount: item.discount ?? 0,
          })),
        );
      }
    }
  }, [location.state, initialData, initialMode]);
  const draft = {
    name: draftName,
    qty: draftQty,
    price: draftPrice,
    discount: draftDiscount,
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
    if (qty <= 0 || price < 0 || discount < 0) {
      Swal.fire("Invalid values", "Check quantity, price and discount.", "error");
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
        cashback: 0,
        image: draftImage,
      },
    ]);
    setDraftName("");
    setDraftQty("1");
    setDraftPrice("0");
    setDraftDiscount("0");
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

  const subTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [items],
  );
  const discountTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.discount, 0),
    [items],
  );
  const grandTotal = subTotal - discountTotal;


  const buildPayload = (
    status: "draft" | "final",
    payment?: {
      invoiceBy?: {
        staffId?: string;
        staffName?: string;
        employeeId?: string;
        email?: string;
      };
    },
  ) => {
    const pinName = String(payment?.invoiceBy?.staffName ?? "").trim();
    return {
      customerName: customer.trim(),
      customerPhone: phone.trim(),
      invoiceDate,
      dueDate,
      salesPersonName: pinName || salesPerson,
      billBy: pinName || billBy || undefined,
      invoiceBy: payment?.invoiceBy
        ? {
            staffId: payment.invoiceBy.staffId,
            staffName: payment.invoiceBy.staffName,
            employeeId: payment.invoiceBy.employeeId,
            email: payment.invoiceBy.email,
          }
        : billBy
          ? { staffName: billBy }
          : undefined,
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
      status,
      ...(originalInvoiceId ? { originalInvoiceId } : {}),
      createdBy: {
        m_staff_id: staff.m_staff_id,
        m_staff_name: staff.m_staff_name,
        m_staff_email: staff.m_staff_email,
      },
    };
  };

  const handleSaveDraft = async () => {
    if (!customer.trim() || !phone.trim() || !items.length) {
      Swal.fire("Incomplete", "Customer, phone, and at least one line item are required.", "warning");
      return;
    }
    try {
      setSaving(true);
      if (mode === "edit" && returnSaleId) {
        await handleUpdateReturnSale(returnSaleId, buildPayload("draft"));
        Swal.fire("Draft saved", "Sales return draft updated.", "success");
      } else {
        await handleCreateReturnSale(buildPayload("draft"));
        Swal.fire("Draft saved", "Sales return saved as draft.", "success").then(() => navigate(-1));
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save draft.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrint = () => {
    void handleSave();
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
      Swal.fire("No items", "Add at least one product in return.", "warning");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (mode === "edit" && returnSaleId) {
        await handleUpdateReturnSale(returnSaleId, buildPayload("final"));

        printThermalReceipt({
          invoiceNo: invoiceNo,
          customerName: customer.trim(),
          customerPhone: phone.trim(),
          documentType: "SALES RETURN",
          items: items.map((item) => ({
            name: item.productName,
            qty: item.qty,
            price: item.unitPrice,
            discount: item.discount,
          })),
          totalMRP: items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
          discountTotal: discountTotal,
          finalAmount: grandTotal,
          totalDue: 0,
          totalQty: items.reduce((sum, item) => sum + item.qty, 0),
        });

        Swal.fire("Return Updated", "Sales Return updated successfully.", "success").then(() => navigate(-1));
      } else {
        const response = await handleCreateReturnSale(buildPayload("final"));

        const savedCode = response?.returnSale?.returnCode || invoiceNo;

        printThermalReceipt({
          invoiceNo: savedCode,
          customerName: customer.trim(),
          customerPhone: phone.trim(),
          documentType: "SALES RETURN",
          items: items.map((item) => ({
            name: item.productName,
            qty: item.qty,
            price: item.unitPrice,
            discount: item.discount,
          })),
          totalMRP: items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
          discountTotal: discountTotal,
          finalAmount: grandTotal,
          totalDue: 0,
          totalQty: items.reduce((sum, item) => sum + item.qty, 0),
        });

        Swal.fire(
          "Return Saved",
          response?.returnSale?.returnCode
            ? `Sales Return ${response.returnSale.returnCode} saved successfully.`
            : "Sales Return saved successfully.",
          "success",
        ).then(() => navigate(-1));
      }
    } catch (error: unknown) {
      const err = error as {response?: {data?: {message?: string}}};
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save return. Try again.",
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
    <div className="space-y-4 p-2">
      <CreateSalesReturnHeader
        invoiceNo={invoiceNo}
        onBack={handleBack}
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
        dateLabel="Return Date"
        customerOptions={customers}
        loadingCustomers={loadingCustomers}
        customerDropdownOpen={mode !== "view" && customerDropdownOpen}
        invoiceDate={invoiceDate}
        dueDate={dueDate}
        dueDateMin={today}
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
        }}
        onPickCustomer={(selectedCustomer) => {
          setCustomer(selectedCustomer.name);
          setPhone(selectedCustomer.mobile);
          setCustomers([]);
          setCustomerDropdownOpen(false);
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
        onDraftChange={(field, value) => {
          if (field === "name") setDraftName(value);
          if (field === "qty") setDraftQty(value);
          if (field === "price") setDraftPrice(value);
          if (field === "discount") setDraftDiscount(value);
          if (field === "image") setDraftImage(value);
        }}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItemQty={updateItemQty}
        onUpdateItemDiscount={updateItemDiscount}
        onAddDirectItem={(newItem) => {
          setItems((prev) => {
            const nextId = prev.length > 0 ? Math.max(...prev.map((i) => i.id)) + 1 : 1;
            return [...prev, { ...newItem, id: nextId, cashback: Number(newItem.cashback ?? 0) }];
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
          readOnly={mode === "view"}
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
      {mode !== "view" && (
        <CheckoutModal
          open={openCheckout}
          grandTotal={grandTotal}
          items={items.map((item) => ({
            id: item.id,
            name: item.productName,
            qty: item.qty,
            price: item.unitPrice,
            discount: item.discount,
          }))}
          initialCustomerName={customer}
          initialCustomerPhone={phone}
          initialMembership=""
          onClose={() => setOpenCheckout(false)}
          onConfirmPayment={async (payment) => {
            setOpenCheckout(false);
            const pinName = String(payment?.invoiceBy?.staffName ?? "").trim();
            if (pinName) setBillBy(pinName);
            try {
              setSaving(true);
              if (mode === "edit" && returnSaleId) {
                await handleUpdateReturnSale(
                  returnSaleId,
                  buildPayload("final", payment),
                );
                printThermalReceipt({
                  invoiceNo: invoiceNo,
                  customerName: customer.trim(),
                  customerPhone: phone.trim(),
                  documentType: "SALES RETURN",
                  items: items.map((item) => ({
                    name: item.productName,
                    qty: item.qty,
                    price: item.unitPrice,
                    discount: item.discount,
                  })),
                  totalMRP: items.reduce(
                    (sum, item) => sum + item.qty * item.unitPrice,
                    0,
                  ),
                  discountTotal: discountTotal,
                  finalAmount: grandTotal,
                  totalDue: 0,
                  totalQty: items.reduce((sum, item) => sum + item.qty, 0),
                });
                Swal.fire(
                  "Return Updated",
                  "Sales Return updated successfully.",
                  "success",
                ).then(() => navigate(-1));
              } else {
                const response = await handleCreateReturnSale(
                  buildPayload("final", payment),
                );
                const savedCode =
                  response?.returnSale?.returnCode || invoiceNo;
                printThermalReceipt({
                  invoiceNo: savedCode,
                  customerName: customer.trim(),
                  customerPhone: phone.trim(),
                  documentType: "SALES RETURN",
                  items: items.map((item) => ({
                    name: item.productName,
                    qty: item.qty,
                    price: item.unitPrice,
                    discount: item.discount,
                  })),
                  totalMRP: items.reduce(
                    (sum, item) => sum + item.qty * item.unitPrice,
                    0,
                  ),
                  discountTotal: discountTotal,
                  finalAmount: grandTotal,
                  totalDue: 0,
                  totalQty: items.reduce((sum, item) => sum + item.qty, 0),
                });
                Swal.fire(
                  "Return Saved",
                  response?.returnSale?.returnCode
                    ? `Sales Return ${response.returnSale.returnCode} saved successfully.`
                    : "Sales Return saved successfully.",
                  "success",
                ).then(() => navigate(-1));
              }
            } catch (error: unknown) {
              const err = error as {
                response?: { data?: { message?: string } };
              };
              Swal.fire(
                "Save failed",
                err?.response?.data?.message ??
                  "Could not save return. Try again.",
                "error",
              );
            } finally {
              setSaving(false);
            }
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
