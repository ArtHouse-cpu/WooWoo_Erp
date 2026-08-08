import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleCreatePurchaseReturn,
  handleCreateVendor,
  handleGetVendors,
  handleUpdatePurchaseReturn,
  type PurchaseReturnPayload,
  type VendorPayload,
} from "@/services/apiClient";
import CreatePurchaseReturnHeader from "../components/CreatePurchaseReturnHeader";
import PurchaseReturnServicesSection, { type DraftItem } from "../components/PurchaseReturnServicesSection";
import PurchaseReturnDetailSection from "../components/PurchaseReturnDetailsSection";
import PurchaseSummaryCard from "../components/PurchaseSummaryCard";
import NotesSection from "@/features/sales/components/invoice/NotesSection";
import AddVendorModal from "../Modal/AddVendorModal";
import type { InvoiceItem } from "../components/types";
import { useAppSelector } from "@/store/hooks";
import CheckoutModal from "@/features/sales/components/invoice/Modal/CheckoutModal";
import DocumentFormModal from "@/components/DocumentFormModal";

const today = new Date().toISOString().split("T")[0];
const PURCHASE_RETURN_SEQ_KEY = "wooerp-purchase-return-seq";

const getNextReturnNumber = (): string => {
  const fallback = 12000;
  try {
    const currentRaw = localStorage.getItem(PURCHASE_RETURN_SEQ_KEY);
    const current = currentRaw ? Number(currentRaw) : fallback;
    const next = Number.isFinite(current) ? current + 1 : fallback + 1;
    localStorage.setItem(PURCHASE_RETURN_SEQ_KEY, String(next));
    return String(next);
  } catch {
    return String(fallback + 1);
  }
};

type Mode = "create" | "edit" | "view";
type VendorOption = { _id: string; name: string; mobile: string; companyName?: string };

type CreatePurchaseReturnScreenProps = {
  onClose?: () => void;
  initialData?: any;
  initialMode?: Mode;
};

export default function CreatePurchaseReturnScreen({
  onClose,
  initialData,
  initialMode,
}: CreatePurchaseReturnScreenProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>(initialMode || "create");
  const [purchaseReturnId, setPurchaseReturnId] = useState<string | null>(null);
  const [purchaseReturnNo, setPurchaseReturnNo] = useState(getNextReturnNumber());
  const [vendor, setVendor] = useState("");
  const [phone, setPhone] = useState("");
  const [returnDate, setReturnDate] = useState(today);
  const purchaser = useAppSelector((state) => state.user.m_staff_name) ?? "Not Assigned";
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [allVendors, setAllVendors] = useState<VendorOption[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(true);
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);
  const [creatingVendor, setCreatingVendor] = useState(false);

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
      image?: string;
      imageUrl?: string;
    };
    type Doc = {
      _id?: string;
      invoiceNumber?: string;
      supplierName?: string;
      vendorPhone?: string;
      mobile?: string;
      invoiceDate?: string;
      notes?: string;
      items?: Line[];
      status?: string;
      purchaser?: string;
    };

    const applyDoc = (doc: Doc, nextMode: Mode) => {
      setMode(nextMode);
      setPurchaseReturnId(doc._id ? String(doc._id) : null);
      if (doc.invoiceNumber) setPurchaseReturnNo(String(doc.invoiceNumber));
      setVendor(String(doc.supplierName ?? ""));
      setPhone(String(doc.vendorPhone ?? doc.mobile ?? ""));
      if (doc.invoiceDate) {
        setReturnDate(new Date(doc.invoiceDate).toISOString().split("T")[0]);
      }
      setNotes(String(doc.notes ?? ""));
      if (Array.isArray(doc.items)) {
        setItems(
          doc.items.map((item, idx) => ({
            id: idx + 1,
            productName: item.productName || "",
            qty: Number(item.qty ?? 1),
            unitPrice: Number(item.unitPrice ?? 0),
            discount: Number(item.discount ?? 0),
            image: item.image || item.imageUrl || "",
          })),
        );
      }
    };

    if (initialData && initialMode) {
      applyDoc(initialData, initialMode);
      return;
    }

    const state = location.state as { mode?: Mode; purchaseReturn?: Doc; purchase?: Doc } | null;
    const doc = state?.purchaseReturn ?? state?.purchase;
    if (!doc) return;
    applyDoc(doc, state?.mode ?? "edit");
  }, [location.state, initialData, initialMode]);

  const draft: DraftItem = {
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
    status: "draft" | "pending" | "paid" | "partial" = "pending",
    paymentMode?: "Cash" | "UPI" | "Card" | "Bank" | "Credit" | "Other",
  ): PurchaseReturnPayload => ({
    invoiceNumber: purchaseReturnNo,
    invoiceDate: returnDate,
    supplierName: vendor.trim(),
    purchaser: purchaser||"not assigned",
    vendorDate: returnDate,
    amount: grandTotal,
    paymentMode,
    notes: notes.trim(),
    items: items.map((item) => ({
      productName: item.productName,
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: item.discount,
      image: item.image,
    })),
    status,
  });

  const handleSaveDraft = async () => {
    if (!vendor.trim() || !phone.trim() || !items.length) {
      Swal.fire("Incomplete", "Vendor, phone, and at least one line item are required.", "warning");
      return;
    }
    try {
      setSaving(true);
      if (mode === "edit" && purchaseReturnId) {
        await handleUpdatePurchaseReturn(purchaseReturnId, buildPayload("draft"));
        Swal.fire("Draft saved", "Purchase return draft updated.", "success");
      } else {
        await handleCreatePurchaseReturn(buildPayload("draft"));
        Swal.fire("Draft saved", "Purchase return saved as draft.", "success").then(() =>
          navigate(-1),
        );
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
    void handleSave("pending");
  };

  const validateBeforeCheckout = () => {
    if (!vendor.trim()) {
      Swal.fire("Vendor required", "Please select or enter vendor.", "warning");
      return false;
    }
    if (!phone.trim()) {
      Swal.fire("Phone required", "Please enter vendor phone number.", "warning");
      return false;
    }
    if (!items.length) {
      Swal.fire("No items", "Add at least one product in purchase return.", "warning");
      return false;
    }
    return true;
  };

  const handleSave = async (
    status: "pending" | "paid" | "partial" = "pending",
    payment?: { mode: string; paymentStatus: "full" | "partial" },
  ) => {
    const formattedMode = payment?.mode
      ? (payment.mode.toUpperCase() === "UPI"
          ? "UPI"
          : payment.mode.toUpperCase() === "MULTI"
          ? "Other"
          : payment.mode.charAt(0).toUpperCase() + payment.mode.slice(1).toLowerCase()) as any
      : undefined;

    try {
      setSaving(true);
      if (mode === "edit" && purchaseReturnId) {
        await handleUpdatePurchaseReturn(purchaseReturnId, buildPayload(status, formattedMode));
        Swal.fire("Return Updated", "Purchase return updated successfully.", "success").then(
          () => navigate(-1),
        );
      } else {
        const response = await handleCreatePurchaseReturn(buildPayload(status, formattedMode));

        const savedCode = response?.purchaseReturn?.invoiceNumber;
        Swal.fire(
          "Return Saved",
          savedCode ? `Purchase Return ${savedCode} saved successfully.` : "Purchase return saved successfully.",
          "success",
        ).then(() => navigate(-1));
      }
    } catch (error: unknown) {
      const err = error as {response?: {data?: {message?: string}}};
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save purchase return. Try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const fetchVendors = async (signal?: AbortSignal) => {
    try {
      setLoadingVendors(true);
      const response = await handleGetVendors(signal);
      const list = Array.isArray(response?.vendors) ? response.vendors : [];
      setAllVendors(list);
      setVendors(list);
    } catch {
      setAllVendors([]);
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const debouncedVendor = useDebounce(vendor.trim(), 250);

  useEffect(() => {
    if (!vendorDropdownOpen) return;
    void fetchVendors();
  }, [vendorDropdownOpen]);

  useEffect(() => {
    if (!vendorDropdownOpen) return;
    if (!debouncedVendor) {
      setVendors(allVendors);
      return;
    }
    const term = debouncedVendor.toLowerCase();
    setVendors(
      allVendors.filter((item) =>
        [item.name, item.mobile, item.companyName].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(term),
        ),
      ),
    );
  }, [debouncedVendor, allVendors, vendorDropdownOpen]);

  const handleCreateVendorSubmit = async (args: { payload: VendorPayload }) => {
    try {
      setCreatingVendor(true);
      const response = await handleCreateVendor({
        name: args.payload.name,
        mobile: args.payload.mobile,
        email: args.payload.email,
        gstin: args.payload.gstin,
        companyName: args.payload.companyName,
        address: args.payload.address,
        city: args.payload.city,
        state: args.payload.state,
        country: args.payload.country,
      });
      const created = response?.vendor;
      if (created?.name) {
        setVendor(String(created.name));
        setPhone(String(created.mobile ?? ""));
      }
      setShowCreateVendorModal(false);
      await fetchVendors();
      Swal.fire("Vendor created", "Vendor saved successfully.", "success");
    } catch (error: unknown) {
      const err = error as {response?: {data?: {message?: string}}};
      Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create vendor. Try again.",
        "error",
      );
    } finally {
      setCreatingVendor(false);
    }
  };

  const handleBack = () => {
    if (onClose) onClose();
    else navigate(-1);
  };

  const content = (
    <div className="space-y-4 p-2">
      <CreatePurchaseReturnHeader
        purchaseNumber={purchaseReturnNo}
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
      <PurchaseReturnDetailSection
        customer={vendor}
        phone={phone}
        dateLabel="Return Date"
        selectorLabel="Select Vendor"
        createLabel="Create Vendor"
        phoneLabel="Vendor Phone"
        searchPlaceholder="Search vendor by name, company..."
        customerOptions={vendors}
        loadingCustomers={loadingVendors}
        customerDropdownOpen={mode !== "view" && vendorDropdownOpen}
        invoiceDate={returnDate}
        showDueDate={false}
        salesPerson={purchaser}
        onCustomerChange={(value) => {
          setVendor(value);
          setPhone("");
        }}
        onPickCustomer={(selectedVendor) => {
          setVendor(selectedVendor.name);
          setPhone(selectedVendor.mobile);
          setVendorDropdownOpen(false);
        }}
        onOpenCreateCustomer={() => setShowCreateVendorModal(true)}
        onOpenCustomerDropdown={() => setVendorDropdownOpen(true)}
        onCloseCustomerDropdown={() => setVendorDropdownOpen(false)}
        onPhoneChange={setPhone}
        onInvoiceDateChange={setReturnDate}
      />
      {showCreateVendorModal && (
        <AddVendorModal
          onClose={() => setShowCreateVendorModal(false)}
          onSubmit={handleCreateVendorSubmit}
          loading={creatingVendor}
        />
      )}
      <PurchaseReturnServicesSection
        draft={draft}
        items={items}
        onDraftChange={(field, value) => {
          if (field === "name") setDraftName(value);
          if (field === "qty") setDraftQty(value);
          if (field === "price") setDraftPrice(value);
          if (field === "discount") setDraftDiscount(value);
          if (field === "image") setDraftImage(value);
        }}
        onAddItem={addItem}
        onRemoveItem={removeItem}
      />

      {/* <PaymentSection /> */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <NotesSection notes={notes} onChange={setNotes} />
        <PurchaseSummaryCard
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
          initialCustomerName={vendor}
          initialCustomerPhone={phone}
          initialMembership=""
          onClose={() => setOpenCheckout(false)}
          onConfirmPayment={async (payment) => {
            setOpenCheckout(false);
            await handleSave(payment.paymentStatus === "full" ? "paid" : "partial", payment);
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
