import { useEffect, useMemo, useState } from "react";
import { X, Printer, ShoppingCart, Trash2, User } from "lucide-react";
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
import { useDebounce } from "@/hooks/useDebounce";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";
import { useAppSelector } from "@/store/hooks";
import {
  calcCatalogueProductDiscount,
  membershipBenefitsForLine,
  resolveMembershipPlan,
  toMembershipPlanId,
} from "../utils/membershipInvoiceUtils";
import { creditWalletCashback } from "../utils/walletCashback";
import { printThermalReceipt } from "@/utils/printUtils";

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
  /** Catalogue discount metadata for CSP / product discount recalc on qty change */
  productDiscountType?: string;
  productDiscountValue?: number;
};

export default function CreatePosScreen({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
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
  const [extraCharges, setExtraCharges] = useState<Array<{ label: string; amount: number }>>([]);

  const [items, setItems] = useState<PosItem[]>([]);

   const[showExitConfirm, setShowExitConfirm] = useState(false);

 const handleRequestClose =() => {
  setShowExitConfirm(true);
 };

  useEffect(() => {
    const ac = new AbortController();
    handleGetMemberships({ status: "Active" }, ac.signal)
      .then((res) => setMembershipPlans(res.memberships || []))
      .catch(() => setMembershipPlans([]));
    return () => ac.abort();
  }, []);

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

  const handleChange = (
    id: number,
    field: keyof Pick<PosItem, "qty" | "price" | "discount" | "cashback">,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;

        const updated = { ...it, [field]: Number(value) };
        if (field === "qty" || field === "price") {
          if (updated.isCsp) {
            const productDiscount = calcCatalogueProductDiscount(
              updated.price,
              updated.qty,
              updated.productDiscountType,
              updated.productDiscountValue,
            );
            return {
              ...updated,
              discount: productDiscount,
              cashback: 0,
            };
          }
          const benefits = getMembershipBenefitsForItem(
            updated.price,
            updated.qty,
            updated.category || "General",
            membership,
            membershipPlanId,
            false,
          );
          return {
            ...updated,
            discount: benefits.discount || updated.discount,
            cashback: benefits.cashback || updated.cashback,
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
        `${selectedProduct.productName || name} is currently out of stock.`,
        "warning",
      );
      return;
    }

    const price = Number(selectedProduct?.sellingPrice ?? 0);
    const membershipCategory = selectedProduct?.category || "General";
    const lineCategory =
      selectedProduct?.lineCategory ||
      selectedProduct?.sourceType ||
      "product";
    const isCsp = Boolean(selectedProduct?.isCsp);
    const productDiscountType = selectedProduct?.discountType;
    const productDiscountValue = Number(selectedProduct?.discountValue ?? 0);
    const productDiscount = calcCatalogueProductDiscount(
      price,
      qty,
      productDiscountType,
      productDiscountValue,
    );
    const benefits = getMembershipBenefitsForItem(
      price,
      qty,
      membershipCategory,
      membership,
      membershipPlanId,
      isCsp,
    );

    setItems((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1,
        name,
        qty,
        price,
        discount: isCsp ? productDiscount : benefits.discount || productDiscount || 0,
        cashback: isCsp ? 0 : benefits.cashback || 0,
        category: lineCategory,
        stockQty: selectedProduct?.trackStock
          ? Number(selectedProduct?.stockQty ?? 0)
          : undefined,
        image: selectedProduct?.imageUrl || (selectedProduct?.images && selectedProduct?.images[0]) || "",
        isCsp,
        productDiscountType,
        productDiscountValue,
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
        `${p.productName || p.name} is currently out of stock.`,
        "warning",
      );
      return;
    }

    const name = p.productName || p.name || "";
    const existingIndex = items.findIndex((it) => it.name.toLowerCase() === name.toLowerCase());

    if (existingIndex > -1) {
      const existingItem = items[existingIndex];
      const newQty = existingItem.qty + 1;
      if (p.trackStock && Number(p.stockQty ?? 0) < newQty) {
        Swal.fire(
          "Insufficient stock",
          `${name} has only ${p.stockQty} qty available.`,
          "warning",
        );
        return;
      }
      handleChange(existingItem.id, "qty", newQty);
    } else {
      const qty = 1;
      const price = Number(p.sellingPrice ?? 0);
      const membershipCategory = p.category || "General";
      const lineCategory = p.lineCategory || p.sourceType || "product";
      const isCsp = Boolean(p.isCsp);
      const productDiscountType = p.discountType;
      const productDiscountValue = Number(p.discountValue ?? 0);
      const productDiscount = calcCatalogueProductDiscount(
        price,
        qty,
        productDiscountType,
        productDiscountValue,
      );
      const benefits = getMembershipBenefitsForItem(
        price,
        qty,
        membershipCategory,
        membership,
        membershipPlanId,
        isCsp,
      );

      setItems((prev) => [
        ...prev,
        {
          id: prev.length ? Math.max(...prev.map((item) => item.id)) + 1 : 1,
          name,
          qty,
          price,
          discount: isCsp ? productDiscount : benefits.discount || productDiscount || 0,
          cashback: isCsp ? 0 : benefits.cashback || 0,
          category: lineCategory,
          stockQty: p.trackStock ? Number(p.stockQty ?? 0) : undefined,
          image: p.imageUrl || (p as any).images?.[0] || "",
          isCsp,
          productDiscountType,
          productDiscountValue,
        },
      ]);
    }
  };

  const removeSidebarItem = (itemName: string) => {
    setItems((prev) => prev.filter((it) => it.name.toLowerCase() !== itemName.toLowerCase()));
  };

  const incrementSidebarItem = (p: CatalogueLookupItem, existingQty: number) => {
    const matchedItem = items.find((it) => it.name.toLowerCase() === (p.productName || p.name || "").toLowerCase());
    if (matchedItem) {
      if (p.trackStock && Number(p.stockQty ?? 0) <= existingQty) {
        Swal.fire(
          "Insufficient stock",
          `${p.productName || p.name} has only ${p.stockQty} qty available.`,
          "warning",
        );
        return;
      }
      handleChange(matchedItem.id, "qty", existingQty + 1);
    }
  };

  const decrementSidebarItem = (itemName: string, existingQty: number) => {
    const matchedItem = items.find((it) => it.name.toLowerCase() === itemName.toLowerCase());
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
    return item.qty * item.price - item.discount;
  };

  const discountTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.discount, 0),
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

  const extraChargesTotal = extraCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const grandTotal = subTotal - discountTotal + extraChargesTotal;

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
      const response = await handleCreateInvoice({
        customerName: customer.trim() || "Walk-in Customer",
        customerPhone: phone.trim(),
        invoiceDate: todayStr,
        dueDate: todayStr,
        salesPersonName: staff.m_staff_name || "POS",
        notes: "POS Transaction",
        items: items.map((item) => ({
          productName: item.name,
          qty: item.qty,
          unitPrice: item.price,
          discount: item.discount,
          category: item.category || "General",
        })),
        subTotal,
        discountTotal:
          discountTotal +
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

      Swal.fire("Success", "POS Transaction completed.", "success");
      setItems([]);
      setOpenCheckout(false);
    } catch (error: any) {
      Swal.fire("Error", "Could not complete transaction.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPosReceipt = () => {
    if (items.length === 0) {
      Swal.fire("No items", "Please add at least one item before printing.", "warning");
      return;
    }
    printThermalReceipt({
      invoiceNo: `DRAFT-${invoiceNo || new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      customerName: customer.trim() || "Walk-in Customer",
      customerPhone: phone.trim(),
      items: items.map((item) => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        discount: item.discount,
      })),
      totalMRP: subTotal,
      discountTotal,
      cashbackAmount: cashbackTotal,
      finalAmount: grandTotal,
      totalDue: grandTotal,
      totalQty: items.reduce((sum, item) => sum + item.qty, 0),
      extraCharges,
    });
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
        const response = await handleCatalogueLookup(term, controller.signal);
        setProducts(Array.isArray(response?.items) ? response.items : []);
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedSearchText]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        onMouseDown={(e) => {
          if(e.currentTarget == e.target){
            handleRequestClose();
          }
        }}
      >
        <div className="max-h-[92vh] w-[95%] max-w-7xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-xl font-semibold">POS Billing</h2>
            <button 
              type="button"
              onClick={handleRequestClose}
              className="rounded-md p-1 text-gray-600 hover:bg-gray-100"
            >
              <X />
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

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px] mt-4">
            {/* Left Column: Form & Cart */}
            <div className="space-y-4">
              {/* Customer Section */}
              <div className="mt-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Customer Details</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomerModal(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    + Create New Customer
                  </button>
                </div>
                
                <div className="relative mt-2">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                        placeholder="Search customer by name or phone..."
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                      />
                      
                      {customerDropdownOpen && (loadingCustomers || customers.length > 0) && (
                        <div className="absolute top-full left-0 right-0 z-[60] mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                          {loadingCustomers ? (
                            <div className="px-4 py-3 text-sm text-slate-500">Searching customers...</div>
                          ) : (
                            customers.map((c) => (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => {
                                const mType = c.membershipType ?? "none";
                                const mId = toMembershipPlanId(c.membershipPlanId);
                                setCustomer(c.name);
                                setPhone(c.mobile);
                                setMembership(mType);
                                setMembershipPlanId(mId);
                                setCustomerId(c._id);
                                setCustomers([]);
                                setCustomerDropdownOpen(false);

                                // Auto-apply membership discounts (CSP keeps product discount; no membership)
                                setItems(prev => prev.map(item => {
                                  if (item.isCsp) {
                                    const productDiscount = calcCatalogueProductDiscount(
                                      item.price,
                                      item.qty,
                                      item.productDiscountType,
                                      item.productDiscountValue,
                                    );
                                    return {
                                      ...item,
                                      discount:
                                        productDiscount > 0
                                          ? productDiscount
                                          : item.discount,
                                      cashback: 0,
                                    };
                                  }
                                  const benefits = getMembershipBenefitsForItem(item.price, item.qty, item.category || "General", mType, mId, false);
                                  return {
                                      ...item,
                                      discount: benefits.discount || 0,
                                      cashback: benefits.cashback || 0
                                  };
                                }));
                              }}
                              className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                            >
                              <div className="text-left">
                                <div className="text-sm font-bold text-slate-700">{c.name}</div>
                                <div className="text-xs text-slate-500">{c.mobile}</div>
                              </div>
                              {c.membershipType && c.membershipType !== "none" && (
                                <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 uppercase">
                                  {c.membershipType}
                                </span>
                              )}
                            </button>
                          )))}
                        </div>
                      )}
                    </div>
                    
                    {customer && (
                      <div className="flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-2">
                        <div className="text-xs">
                          <div className="font-bold text-indigo-900">{customer}</div>
                          <div className="text-indigo-600 font-medium">{phone}</div>
                        </div>
                        {membership !== "none" && (
                          <div className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                            {membership}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Search Section */}
              <div className="flex items-center gap-3 mt-6 w-full">
                {/* Search + Qty */}
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setSelectedProduct(null);
                    }}
                    placeholder="Search product, space, service, food..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />

                  <input
                    type="number"
                    placeholder="Qty"
                    value={draftQty}
                    onChange={(e) => setDraftQty(e.target.value)}
                    className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Add Item Button */}
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition"
                >
                  Add Item
                </button>

                {/* Add New Product */}
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="text-violet-600 text-sm font-medium hover:underline whitespace-nowrap"
                >
                  + Add New Product
                </button>
              </div>

              {/* Search Results (optional UI) */}
              {(loadingProducts || products.length > 0) && (
                <div className="mt-2 rounded-xl border border-gray-200 bg-white">
                  {loadingProducts ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Searching...
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-auto">
                      {products.map((p) => (
                        <button
                          key={`${p.sourceType || "product"}-${p._id}`}
                          type="button"
                          onClick={() => {
                            setSearchText(p.productName ?? p.name ?? "");
                            setSelectedProduct(p);
                            setProducts([]);
                          }}
                          className="flex w-full flex-col gap-0.5 border-b border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <span className="flex items-center justify-between gap-2 text-sm font-medium text-gray-800">
                            <span className="truncate">{p.productName ?? p.name}</span>
                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                              {p.sourceType || "product"}
                            </span>
                          </span>
                          <span className="text-xs text-gray-500">
                            ₹{p.sellingPrice ?? 0}
                            {p.trackStock && p.stockQty != null
                              ? ` | Qty: ${p.stockQty}`
                              : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Table */}
              <div className="mt-6 border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Discount</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">
                          <div className="flex items-center gap-2 font-medium">
                            <span>{item.name}</span>
                            {item.isCsp && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                                CSP
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-green-600">
                            Avl Stock: {(item.stockQty ?? 0) - item.qty}
                          </div>
                        </td>

                        {/* Qty Input */}
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) =>
                              handleChange(item.id, "qty", e.target.value)
                            }
                            className="w-16 border rounded px-2 py-1 text-center"
                          />
                        </td>

                        {/* Price Input */}
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) =>
                              handleChange(item.id, "price", e.target.value)
                            }
                            className="w-20 border rounded px-2 py-1 text-center"
                          />
                        </td>

                        {/* Discount Input — CSP still shows catalogue product discount */}
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            value={item.discount}
                            title={
                              item.isCsp
                                ? "Product discount (membership discount does not apply to CSP)"
                                : undefined
                            }
                            onChange={(e) =>
                              handleChange(item.id, "discount", e.target.value)
                            }
                            className="w-20 border rounded px-2 py-1 text-center"
                          />
                        </td>

                        {/* Total */}
                        <td className="p-3 text-center font-semibold">
                          ₹{calculateTotal(item)}
                        </td>

                        {/* Delete */}
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
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Billing Summary */}
              <div className="mt-6 border-t pt-4 flex flex-col gap-4">
                {/* Top Row */}
                <div className="flex items-center justify-between">
                  {/* Left: Items Count */}
                  <div className="text-sm text-gray-500">
                    Items:{" "}
                    <span className="font-medium text-gray-700">
                      {items.length}
                    </span>
                  </div>

                  {/* Center: Actions */}
                 

                  {/* Right: Total */}
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Grand Total</div>
                    <div className="text-xl font-bold text-gray-900">
                      ₹ {grandTotal.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Extra Charges Section */}
                <div className="border-t pt-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Extra Charges</span>
                      <button 
                        type="button" 
                        onClick={() => setExtraCharges([...extraCharges, { label: "New Charge", amount: 0 }])}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        + ADD CHARGE
                      </button>
                    </div>
                    
                    {extraCharges.map((charge, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <input 
                          type="text"
                          value={charge.label}
                          onChange={(e) => {
                            const next = [...extraCharges];
                            next[idx].label = e.target.value;
                            setExtraCharges(next);
                          }}
                          className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-medium text-slate-600 outline-none"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-xs">₹</span>
                          <input 
                            type="number"
                            value={charge.amount || ""}
                            onChange={(e) => {
                              const next = [...extraCharges];
                              next[idx].amount = Number(e.target.value);
                              setExtraCharges(next);
                            }}
                            className="w-20 bg-transparent border-b border-slate-200 focus:border-indigo-600 outline-none text-right text-xs font-bold text-slate-700"
                          />
                          <button 
                            type="button" 
                            onClick={() => {
                              const next = [...extraCharges];
                              next.splice(idx, 1);
                              setExtraCharges(next);
                            }}
                            className="text-slate-300 hover:text-red-500 text-sm ml-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Row (Print + Checkout CTA) */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handlePrintPosReceipt}
                    disabled={items.length === 0 || saving}
                    className="bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition shadow-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <Printer size={18} />
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={openCheckoutModal}
                    disabled={items.length === 0 || saving}
                    className="bg-green-600 text-white px-8 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-green-700 transition shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                  >
                    {saving ? "Processing..." : (
                      <>
                        <ShoppingCart size={18} />
                        Checkout
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <aside className="h-[60vh] lg:h-[70vh] sticky top-0 overflow-hidden">
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
            grandTotal={grandTotal}
            items={items.map(it => ({
              ...it,
              productName: it.name,
              unitPrice: it.price
            }))}
            initialCustomerName={customer}
            initialCustomerPhone={phone}
            initialCustomerId={customerId}
            initialMembership={membership}
            initialMembershipPlanId={membershipPlanId}
            initialMembershipDiscount={discountTotal}
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
