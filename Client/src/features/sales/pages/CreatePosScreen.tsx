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
} from "@/services/apiClient";
import CreateProductModal from "../components/invoice/Modal/CreateProductModal";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import { useDebounce } from "@/hooks/useDebounce";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";
import { useAppSelector } from "@/store/hooks";
import {
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
        if (it.id === id) {
          if (field === "discount" && it.isCsp) {
            return { ...it, discount: 0 };
          }
          const updated = { ...it, [field]: Number(value) };
          if (field === "qty" || field === "price") {
            if (updated.isCsp) {
              return { ...updated, discount: 0, cashback: 0 };
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
        }
        return it;
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
        discount: isCsp ? 0 : benefits.discount || 0,
        cashback: isCsp ? 0 : benefits.cashback || 0,
        category: lineCategory,
        stockQty: selectedProduct?.trackStock
          ? Number(selectedProduct?.stockQty ?? 0)
          : undefined,
        image: selectedProduct?.imageUrl || (selectedProduct?.images && selectedProduct?.images[0]) || "",
        isCsp,
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

      printThermalReceipt({
        invoiceNo: savedCode,
        customerName: customer.trim() || "Walk-in Customer",
        customerPhone: phone.trim(),
        items: items.map((item) => ({
          name: item.name,
          qty: item.qty,
          price: item.price,
          discount: item.discount,
        })),
        totalMRP: subTotal,
        discountTotal:
          discountTotal +
          Number(payment.coupon?.discountAmount ?? 0) +
          Number(payment.referral?.discountAmount ?? 0),
        cashbackAmount: payment.cashbackTotal,
        finalAmount: payment.finalAmount,
        totalDue: payment.paymentBreakdown.dueAmount,
        totalQty: items.reduce((sum, item) => sum + item.qty, 0),
        extraCharges: payment.extraCharges,
      });

      Swal.fire("Success", "POS Transaction completed.", "success");
      setItems([]);
      setOpenCheckout(false);
    } catch (error: any) {
      Swal.fire("Error", "Could not complete transaction.", "error");
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
          if (e.currentTarget === e.target) requestClose();
        }}
      >
        <div className="max-h-[92vh] w-[95%] max-w-6xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-xl font-semibold">POS Billing</h2>
            <button
              type="button"
              onClick={requestClose}
              className="rounded-md p-1 text-gray-600 hover:bg-gray-100"
              aria-label="Close"
            >
              <X />
            </button>
          </div>

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

                            // Auto-apply discounts to existing items (skip CSP)
                            setItems(prev => prev.map(item => {
                              if (item.isCsp) {
                                return { ...item, discount: 0, cashback: 0 };
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

                    {/* Discount Input — CSP products cannot be discounted */}
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        value={item.isCsp ? 0 : item.discount}
                        disabled={Boolean(item.isCsp)}
                        title={item.isCsp ? "No discount on CSP products" : undefined}
                        onChange={(e) =>
                          handleChange(item.id, "discount", e.target.value)
                        }
                        className={`w-20 border rounded px-2 py-1 text-center ${
                          item.isCsp ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""
                        }`}
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
              <div className="flex items-center gap-2">
                <button className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">
                  Cancel
                </button>

                <button className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-100 transition">
                  Save Draft
                </button>

                <button className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-100 transition">
                  <Printer size={16} />
                  Print
                </button>
              </div>

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

            {/* Bottom Row (Checkout CTA) */}
            <div className="flex justify-end">
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
