import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/store/hooks";
import {
  handleCreatePurchaseOrder,
  handleCreateVendor,
  handleGetVendors,
  handleUpdatePurchaseOrder,
  type PurchasePayload,
  type VendorPayload,
} from "@/services/apiClient";
import PurchaseProductServiceScreen from "../components/PurchaseProductsServicesSection";
import CreatePurchaseOrderHeader from "../components/CreatePurchaseOrderHeader";
import PurchaseOrderSummaryCard from "../components/PurchaseSummaryCard";
import NotesSection from "@/features/sales/components/invoice/NotesSection";
import InvoiceDetailsSection from "@/features/sales/components/invoice/InvoiceDetailsSection";
import AddVendorModal from "../Modal/AddVendorModal";
import type { InvoiceItem } from "@/features/sales/components/invoice/types";
import CheckoutModal from "@/features/sales/components/invoice/Modal/CheckoutModal";

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
type VendorOption = {
  _id: string;
  name: string;
  mobile: string;
  companyName?: string;
};

export default function CreatePurchaseOrderScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const staffName = useAppSelector((state) => state.user.m_staff_name);
  const purchaser = staffName ?? "Not Assigned";

  const [mode, setMode] = useState<Mode>("create");
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [purchaseOrderNo, setPurchaseOrderNo] = useState(
    getNextPurchaseNumber(),
  );
  const [vendor, setVendor] = useState("");
  const [phone, setPhone] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today);
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
    const state = location.state as { purchase?: any; mode?: Mode } | null;
    if (!state?.mode || !state?.purchase) return;

    setMode(state.mode);
    const purchase = state.purchase;
    setPurchaseId(purchase._id ?? null);
    if (purchase.invoiceNumber)
      setPurchaseOrderNo(String(purchase.invoiceNumber));
    setVendor(String(purchase.supplierName ?? ""));
    setPhone(String(purchase.vendorPhone ?? purchase.mobile ?? ""));
    if (purchase.invoiceDate) {
      setPurchaseDate(
        new Date(purchase.invoiceDate).toISOString().split("T")[0],
      );
    }
    setNotes(String(purchase.notes ?? ""));
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
  }, [location.state]);

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
      Swal.fire(
        "Invalid values",
        "Check quantity, price and discount.",
        "error",
      );
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
      Swal.fire(
        "Phone required",
        "Please enter vendor phone number.",
        "warning",
      );
      return false;
    }
    if (!items.length) {
      Swal.fire("No items", "Add at least one product in purchase.", "warning");
      return false;
    }
    return true;
  };

  const handleSave = async (
    status: "draft" | "pending" | "paid" | "partial" = "paid",
    payment?: { mode: string; paymentStatus: "full" | "partial" },
  ) => {

    try {
      setSaving(true);
      const payload: PurchasePayload = {
        invoiceNumber: purchaseOrderNo,
        invoiceDate: purchaseDate,
        supplierName: vendor.trim(),
        phoneNumber: phone.trim(),
        purchaser: purchaser,
        vendorDate: purchaseDate,
        amount: grandTotal,
        status,
        paymentMode: payment?.mode
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

      if (mode === "edit" && purchaseId) {
        await handleUpdatePurchaseOrder(purchaseId, payload);
        Swal.fire(
          "Purchase Updated",
          "Purchase updated successfully.",
          "success",
        ).then(() => navigate(-1));
        return;
      }

      await handleCreatePurchaseOrder(payload);
      Swal.fire(
        "Purchase Saved",
        "Purchase saved successfully.",
        "success",
      ).then(() => navigate(-1));
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

  return (
    <div className="space-y-4 p-2">
      <CreatePurchaseOrderHeader
        purchaseNumber={purchaseOrderNo}
        onBack={() => navigate(-1)}
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
          customerDropdownOpen={vendorDropdownOpen}
          invoiceDate={purchaseDate}
          salesPerson={purchaser}
          dateLabel="Purchase Date"
          selectorLabel="Select Vendor"
          createLabel="Create Vendor"
          phoneLabel="Vendor Phone"
          searchPlaceholder="Search vendor by name, company..."
          showDueDate={false}
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

        {showCreateVendorModal && (
          <AddVendorModal
            onClose={() => setShowCreateVendorModal(false)}
            onSubmit={handleCreateVendorSubmit}
            loading={creatingVendor}
          />
        )}

        <PurchaseProductServiceScreen
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <NotesSection notes={notes} onChange={setNotes} />
          <PurchaseOrderSummaryCard
            subTotal={subTotal}
            discountTotal={discountTotal}
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
    </div>
  );
}
