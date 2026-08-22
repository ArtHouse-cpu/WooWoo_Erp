import { useEffect, useMemo, useState } from "react";
import {
  X,
  ShoppingCart,
  Trash2,
  User,
  FileText,
  Search,
  Phone,
  Plus,
  Minus,
  Tag,
  UserPlus,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  handleCreateProduct,
  handleCatalogueLookup,
  handleCreateCustomer,
  handleCreateInvoice,
  handleGetCustomers,
  handleGetMemberships,
  type CustomerPayload,
  type MembershipPlanPayload,
  type CatalogueLookupItem,
} from "@/services/apiClient";
import CreateProductModal from "../components/invoice/Modal/CreateProductModal";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import ProductSidebar from "../components/ProductSidebar";
import MembershipBadge from "../components/invoice/MembershipBadge";
import { useDebounce } from "@/hooks/useDebounce";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";
import { useAppSelector } from "@/store/hooks";
import {
  calcCatalogueProductDiscount,
  calcStackedLineBenefits,
  resolveMembershipPlan,
  toMembershipPlanId,
} from "../utils/membershipInvoiceUtils";
import {resolveInvoiceLineCategory} from "../utils/itemClassification";
import { creditWalletCashback } from "../utils/walletCashback";
import { roundPayable, roundToPaise } from "../utils/paymentRoundOff";
import {
  findCartItemForCatalogueLine,
  getCatalogueLineKey,
} from "../utils/catalogueLineKey";
import { useNavigate } from "react-router-dom";


const todayStr = new Date().toISOString().split("T")[0];
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

type PosItem = {
  id: number;
  name: string;
  qty: number;
  price: number;
  discount: number;
  cashback: number;
  category?: string;
  stockQty?: number;
  image?: string;
  isCsp?: boolean;
  /** Unique catalogue row key (product vs each variant) */
  catalogueKey?: string;
  sourceId?: string;
  sourceType?: string;
  variantName?: string | null;
  /** Catalogue discount metadata for CSP / product discount recalc on qty change */
  productDiscountType?: string;
  productDiscountValue?: number;
  productDiscountAmount?: number;
  membershipDiscountAmount?: number;
};

export default function CreatePosScreen({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = open ?? internalOpen;
  const requestClose = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText.trim(), 300);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [draftQty, setDraftQty] = useState("1");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [membership, setMembership] = useState("none");
  const [membershipPlanId, setMembershipPlanId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlanPayload[]>([]);
  const [saving, setSaving] = useState(false);
  const staff = useAppSelector((state) => state.user);
  const [invoiceNo] = useState(getNextInvoiceNumber());
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(todayStr);
  const [extraCharges, setExtraCharges] = useState<Array<{ label: string; amount: number }>>([]);
  const staffName = staff.m_staff_name || "Staff";

  const [items, setItems] = useState<PosItem[]>([]);

  const [showExitConfirm, setShowExitConfirm] = useState(false);



  useEffect(() => {
    const ac = new AbortController();
    handleGetMemberships({ status: "Active" }, ac.signal)
      .then((res) => setMembershipPlans(res.memberships || []))
      .catch(() => setMembershipPlans([]));
    return () => ac.abort();
  }, []);

  const stackLineBenefits = (
    price: number,
    qty: number,
    category: string,
    mType: string,
    mId?: string | null,
    isCsp?: boolean,
    discountType?: string,
    discountValue?: number,
  ) => {
    const plan = resolveMembershipPlan(membershipPlans, mType, mId);
    return calcStackedLineBenefits({
      unitPrice: price,
      qty,
      category,
      plan,
      discountType,
      discountValue,
      isCsp,
    });
  };

  const handleChange = (
    id: number,
    field: keyof Pick<PosItem, "qty" | "price" | "discount" | "cashback">,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;

        let nextValue = Number(value);
        if (field === "qty" && (!Number.isFinite(nextValue) || nextValue < 1)) {
          nextValue = 1;
        }
        if (
          field === "qty" &&
          it.stockQty != null &&
          Number.isFinite(Number(it.stockQty)) &&
          nextValue > Number(it.stockQty)
        ) {
          Swal.fire(
            "Insufficient stock",
            `${it.name} has only ${it.stockQty} qty available from purchases.`,
            "warning",
          );
          nextValue = Number(it.stockQty);
        }

        const updated = { ...it, [field]: nextValue };
        if (field === "qty" || field === "price") {
          const stacked = stackLineBenefits(
            updated.price,
            updated.qty,
            updated.category || "General",
            membership,
            membershipPlanId,
            Boolean(updated.isCsp),
            updated.productDiscountType,
            updated.productDiscountValue,
          );
          return {
            ...updated,
            discount: stacked.discount,
            cashback: stacked.cashback,
            productDiscountAmount: stacked.productDiscount,
            membershipDiscountAmount: stacked.membershipDiscount,
          };
        }
        return updated;
      }),
    );
  };

  const addItem = () => {
    const name = searchText.trim();
    if (!name) {
      Swal.fire(
        "Missing product",
        "Please select or type a product name.",
        "warning",
      );
      return;
    }

    const qty = Number(draftQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      Swal.fire("Invalid qty", "Quantity must be greater than 0.", "warning");
      return;
    }

    if (
      selectedProduct?.trackStock &&
      Number(selectedProduct?.stockQty ?? 0) <= 0
    ) {
      Swal.fire(
        "Out of stock",
        `${selectedProduct.productName || name} has no purchased quantity left to sell.`,
        "warning",
      );
      return;
    }

    if (
      selectedProduct?.trackStock &&
      qty > Number(selectedProduct?.stockQty ?? 0)
    ) {
      Swal.fire(
        "Insufficient stock",
        `${selectedProduct.productName || name} has only ${selectedProduct.stockQty} qty available from purchases.`,
        "warning",
      );
      return;
    }

    const price = Number(selectedProduct?.sellingPrice ?? 0);
    const lineCategory = resolveInvoiceLineCategory(selectedProduct || {});
    const isCsp = Boolean(selectedProduct?.isCsp);
    const productDiscountType = selectedProduct?.discountType;
    const productDiscountValue = Number(selectedProduct?.discountValue ?? 0);
    const stacked = stackLineBenefits(
      price,
      qty,
      lineCategory,
      membership,
      membershipPlanId,
      isCsp,
      productDiscountType,
      productDiscountValue,
    );

    setItems((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1,
        name,
        qty,
        price,
        discount: stacked.discount,
        cashback: stacked.cashback,
        category: lineCategory,
        stockQty: selectedProduct?.trackStock
          ? Number(selectedProduct?.stockQty ?? 0)
          : undefined,
        image: selectedProduct?.imageUrl || (selectedProduct?.images && selectedProduct?.images[0]) || "",
        isCsp,
        catalogueKey: selectedProduct
          ? getCatalogueLineKey(selectedProduct)
          : undefined,
        sourceId: selectedProduct?.sourceId
          ? String(selectedProduct.sourceId)
          : undefined,
        sourceType: selectedProduct?.sourceType,
        variantName: selectedProduct?.variantName ?? null,
        productDiscountType,
        productDiscountValue,
        productDiscountAmount: stacked.productDiscount,
        membershipDiscountAmount: stacked.membershipDiscount,
      },
    ]);

    setSearchText("");
    setDraftQty("1");
    setSelectedProduct(null);
    setProducts([]);
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const addSidebarItem = (p: CatalogueLookupItem) => {
    if (p.trackStock && Number(p.stockQty ?? 0) <= 0) {
      Swal.fire(
        "Out of stock",
        `${p.productName || p.name} has no purchased quantity left to sell.`,
        "warning",
      );
      return;
    }

    const name = p.productName || p.name || "";
    const catalogueKey = getCatalogueLineKey(p);
    const existingItem = findCartItemForCatalogueLine(items, p);

    if (existingItem) {
      const newQty = existingItem.qty + 1;
      if (p.trackStock && Number(p.stockQty ?? 0) < newQty) {
        Swal.fire(
          "Insufficient stock",
          `${name} has only ${p.stockQty} qty available from purchases.`,
          "warning",
        );
        return;
      }
      handleChange(existingItem.id, "qty", newQty);
    } else {
      const qty = 1;
      const price = Number(p.sellingPrice ?? 0);
      const lineCategory = resolveInvoiceLineCategory(p);
      const isCsp = Boolean(p.isCsp);
      const productDiscountType = p.discountType;
      const productDiscountValue = Number(p.discountValue ?? 0);
      const stacked = stackLineBenefits(
        price,
        qty,
        lineCategory,
        membership,
        membershipPlanId,
        isCsp,
        productDiscountType,
        productDiscountValue,
      );

      setItems((prev) => [
        ...prev,
        {
          id: prev.length ? Math.max(...prev.map((item) => item.id)) + 1 : 1,
          name,
          qty,
          price,
          discount: stacked.discount,
          cashback: stacked.cashback,
          category: lineCategory,
          stockQty: p.trackStock ? Number(p.stockQty ?? 0) : undefined,
          image: p.imageUrl || (p as any).images?.[0] || "",
          isCsp,
          catalogueKey,
          sourceId: String(p.sourceId || ""),
          sourceType: p.sourceType,
          variantName: p.variantName ?? null,
          productDiscountType,
          productDiscountValue,
          productDiscountAmount: stacked.productDiscount,
          membershipDiscountAmount: stacked.membershipDiscount,
        },
      ]);
    }
  };

  const removeSidebarItem = (p: CatalogueLookupItem) => {
    const key = getCatalogueLineKey(p);
    setItems((prev) =>
      prev.filter((it) => getCatalogueLineKey(it) !== key),
    );
  };

  const incrementSidebarItem = (p: CatalogueLookupItem, existingQty: number) => {
    const matchedItem = findCartItemForCatalogueLine(items, p);
    if (matchedItem) {
      if (p.trackStock && Number(p.stockQty ?? 0) <= existingQty) {
        Swal.fire(
          "Insufficient stock",
          `${p.productName || p.name} has only ${p.stockQty} qty available from purchases.`,
          "warning",
        );
        return;
      }
      handleChange(matchedItem.id, "qty", existingQty + 1);
    }
  };

  const decrementSidebarItem = (p: CatalogueLookupItem, existingQty: number) => {
    const matchedItem = findCartItemForCatalogueLine(items, p);
    if (matchedItem) {
      if (existingQty <= 1) {
        removeItem(matchedItem.id);
      } else {
        handleChange(matchedItem.id, "qty", existingQty - 1);
      }
    }
  };

  const openCheckoutModal = () => {
    if (items.length === 0) {
      Swal.fire("No items", "Please add at least one item before checkout.", "warning");
      return;
    }
    setOpenCheckout(true);
  };

  const calculateTotal = (item: PosItem) => {
    return roundToPaise(item.qty * item.price - item.discount);
  };

  /** Hide default zeros in editable number fields */
  const emptyableNum = (n: number) => (Number(n) === 0 ? "" : String(n));

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

  const subTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.qty * item.price, 0),
    [items],
  );

  const extraChargesTotal = roundToPaise(
    extraCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0),
  );
  /** Net bill before nearest-rupee round-off (source for checkout + coupons). */
  const totalBeforeRound = roundToPaise(
    Math.max(0, subTotal - discountTotal + extraChargesTotal),
  );
  /** Round-off applies only on the final total amount (not per line). */
  const {
    payable: grandTotal,
    roundOff,
    preRound: billTotalBeforeRoundOff,
  } = roundPayable(totalBeforeRound);

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
        note: `Membership cashback for Invoice #${invoiceCode} via POS`,
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

  const handleSave = async (payment: any) => {
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
          productName: item.name,
          qty: item.qty,
          unitPrice: item.price,
          discount,
          category: item.category || "General",
        };
      });
      const lineDiscountTotal = lineItems.reduce(
        (sum, item) => sum + Number(item.discount || 0),
        0,
      );
      const response = await handleCreateInvoice({
        customerName: customer.trim() || "Walk-in Customer",
        customerPhone: phone.trim(),
        customerId: payment.customerId || customerId || undefined,
        invoiceDate: invoiceDate || todayStr,
        dueDate: dueDate || invoiceDate || todayStr,
        salesPersonName:
          payment.invoiceBy?.staffName?.trim() ||
          staff.m_staff_name ||
          "POS",
        invoiceBy: payment.invoiceBy
          ? {
              staffId: payment.invoiceBy.staffId,
              staffName: payment.invoiceBy.staffName,
              employeeId: payment.invoiceBy.employeeId,
              email: payment.invoiceBy.email,
            }
          : null,
        verifiedAt: payment.verifiedAt || null,
        notes: "POS Transaction",
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
        activityType: "POS Sale",
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

      await Swal.fire("Success", "POS Transaction completed.", "success");
      setItems([]);
      setOpenCheckout(false);
      requestClose(); //close the pos billing modal
    } catch (error: any) {
      Swal.fire("Error", "Could not complete transaction.", "error");
    } finally {
      setSaving(false);
    }
  };
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await handleCreateInvoice({
        customerName: customer.trim() || "Walk-in Customer",
        customerPhone: phone.trim(),
        customerId: customerId || undefined,
        invoiceDate: invoiceDate || todayStr,
        dueDate: dueDate || invoiceDate || todayStr,
        salesPersonName: staff.m_staff_name || "POS",
        notes: "POS Draft Transaction",
        items: items.map((item) => ({
          productName: item.name,
          qty: item.qty,
          unitPrice: item.price,
          discount: item.discount,
          category: item.category || "General",
        })),
        subTotal,
        discountTotal,
        extraCharges,
        grandTotal,
        status: "draft",
        mode: "Draft",
        paymentStatus: "partial",
        paymentBreakdown: {
          cash: 0,
          upi: 0,
          card: 0,
          wallet: 0,
          paidAmount: 0,
          dueAmount: grandTotal,
          changeAmount: 0,
        },
        pendingAmount: grandTotal,
        createdBy: {
          m_staff_id: staff.m_staff_id,
          m_staff_name: staff.m_staff_name,
          m_staff_email: staff.m_staff_email,
        },
      });

      await Swal.fire("Success", "Draft POS Transaction saved.", "success");
      setItems([]);
      requestClose(); // Automatically close the modal on success
    } catch (error: any) {
      Swal.fire("Error", "Could not save draft.", "error");
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
    return () => controller.abort();
  }, [debouncedCustomer, customerDropdownOpen]);

  const handleCreateCustomerSubmit = async (args: {
    payload: CustomerPayload;
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
      Swal.fire("Success", "Customer created.", "success");
    } catch {
      Swal.fire("Error", "Could not create customer.", "error");
    } finally {
      setCreatingCustomer(false);
    }
  };

  const submitNewProduct = async (formData: FormData) => {
    try {
      setCreating(true);
      await handleCreateProduct(formData);
      setShowCreateModal(false);
      Swal.fire(
        "Product created",
        "Product has been successfully added.",
        "success",
      );
    } catch (e: any) {
      Swal.fire(
        "Error",
        e?.response?.data?.message ?? "Could not create product.",
        "error",
      );
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const term = debouncedSearchText;
    if (!term) {
      setProducts([]);
      setSelectedProduct(null);
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        setLoadingProducts(true);
        const response = await handleCatalogueLookup(term, controller.signal, {
          page: 1,
          limit: 48,
        });
        setProducts(Array.isArray(response?.items) ? response.items : []);
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedSearchText]);

  const handleRequestClose = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "any unsaved changes will be lost.",
      icon: "warning",
      showCancelButton: true,
      showDenyButton: true,          // Enable the 3rd button
      confirmButtonColor: "#EF4444", // Red for exit
      denyButtonColor: "#4F46E5",    // Indigo for Save Draft
      cancelButtonColor: "#6B7280",  // Gray for cancel
      confirmButtonText: "Yes, Close",
      denyButtonText: "Save Draft",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      if (onClose) {
        onClose();
      } else {
        navigate(-1);
      }
    } else if (result.isDenied) {
      await handleSaveDraft();
    }
  };

  if (!isOpen) return null;

  return (

    <>

      <div
        className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onMouseDown={(e) => {
          if (e.currentTarget == e.target) {
            handleRequestClose();
          }
        }}
      >

        <div className="flex h-dvh max-h-dvh w-full max-w-7xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:w-[95%] sm:rounded-2xl">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                POS Billing
              </h2>
              <div className="mt-0.5 truncate text-[11px] text-slate-400">
                #{invoiceNo}
                <span className="hidden sm:inline"> · By {staffName}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <X size={18} />
            </button>
          </div>


          {/* confirmation popup */}

          {showExitConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
              <div className="w-[360px] rounded-xl bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold">
                  Exit POS Billing
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Are you sure you want to exit?
                </p>


                <div className="mt-6 flex justify-end gap-3">

                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
                  >
                    No
                  </button>

                  <button
                    onClick={() => {
                      setShowExitConfirm(false);
                      requestClose();
                    }}
                    className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                  >
                    Yes
                  </button>

                </div>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pb-3 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pb-6">
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-4 lg:mt-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
            <div className="min-w-0 space-y-3 sm:space-y-4">
              {/* Customer + dates — single card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-12">
                  <div className="relative col-span-1 min-w-0 lg:col-span-4">
                    <div className="mb-1.5 flex items-center justify-between gap-1">
                      <label className="text-xs font-semibold text-slate-600">
                        Select Customer
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCreateCustomerModal(true)}
                        className="inline-flex items-center gap-0.5 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-100"
                      >
                        <UserPlus size={11} />
                        Add
                      </button>
                    </div>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={customer}
                        onChange={(e) => {
                          setCustomer(e.target.value);
                          setCustomerDropdownOpen(true);
                          if (!e.target.value) {
                            setPhone("");
                            setMembership("none");
                            setMembershipPlanId(null);
                            setCustomerId(null);
                          }
                        }}
                        onFocus={() => setCustomerDropdownOpen(true)}
                        onBlur={() =>
                          window.setTimeout(
                            () => setCustomerDropdownOpen(false),
                            150,
                          )
                        }
                        placeholder="Search customer…"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      />
                    </div>
                    {customerDropdownOpen &&
                      (loadingCustomers || customers.length > 0) && (
                        <div className="absolute left-0 right-0 z-[60] mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl sm:right-auto sm:w-80">
                          {loadingCustomers ? (
                            <div className="px-4 py-3 text-sm text-slate-500">
                              Searching…
                            </div>
                          ) : (
                            customers.map((c) => (
                              <button
                                key={c._id}
                                type="button"
                                onMouseDown={() => {
                                  const mType = c.membershipType ?? "none";
                                  const mId = toMembershipPlanId(
                                    c.membershipPlanId,
                                  );
                                  setCustomer(c.name);
                                  setPhone(c.mobile);
                                  setMembership(mType);
                                  setMembershipPlanId(mId);
                                  setCustomerId(c._id);
                                  setCustomers([]);
                                  setCustomerDropdownOpen(false);
                                  setItems((prev) =>
                                    prev.map((item) => {
                                      const stacked = stackLineBenefits(
                                        item.price,
                                        item.qty,
                                        item.category || "General",
                                        mType,
                                        mId,
                                        Boolean(item.isCsp),
                                        item.productDiscountType,
                                        item.productDiscountValue,
                                      );
                                      return {
                                        ...item,
                                        discount: stacked.discount,
                                        cashback: stacked.cashback,
                                        productDiscountAmount:
                                          stacked.productDiscount,
                                        membershipDiscountAmount:
                                          stacked.membershipDiscount,
                                      };
                                    }),
                                  );
                                }}
                                className="flex w-full items-center justify-between border-b border-slate-50 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-800">
                                    {c.name}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {c.mobile}
                                  </div>
                                </div>
                                {c.membershipType &&
                                  c.membershipType !== "none" && (
                                    <MembershipBadge
                                      membershipType={c.membershipType}
                                      membershipPlanId={toMembershipPlanId(
                                        c.membershipPlanId,
                                      )}
                                      membershipPlans={membershipPlans}
                                    />
                                  )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                  </div>

                  <div className="col-span-1 min-w-0 lg:col-span-3">
                    <div className="mb-1.5 flex items-center justify-between gap-1">
                      <label className="text-xs font-semibold text-slate-600">
                        Phone
                      </label>
                      {membership && membership !== "none" ? (
                        <div className="origin-right scale-90">
                          <MembershipBadge
                            membershipType={membership}
                            membershipPlanId={membershipPlanId}
                            membershipPlans={membershipPlans}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      />
                    </div>
                  </div>

                  <div className="col-span-1 min-w-0 lg:col-span-2">
                    <label className="mb-1.5 block truncate text-xs font-semibold text-slate-600">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="box-border h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-2 text-xs outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 sm:px-3 sm:text-sm [&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-datetime-edit]:min-w-0"
                    />
                  </div>

                  <div className="col-span-1 min-w-0 lg:col-span-3">
                    <label className="mb-1.5 block truncate text-xs font-semibold text-slate-600">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      min={invoiceDate || undefined}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="box-border h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-2 text-xs outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 sm:px-3 sm:text-sm [&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-datetime-edit]:min-w-0"
                    />
                  </div>
                </div>
              </div>

              {/* Search + Qty + Add */}
              <div className="flex items-end gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setSelectedProduct(null);
                    }}
                    placeholder="Search item or scan barcode"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                <div className="w-14 shrink-0 sm:w-16">
                  <div className="mb-1 text-center text-[10px] font-semibold uppercase text-slate-400">
                    Qty
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={draftQty}
                    onChange={(e) => setDraftQty(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white text-center text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 sm:px-4"
                >
                  <Plus size={16} />
                  <span className="hidden xs:inline sm:inline">Add Item</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="text-xs font-semibold text-violet-600 hover:underline"
              >
                + Add New Product
              </button>

              {(loadingProducts || products.length > 0) && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  {loadingProducts ? (
                    <div className="px-3 py-2 text-sm text-slate-500">
                      Searching…
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-auto">
                      {products.map((p) => (
                        <button
                          key={`${p.sourceType || "product"}-${p._id}`}
                          type="button"
                          onClick={() => {
                            setSearchText(p.productName ?? p.name ?? "");
                            setSelectedProduct(p);
                            setProducts([]);
                          }}
                          className="flex w-full flex-col gap-0.5 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50"
                        >
                          <span className="flex items-center justify-between gap-2 text-sm font-medium text-slate-800">
                            <span className="truncate">
                              {p.productName ?? p.name}
                            </span>
                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                              {p.sourceType || "product"}
                            </span>
                          </span>
                          <span className="text-xs text-slate-500">
                            {(() => {
                              const original = Number(p.sellingPrice ?? 0) || 0;
                              const productDiscount =
                                calcCatalogueProductDiscount(
                                  original,
                                  1,
                                  p.discountType,
                                  p.discountValue,
                                );
                              const finalPrice = Math.max(
                                0,
                                original - productDiscount,
                              );
                              if (productDiscount > 0 && finalPrice < original) {
                                return (
                                  <>
                                    <s className="text-slate-400">
                                      ₹{original.toLocaleString("en-IN")}
                                    </s>{" "}
                                    <span className="font-semibold text-emerald-700">
                                      ₹{finalPrice.toLocaleString("en-IN")}
                                    </span>
                                  </>
                                );
                              }
                              return `₹${original.toLocaleString("en-IN")}`;
                            })()}
                            {p.trackStock && p.stockQty != null
                              ? ` · Qty: ${p.stockQty}`
                              : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mobile catalogue rail */}
              <div className="lg:hidden">
                <ProductSidebar
                  variant="rail"
                  cartItems={items}
                  onAddItem={addSidebarItem}
                  onRemoveItem={removeSidebarItem}
                  onIncrementItem={incrementSidebarItem}
                  onDecrementItem={decrementSidebarItem}
                  title="Catalogue"
                />
              </div>

              {/* Mobile cart cards */}
              <div className="space-y-2 lg:hidden">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-8 text-center text-sm text-slate-500">
                    Search or tap Catalogue to add items.
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400">
                              #{idx + 1}
                            </span>
                            <span className="truncate font-semibold text-slate-900">
                              {item.name}
                            </span>
                            {item.isCsp && (
                              <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                                CSP
                              </span>
                            )}
                          </div>
                          {item.stockQty != null && (
                            <div
                              className={`mt-0.5 text-[11px] font-medium ${
                                item.stockQty - item.qty < 0
                                  ? "text-red-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              Stock: {item.stockQty - item.qty}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums text-slate-900">
                            ₹
                            {calculateTotal(item).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="mt-1 rounded-lg bg-rose-50 p-1.5 text-rose-600"
                            aria-label="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        <div>
                          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">
                            Qty
                          </div>
                          <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleChange(item.id, "qty", item.qty - 1)
                              }
                              className="rounded p-1 text-slate-600"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-sm font-semibold">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleChange(item.id, "qty", item.qty + 1)
                              }
                              className="rounded p-1 text-slate-600"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">
                            Price
                          </div>
                          <input
                            type="number"
                            min={0}
                            value={emptyableNum(item.price)}
                            placeholder="0"
                            onChange={(e) =>
                              handleChange(item.id, "price", e.target.value)
                            }
                            className="h-9 w-full rounded-lg border border-slate-200 px-1.5 text-right text-sm outline-none focus:border-violet-500"
                          />
                        </div>
                        <div>
                          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">
                            Disc.
                          </div>
                          <input
                            type="number"
                            min={0}
                            value={emptyableNum(item.discount)}
                            placeholder="0"
                            onChange={(e) =>
                              handleChange(item.id, "discount", e.target.value)
                            }
                            className="h-9 w-full rounded-lg border border-slate-200 px-1.5 text-right text-sm outline-none focus:border-violet-500"
                          />
                        </div>
                        <div>
                          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">
                            CB
                          </div>
                          <input
                            type="number"
                            min={0}
                            value={emptyableNum(item.cashback)}
                            placeholder="0"
                            disabled={Boolean(item.isCsp)}
                            onChange={(e) =>
                              handleChange(item.id, "cashback", e.target.value)
                            }
                            className="h-9 w-full rounded-lg border border-slate-200 px-1.5 text-right text-sm outline-none focus:border-violet-500 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-center">Price (₹)</th>
                      <th className="p-3 text-center">Discount (₹)</th>
                      <th className="p-3 text-center">Cashback</th>
                      <th className="p-3 text-center">Total (₹)</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-10 text-center text-slate-500"
                        >
                          Search or pick from catalogue to add items.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="p-3 text-slate-400">{idx + 1}</td>
                          <td className="p-3 min-w-[160px]">
                            <div className="flex items-center gap-2 font-medium">
                              <span>{item.name}</span>
                              {item.isCsp && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                                  CSP
                                </span>
                              )}
                            </div>
                            {item.stockQty != null && (
                              <div className="text-xs text-emerald-600">
                                Stock: {(item.stockQty ?? 0) - item.qty}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="mx-auto flex w-28 items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleChange(item.id, "qty", item.qty - 1)
                                }
                                className="rounded border border-slate-200 p-1"
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) =>
                                  handleChange(item.id, "qty", e.target.value)
                                }
                                className="w-12 rounded border border-slate-200 px-1 py-1 text-center"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleChange(item.id, "qty", item.qty + 1)
                                }
                                className="rounded border border-slate-200 p-1"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              value={emptyableNum(item.price)}
                              placeholder="0"
                              onChange={(e) =>
                                handleChange(item.id, "price", e.target.value)
                              }
                              className="w-20 rounded border border-slate-200 px-2 py-1 text-center"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              value={emptyableNum(item.discount)}
                              placeholder="0"
                              onChange={(e) =>
                                handleChange(
                                  item.id,
                                  "discount",
                                  e.target.value,
                                )
                              }
                              className="w-20 rounded border border-slate-200 px-2 py-1 text-center"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              value={emptyableNum(item.cashback)}
                              placeholder="0"
                              disabled={Boolean(item.isCsp)}
                              onChange={(e) =>
                                handleChange(
                                  item.id,
                                  "cashback",
                                  e.target.value,
                                )
                              }
                              className="w-20 rounded border border-slate-200 px-2 py-1 text-center disabled:bg-slate-50"
                            />
                          </td>
                          <td className="p-3 text-center font-semibold">
                            ₹
                            {calculateTotal(item).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="inline-flex rounded p-1 text-red-600 hover:bg-red-50"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Billing Summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Items ({items.length})</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Sub Total</span>
                    <span className="tabular-nums">
                      ₹
                      {subTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between font-medium text-rose-600">
                      <span>Discount</span>
                      <span className="tabular-nums">
                        − ₹
                        {discountTotal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-base font-semibold text-slate-900">
                      Grand Total
                    </span>
                    <span className="text-xl font-bold tabular-nums text-slate-900">
                      ₹{" "}
                      {grandTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {Math.abs(roundOff) >= 0.005 && (
                    <div className="text-[11px] text-slate-500">
                      Bill ₹
                      {billTotalBeforeRoundOff.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                      {" · "}
                      Round off {roundOff >= 0 ? "+" : "−"}₹
                      {Math.abs(roundOff).toFixed(2)}
                    </div>
                  )}
                  {cashbackTotal > 0 && (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 ring-1 ring-inset ring-emerald-100">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        <Tag size={14} />
                        Cashback
                      </span>
                      <span className="font-bold tabular-nums">
                        + ₹
                        {cashbackTotal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <Tag size={12} /> Extra Charges
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExtraCharges([
                          ...extraCharges,
                          { label: "New Charge", amount: 0 },
                        ])
                      }
                      className="text-[11px] font-bold text-violet-600 hover:underline"
                    >
                      + Add
                    </button>
                  </div>
                  {extraCharges.map((charge, idx) => (
                    <div
                      key={idx}
                      className="mb-1.5 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5"
                    >
                      <input
                        type="text"
                        value={charge.label}
                        onChange={(e) => {
                          const next = [...extraCharges];
                          next[idx].label = e.target.value;
                          setExtraCharges(next);
                        }}
                        className="flex-1 bg-transparent text-xs font-medium text-slate-600 outline-none"
                      />
                      <span className="text-xs text-slate-400">₹</span>
                      <input
                        type="number"
                        value={charge.amount || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const next = [...extraCharges];
                          next[idx].amount = Number(e.target.value);
                          setExtraCharges(next);
                        }}
                        className="w-16 border-b border-slate-200 bg-transparent text-right text-xs font-bold outline-none focus:border-violet-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...extraCharges];
                          next.splice(idx, 1);
                          setExtraCharges(next);
                        }}
                        className="text-slate-300 hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="hidden h-[min(52dvh,440px)] min-h-[260px] overflow-hidden lg:sticky lg:top-0 lg:block lg:h-[70vh]">
              <ProductSidebar
                cartItems={items}
                onAddItem={addSidebarItem}
                onRemoveItem={removeSidebarItem}
                onIncrementItem={incrementSidebarItem}
                onDecrementItem={decrementSidebarItem}
                title="POS Catalogue"
              />
            </aside>
          </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={items.length === 0 || saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:min-w-[9rem]"
            >
              <FileText size={18} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={openCheckoutModal}
              disabled={items.length === 0 || saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 sm:min-w-[9rem]"
            >
              {saving ? (
                "Processing..."
              ) : (
                <>
                  <ShoppingCart size={18} />
                  Checkout
                </>
              )}
            </button>
          </div>

          {showCreateModal && (
            <CreateProductModal
              onClose={() => setShowCreateModal(false)}
              onSubmit={submitNewProduct}
              loading={creating}
            />
          )}
          {showCreateCustomerModal && (
            <CreateCustomerModal
              onClose={() => setShowCreateCustomerModal(false)}
              onSubmit={handleCreateCustomerSubmit}
              loading={creatingCustomer}
            />
          )}
          <CheckoutModal
            open={openCheckout}
            grandTotal={totalBeforeRound}
            items={items.map((it) => ({
              ...it,
              productName: it.name,
              unitPrice: it.price,
              productDiscountAmount: Number(it.productDiscountAmount ?? 0),
              membershipDiscountAmount: it.isCsp
                ? 0
                : Number(it.membershipDiscountAmount ?? 0),
            }))}
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
      </div>
    </>
  );
}
