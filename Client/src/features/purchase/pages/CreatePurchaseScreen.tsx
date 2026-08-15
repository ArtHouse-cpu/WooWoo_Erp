import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/store/hooks";
import {
  handleCreatePurchase,
  handleCreateVendor,
  handleGetVendors,
  handleUpdatePurchase,
  purchasePayloadToFormData,
  type PurchasePayload,
  type VendorPayload,
} from "@/services/apiClient";
import CreatePurchaseHeader from "../components/CreatePurchaseHeader";
import PurchaseProductServiceScreen from "../components/PurchaseProductsServicesSection";
import PurchaseSummaryCard, {
  computeManualDiscountAmount,
  type ManualDiscountType,
} from "../components/PurchaseSummaryCard";
import NotesSection from "@/features/sales/components/invoice/NotesSection";
import InvoiceDetailsSection from "@/features/sales/components/invoice/InvoiceDetailsSection";
import AddVendorModal from "../Modal/AddVendorModal";
import type { InvoiceItem } from "../components/types";
import CheckoutModal from "@/features/sales/components/invoice/Modal/CheckoutModal";
import StaffVerifyModal from "@/features/sales/components/invoice/Modal/StaffVerifyModal";
import DocumentFormModal from "@/components/DocumentFormModal";
import FileAttachmentSection from "../components/FileAttachmentSection";

const today = new Date().toISOString().split("T")[0];
const PURCHASE_SEQ_KEY = "wooerp-purchase-seq";

const getNextPurchaseNumber = (): string => {
  const fallback = 10001;
  try {
    const currentRaw = localStorage.getItem(PURCHASE_SEQ_KEY);
    const current = currentRaw ? Number(currentRaw) : fallback;
    const next = Number.isFinite(current) ? current + 1 : fallback + 1;
    localStorage.setItem(PURCHASE_SEQ_KEY, String(next));
    return String(next);
  } catch {
    return String(fallback + 1);
  }
};

type Mode = "create" | "edit" | "view";
type VendorOption = { _id: string; name: string; mobile: string; companyName?: string };

type CreatePurchaseScreenProps = {
  onClose?: () => void;
  initialData?: any;
  initialMode?: Mode;
};

export default function CreatePurchaseScreen({
  onClose,
  initialData,
  initialMode,
}: CreatePurchaseScreenProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const staffName = useAppSelector((state) => state.user.m_staff_name);
  const createdByDefault = staffName ?? "Not Assigned";

  const [mode, setMode] = useState<Mode>(initialMode || "create");
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [purchaseNumber, setPurchaseNumber] = useState(getNextPurchaseNumber());
  const [vendor, setVendor] = useState("");
  const [phone, setPhone] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [showStaffVerify, setShowStaffVerify] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [createdByName, setCreatedByName] = useState(createdByDefault);
  const [billBy, setBillBy] = useState("");

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
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualDiscountType, setManualDiscountType] =
    useState<ManualDiscountType>("flat");
  const [savedPaymentInfo, setSavedPaymentInfo] = useState<{
    purchaseType?: string;
    status?: string;
    paidAmount?: number;
    dueAmount?: number;
  } | null>(null);

  useEffect(() => {
    const applyPurchase = (purchase: any, nextMode: Mode) => {
      setMode(nextMode);
      setPurchaseId(purchase._id ?? null);
      if (purchase.invoiceNumber) setPurchaseNumber(String(purchase.invoiceNumber));
      setVendor(String(purchase.supplierName ?? ""));
      setPhone(
        String(
          purchase.supplierContact ??
            purchase.phoneNumber ??
            purchase.vendorPhone ??
            purchase.mobile ??
            "",
        ),
      );
      if (purchase.invoiceDate) {
        setPurchaseDate(new Date(purchase.invoiceDate).toISOString().split("T")[0]);
      }
      setNotes(String(purchase.notes ?? ""));
      setCreatedByName(
        String(
          purchase.createdByName ??
            purchase.purchaser ??
            createdByDefault,
        ),
      );
      setBillBy(
        String(
          purchase.billBy ??
            purchase.invoiceBy?.staffName ??
            "",
        ),
      );
      setVendorDropdownOpen(false);
      setManualDiscount(Math.max(0, Number(purchase.manualDiscount ?? 0) || 0));
      setManualDiscountType(
        purchase.manualDiscountType === "percentage" ? "percentage" : "flat",
      );
      setSavedPaymentInfo({
        purchaseType: purchase.purchaseType,
        status: purchase.status,
        paidAmount: Number(purchase.paidAmount ?? 0),
        dueAmount: Number(purchase.dueAmount ?? 0),
      });
      if (Array.isArray(purchase.items)) {
        setItems(
          purchase.items.map((item: any, idx: number) => ({
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
      applyPurchase(initialData, initialMode);
      return;
    }

    const state = location.state as { purchase?: any; mode?: Mode } | null;
    if (!state?.mode || !state?.purchase) return;
    applyPurchase(state.purchase, state.mode);
  }, [location.state, initialData, initialMode]);

  const draft = { name: draftName, qty: draftQty, price: draftPrice, discount: draftDiscount, image: draftImage };

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
      { id: prev.length + 1, productName: draftName.trim(), qty, unitPrice: price, discount, image: draftImage },
    ]);
    setDraftName("");
    setDraftQty("1");
    setDraftPrice("0");
    setDraftDiscount("0");
    setDraftImage("");
  };

  const addDirectItem = (item: Omit<InvoiceItem, "id">) => {
    setItems((prev) => {
      const existing = prev.find(
        (row) =>
          row.productName.toLowerCase() ===
          String(item.productName || "").toLowerCase(),
      );
      if (existing) {
        return prev.map((row) =>
          row.id === existing.id
            ? { ...row, qty: row.qty + Number(item.qty || 1) }
            : row,
        );
      }
      return [
        ...prev,
        {
          id: prev.length + 1,
          productName: item.productName,
          qty: Number(item.qty || 1),
          unitPrice: Number(item.unitPrice || 0),
          sellingPrice:
            item.sellingPrice != null
              ? Number(item.sellingPrice)
              : undefined,
          discount: Number(item.discount || 0),
          image: item.image || "",
        },
      ];
    });
  };

  const updateItemQty = (id: number, newQty: number) => {
    if (newQty <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: newQty } : item)),
    );
  };

  const updateItemDiscount = (id: number, newDiscount: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, discount: Math.max(0, Number(newDiscount) || 0) }
          : item,
      ),
    );
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
  const safeManualDiscount = Math.max(0, Number(manualDiscount) || 0);
  const appliedManualDiscount = computeManualDiscountAmount(
    subTotal,
    discountTotal,
    safeManualDiscount,
    manualDiscountType,
  );
  const grandTotal = Math.max(0, subTotal - discountTotal - appliedManualDiscount);

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
    if (mode === "view" || !vendorDropdownOpen) return;
    void fetchVendors();
  }, [vendorDropdownOpen, mode]);

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

  const handleSaveDraft = async () => {
    await handleSave("draft");
  };

  const handleSavePrint = async () => {
    await handleSave("pending");
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
      Swal.fire("No items", "Add at least one product in purchase.", "warning");
      return false;
    }
    return true;
  };

  const handleSave = async (
    status: "draft" | "pending" | "paid" | "partial" | "due" = "paid",
    payment?: {
      mode: string;
      paymentStatus: "full" | "partial";
      purchaseType?: "cash" | "credit";
      paidAmount?: number;
      dueAmount?: number;
      invoiceBy?: {
        staffId?: string;
        staffName?: string;
        employeeId?: string;
        email?: string;
      } | null;
    },
  ) => {
    try {
      setSaving(true);
      const pinBillBy = String(payment?.invoiceBy?.staffName ?? "").trim();
      if (pinBillBy) setBillBy(pinBillBy);
      const isCredit =
        payment?.purchaseType === "credit" ||
        String(payment?.mode || "").toUpperCase() === "CREDIT";
      const payload: PurchasePayload = {
        invoiceNumber: purchaseNumber,
        invoiceDate: purchaseDate,
        supplierName: vendor.trim(),
        phoneNumber: phone.trim(),
        purchaser: createdByName || createdByDefault,
        createdByName: createdByName || createdByDefault,
        billBy: pinBillBy || billBy || undefined,
        invoiceBy: payment?.invoiceBy
          ? {
              staffId: payment.invoiceBy.staffId,
              staffName: payment.invoiceBy.staffName,
              employeeId: payment.invoiceBy.employeeId,
              email: payment.invoiceBy.email,
            }
          : undefined,
        vendorDate: purchaseDate,
        amount: grandTotal,
        manualDiscount: safeManualDiscount,
        manualDiscountType,
        purchaseType: isCredit ? "credit" : "cash",
        status: isCredit ? "due" : status,
        paidAmount: isCredit ? 0 : Number(payment?.paidAmount ?? (status === "paid" ? grandTotal : 0)),
        dueAmount: isCredit
          ? grandTotal
          : Number(payment?.dueAmount ?? (status === "paid" ? 0 : grandTotal)),
        paymentMode: isCredit
          ? "Credit"
          : payment?.mode
          ? (payment.mode.toUpperCase() === "UPI"
              ? "UPI"
              : payment.mode.toUpperCase() === "MULTI"
              ? "Other"
              : payment.mode.charAt(0).toUpperCase() + payment.mode.slice(1).toLowerCase()) as PurchasePayload["paymentMode"]
          : undefined,
        notes: notes.trim(),
        items: items.map((item) => ({
          productName: item.productName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount,
          image: item.image,
        })),
      };

      const finalPayload = attachments.length > 0 
        ? purchasePayloadToFormData(payload, attachments)
        : payload;

      if (mode === "edit" && purchaseId) {
        await handleUpdatePurchase(purchaseId, finalPayload as any);
        Swal.fire("Purchase Updated", "Purchase updated successfully.", "success").then(() =>
          navigate(-1),
        );
        return;
      }

      await handleCreatePurchase(finalPayload);
      Swal.fire("Purchase Saved", "Purchase saved successfully.", "success").then(() =>
        navigate(-1),
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save purchase. Try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

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
      const err = error as { response?: { data?: { message?: string } } };
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
    <div className="min-w-0 space-y-4 p-1 sm:p-2">
      <CreatePurchaseHeader
        purchaseNumber={purchaseNumber}
        onBack={handleBack}
        onSaveDraft={() => void handleSaveDraft()}
        onSavePrint={() => void handleSavePrint()}
        onSave={() => {
          if (validateBeforeCheckout()) setOpenCheckout(true);
        }}
        isSaving={saving}
        mode={mode}
      />

      <div className={mode === "view" ? "pointer-events-none opacity-90" : ""}>
        <InvoiceDetailsSection
          customer={vendor}
          phone={phone}
          customerOptions={vendors}
          loadingCustomers={loadingVendors}
          customerDropdownOpen={mode !== "view" && vendorDropdownOpen}
          invoiceDate={purchaseDate}
          salesPerson={createdByName || createdByDefault}
          billBy={
            mode === "view" || mode === "edit" ? billBy || "—" : undefined
          }
          dateLabel="Purchase Date"
          selectorLabel="Select Vendor"
          createLabel="Create Vendor"
          phoneLabel="Vendor Phone"
          searchPlaceholder="Search vendor by name, company..."
          showDueDate={false}
          readOnly={mode === "view"}
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
          onInvoiceDateChange={setPurchaseDate}
        />

        {showCreateVendorModal && mode !== "view" && (
          <AddVendorModal
            onClose={() => setShowCreateVendorModal(false)}
            onSubmit={handleCreateVendorSubmit}
            loading={creatingVendor}
          />
        )}

        <PurchaseProductServiceScreen
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
          onUpdateItemQty={mode === "view" ? undefined : updateItemQty}
          onUpdateItemDiscount={mode === "view" ? undefined : updateItemDiscount}
          onAddDirectItem={addDirectItem}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            <NotesSection notes={notes} onChange={setNotes} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" />
            {mode !== "view" && (
              <FileAttachmentSection files={attachments} onFilesChange={setAttachments} />
            )}
          </div>
          <PurchaseSummaryCard
            subTotal={subTotal}
            discountTotal={discountTotal}
            manualDiscount={safeManualDiscount}
            manualDiscountType={manualDiscountType}
            onManualDiscountChange={
              mode !== "view" ? setManualDiscount : undefined
            }
            onManualDiscountTypeChange={
              mode !== "view" ? setManualDiscountType : undefined
            }
            readOnly={mode === "view"}
            grandTotal={grandTotal}
            onSave={
              mode !== "view"
                ? () => {
                    if (validateBeforeCheckout()) setOpenCheckout(true);
                  }
                : () => {}
            }
            onCredit={
              mode !== "view"
                ? () => {
                    if (!validateBeforeCheckout()) return;
                    setShowStaffVerify(true);
                  }
                : undefined
            }
            paymentInfo={
              mode === "view" || mode === "edit"
                ? savedPaymentInfo ?? undefined
                : undefined
            }
            isSaving={saving}
          />
        </div>
      </div>
      {mode !== "view" && (
        <CheckoutModal
          open={openCheckout}
          checkoutContext="purchase"
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
            const isCredit =
              payment.purchaseType === "credit" ||
              String(payment.mode || "").toUpperCase() === "CREDIT";
            await handleSave(
              isCredit
                ? "due"
                : payment.paymentStatus === "full"
                  ? "paid"
                  : "partial",
              payment,
            );
          }}
        />
      )}

      <StaffVerifyModal
        open={showStaffVerify}
        onClose={() => setShowStaffVerify(false)}
        onVerified={({ staff }) => {
          setShowStaffVerify(false);
          void handleSave("due", {
            mode: "Credit",
            paymentStatus: "partial",
            purchaseType: "credit",
            paidAmount: 0,
            dueAmount: grandTotal,
            invoiceBy: {
              staffId: String(staff.staffId || staff._id || ""),
              staffName: String(staff.staffName || staff.name || "").trim(),
              employeeId: String(
                staff.employeeId || staff.m_staff_id || "",
              ).trim(),
              email: String(staff.email || "").trim(),
            },
          });
        }}
      />
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
