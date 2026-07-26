import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Search,
  Scan,
  User,
  Plus,
  Minus,
  Trash2,
  Grid,
  Coffee,
  Leaf,
  Flame,
  Utensils,
  Layers,
  Cookie,
  MoreHorizontal,
  Pencil,
  Award,
  CreditCard,
  Save,
  FileText,
  Pause,
  ChevronRight,
  UserPlus,
  UtensilsCrossed,
  X,
  History,
} from "lucide-react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import AddFoodModal, {
  type FoodFormPayload,
} from "@/features/catalogue/components/AddFoodModal";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/store/hooks";
import {
  customerPayloadToFormData,
  foodPayloadToFormData,
  handleCreateCustomer,
  handleCreateInvoice,
  handleGetCustomers,
  handleGetFoods,
  handleUpdateFood,
  handleValidateReferralDiscount,
  type CustomerPayload,
  type FoodPayload,
} from "@/services/apiClient";

// Types
interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
}

interface FoodItem {
  id: string;
  name: string;
  price: number;
  isVeg: boolean;
  category: string;
  unit?: string;
  description?: string;
  /** Cloudinary secure_url (or placeholder) */
  image: string;
  imageUrl?: string | null;
  status?: "Active" | "Inactive";
}

const PLACEHOLDER_FOOD_IMAGE =
  "https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill/sample.jpg";

function normalizeCategoryKey(category: string) {
  return String(category || "Snacks")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function categoryIconFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("drink") || n.includes("beverage")) return Coffee;
  if (n.includes("healthy")) return Leaf;
  if (n.includes("starter")) return Flame;
  if (n.includes("main")) return Utensils;
  if (n.includes("combo")) return Layers;
  if (n.includes("dessert") || n.includes("sweet")) return Cookie;
  if (n.includes("extra")) return MoreHorizontal;
  return UtensilsCrossed;
}

function mapApiFood(raw: any): FoodItem | null {
  const id = String(raw?._id || raw?.id || "").trim();
  const name = String(raw?.name || "").trim();
  if (!id || !name) return null;
  const category = String(raw?.category || "Snacks").trim() || "Snacks";
  const imageUrl = String(raw?.imageUrl || "").trim();
  return {
    id,
    name,
    price: Math.max(0, Number(raw?.price ?? 0) || 0),
    isVeg: raw?.isVeg !== false && raw?.isVeg !== "false",
    category,
    unit: String(raw?.unit || "Plate").trim() || "Plate",
    description: String(raw?.description || "").trim(),
    image: imageUrl || PLACEHOLDER_FOOD_IMAGE,
    imageUrl: imageUrl || null,
    status: raw?.status === "Inactive" ? "Inactive" : "Active",
  };
}

function foodItemToPayload(food: FoodItem): FoodPayload {
  return {
    _id: food.id,
    name: food.name,
    category: food.category,
    price: food.price,
    unit: food.unit || "Plate",
    description: food.description || "",
    isVeg: food.isVeg,
    status: food.status === "Inactive" ? "Inactive" : "Active",
    imageUrl: food.imageUrl || null,
  };
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  tier: "Silver" | "Gold" | "New Customer" | string;
  points?: number;
  membershipType?: string;
  /** Customer's own share code (e.g. W9454ZZ5P) — not used as checkout discount code */
  referralCode?: string;
  referredBy?: string;
}

const WALK_IN_CUSTOMER: Customer = {
  id: "walk-in",
  name: "Walk-in Customer",
  phone: "",
  tier: "New Customer",
  points: 0,
  membershipType: "none",
};

function toInvoicePaymentMode(method: string) {
  const m = String(method || "Cash")
    .trim()
    .toUpperCase();
  if (m === "UPI") return "UPI";
  if (m === "CARD") return "CARD";
  if (m === "WALLET") return "WALLET";
  return "CASH";
}

type ReferralApplyResult = {
  discountAmount: number;
  code: string;
  inviterName: string;
  label: string;
  message: string;
};

function mapMembershipTier(membershipType?: string | null): string {
  const raw = String(membershipType || "none")
    .trim()
    .toLowerCase();
  if (!raw || raw === "none" || raw === "new") return "New Customer";
  if (raw.includes("gold")) return "Gold";
  if (raw.includes("silver")) return "Silver";
  // Show plan name nicely (basic/weekly/monthly/yearly/etc.)
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function mapApiCustomer(raw: any): Customer | null {
  const id = String(raw?._id || raw?.id || "").trim();
  const name = String(raw?.name || "").trim();
  if (!id || !name) return null;
  const membershipType = String(raw?.membershipType || "none");
  const ownCode = String(raw?.referralCode || raw?.referral?.code || "")
    .trim()
    .toUpperCase();
  const referredBy = raw?.referredBy
    ? String(raw.referredBy._id || raw.referredBy).trim()
    : "";
  return {
    id,
    name,
    phone: String(raw?.mobile || raw?.phone || "").trim(),
    tier: mapMembershipTier(membershipType),
    membershipType,
    points: Number(raw?.walletAmount ?? raw?.points ?? 0) || 0,
    referralCode: ownCode || undefined,
    referredBy: referredBy || undefined,
  };
}

interface OrderItem {
  item: FoodItem;
  quantity: number;
}

interface RecentBill {
  id: string;
  customerName: string;
  grandTotal: number;
  paymentMethod: string;
  date: string;
  itemsCount: number;
}

export default function FoodBill() {
  const navigate = useNavigate();
  const staff = useAppSelector((state) => state.user);

  // State Variables
  const [customers, setCustomers] = useState<Customer[]>([WALK_IN_CUSTOMER]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    WALK_IN_CUSTOMER.id,
  );
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showEditFoodModal, setShowEditFoodModal] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodPayload | null>(null);
  const [savingFood, setSavingFood] = useState(false);
  // Call customers API only after typing stops (300ms) — not on every keystroke
  const debouncedCustomerSearch = useDebounce(customerSearch.trim(), 300);
  // Keep input snappy while filtering the local list
  const deferredCustomerSearch = useDeferredValue(customerSearch.trim());

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [itemSearch, setItemSearch] = useState<string>("");
  const [viewAllItems, setViewAllItems] = useState<boolean>(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const debouncedItemSearch = useDebounce(itemSearch.trim(), 250);

  const [cart, setCart] = useState<OrderItem[]>([]);

  const [tableNumber, setTableNumber] = useState<string>("Table 5");
  const [orderType, setOrderType] = useState<string>("Takeaway");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [amountReceived, setAmountReceived] = useState<string>("0");
  const [billNote, setBillNote] = useState<string>("");
  const [savingBill, setSavingBill] = useState(false);

  // Referral discount (same API as invoice CheckoutModal)
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [referralCodeApplied, setReferralCodeApplied] = useState("");
  const [referralInviterName, setReferralInviterName] = useState("");
  const [referralLabel, setReferralLabel] = useState("Referral Discount");
  const [referralStatusMessage, setReferralStatusMessage] = useState("");
  const [loadingReferral, setLoadingReferral] = useState(false);

  // Logged-in staff from Redux (auto Billed By)
  const billedBy = useMemo(() => {
    const name = String(staff?.m_staff_name || "").trim() || "Staff";
    const id = String(staff?.m_staff_id || "").trim();
    return id ? `${name} (${id})` : name;
  }, [staff?.m_staff_name, staff?.m_staff_id]);

  const [showRecentBillsDrawer, setShowRecentBillsDrawer] =
    useState<boolean>(false);
  const [recentBills, setRecentBills] = useState<RecentBill[]>([]);

  const clearReferralDiscount = () => {
    setReferralDiscount(0);
    setReferralCodeApplied("");
    setReferralInviterName("");
    setReferralLabel("Referral Discount");
    setReferralStatusMessage("");
  };

  const fetchCustomers = async (searchText = "", signal?: AbortSignal) => {
    const q = searchText.trim();
    // Never auto-load the full customer list — only search results
    if (!q) {
      setCustomers([WALK_IN_CUSTOMER]);
      setLoadingCustomers(false);
      return;
    }

    try {
      setLoadingCustomers(true);
      const response = await handleGetCustomers(q, signal, 50);
      const rows = Array.isArray(response?.customers) ? response.customers : [];
      const mapped = rows
        .map(mapApiCustomer)
        .filter((c: Customer | null): c is Customer => Boolean(c));

      const walkInMatches = WALK_IN_CUSTOMER.name
        .toLowerCase()
        .includes(q.toLowerCase());

      setCustomers(
        walkInMatches
          ? [...mapped, WALK_IN_CUSTOMER]
          : mapped.length
            ? mapped
            : [],
      );
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return;
      }
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Remote search only when user pauses typing for 300ms (skip empty query)
  useEffect(() => {
    if (!debouncedCustomerSearch) {
      setCustomers([WALK_IN_CUSTOMER]);
      setLoadingCustomers(false);
      return;
    }
    const controller = new AbortController();
    void fetchCustomers(debouncedCustomerSearch, controller.signal);
    return () => controller.abort();
  }, [debouncedCustomerSearch]);

  const fetchFoods = async (searchText = "", signal?: AbortSignal) => {
    try {
      setLoadingFoods(true);
      const response = await handleGetFoods(
        { search: searchText, category: "All", status: "Active" },
        signal,
      );
      const rows = Array.isArray(response?.foods) ? response.foods : [];
      const mapped = rows
        .map(mapApiFood)
        .filter((f: FoodItem | null): f is FoodItem => Boolean(f));
      setFoodItems(mapped);
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return;
      }
      setFoodItems([]);
    } finally {
      setLoadingFoods(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchFoods(debouncedItemSearch, controller.signal);
    return () => controller.abort();
  }, [debouncedItemSearch]);

  // Selected Customer details helper
  const selectedCustomer = useMemo(() => {
    return (
      customers.find((c) => c.id === selectedCustomerId) || WALK_IN_CUSTOMER
    );
  }, [customers, selectedCustomerId]);

  const categories = useMemo<Category[]>(() => {
    const unique = Array.from(
      new Set(foodItems.map((f) => f.category).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    return [
      { id: "all", name: "All Items", icon: Grid },
      ...unique.map((name) => ({
        id: normalizeCategoryKey(name),
        name,
        icon: categoryIconFor(name),
      })),
    ];
  }, [foodItems]);

  // Show customers only after user types a search (never a default list)
  const filteredCustomers = useMemo(() => {
    const q = deferredCustomerSearch.toLowerCase();
    if (!q) return [];

    return [...customers]
      .filter((c) => {
        if (c.id === WALK_IN_CUSTOMER.id) {
          return WALK_IN_CUSTOMER.name.toLowerCase().includes(q);
        }
        const name = c.name.toLowerCase();
        const phone = String(c.phone || "").replace(/\D/g, "");
        const qDigits = q.replace(/\D/g, "");
        return (
          name.includes(q) || (qDigits.length > 0 && phone.includes(qDigits))
        );
      })
      .sort((a, b) => {
        if (a.id === WALK_IN_CUSTOMER.id) return 1;
        if (b.id === WALK_IN_CUSTOMER.id) return -1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [customers, deferredCustomerSearch]);

  const handleCreateCustomerSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    try {
      setCreatingCustomer(true);
      const createdBy = {
        m_staff_id: staff?.m_staff_id,
        m_staff_name: staff?.m_staff_name,
        m_staff_email: staff?.m_staff_email,
      };

      let response;
      if (args.profileImageFile) {
        const fd = customerPayloadToFormData(
          { ...args.payload, createdBy },
          args.profileImageFile,
        );
        response = await handleCreateCustomer(fd);
      } else {
        response = await handleCreateCustomer({
          ...args.payload,
          createdBy,
        });
      }

      const created = mapApiCustomer(response?.customer);
      if (created) {
        setCustomers((prev) => [
          created,
          ...prev.filter(
            (c) => c.id !== created.id && c.id !== WALK_IN_CUSTOMER.id,
          ),
          WALK_IN_CUSTOMER,
        ]);
        handleSelectCustomer(created);
      } else {
        await fetchCustomers(debouncedCustomerSearch);
      }

      setShowCreateCustomerModal(false);
      Swal.fire({
        title: "Customer Added",
        text: `${created?.name || "Customer"} has been selected for this bill.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create customer. Try again.",
        "error",
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Filtering Menu Items (search is server-side; category is client-side)
  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return foodItems;
    return foodItems.filter(
      (item) => normalizeCategoryKey(item.category) === selectedCategory,
    );
  }, [foodItems, selectedCategory]);

  // Visible Items (collapsible)
  const visibleItems = useMemo(() => {
    if (viewAllItems) return filteredItems;
    return filteredItems.slice(0, 8);
  }, [filteredItems, viewAllItems]);

  // Cart operations
  const addToCart = (item: FoodItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleEditFood = (food: FoodItem) => {
    setEditingFood(foodItemToPayload(food));
    setShowEditFoodModal(true);
  };

  const handleUpdateFoodSubmit = async (
    payload: FoodFormPayload,
    imageFile: File | null,
  ) => {
    const foodId = String(editingFood?._id || "").trim();
    if (!foodId) return;

    try {
      setSavingFood(true);
      const formData = foodPayloadToFormData(payload, imageFile);
      const response = await handleUpdateFood(foodId, formData);
      const updatedRaw = response?.food ?? response?.data ?? null;
      const updated = updatedRaw ? mapApiFood(updatedRaw) : null;

      // Refresh list + keep cart line in sync with new price/name/image
      await fetchFoods(debouncedItemSearch);
      if (updated) {
        setCart((prev) =>
          prev.map((line) =>
            line.item.id === foodId ? { ...line, item: updated } : line,
          ),
        );
      }

      setShowEditFoodModal(false);
      setEditingFood(null);
      await Swal.fire({
        icon: "success",
        title: "Food updated",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Update failed",
        err?.response?.data?.message || "Could not update food item.",
        "error",
      );
    } finally {
      setSavingFood(false);
    }
  };

  const updateQuantity = (itemId: string, change: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.item.id === itemId) {
            const newQty = i.quantity + change;
            return { ...i, quantity: newQty > 0 ? newQty : 1 };
          }
          return i;
        })
        .filter((i) => i.quantity > 0);
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  // Pricing calculations (referral applied after tax, same pattern as invoice checkout)
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
  }, [cart]);

  const tax = useMemo(() => {
    const taxableAmount = Math.max(0, subtotal - manualDiscount);
    return Math.round(taxableAmount * 0.05 * 100) / 100; // 5% tax
  }, [subtotal, manualDiscount]);

  const totalBeforeRound = useMemo(() => {
    return Math.max(0, subtotal - manualDiscount) + tax;
  }, [subtotal, manualDiscount, tax]);

  const roundedBeforeReferral = useMemo(() => {
    return Math.round(totalBeforeRound);
  }, [totalBeforeRound]);

  const roundOff = useMemo(() => {
    const diff = roundedBeforeReferral - totalBeforeRound;
    return Math.round(diff * 100) / 100;
  }, [roundedBeforeReferral, totalBeforeRound]);

  const grandTotal = useMemo(() => {
    return Math.max(0, roundedBeforeReferral - Number(referralDiscount || 0));
  }, [roundedBeforeReferral, referralDiscount]);

  // Loyalty calculations
  const loyaltyPointsEarned = useMemo(() => {
    if (selectedCustomer.tier === "New Customer") return 0;
    return Math.max(1, Math.floor(grandTotal / 100));
  }, [selectedCustomer, grandTotal]);

  // Change computation
  const changeAmount = useMemo(() => {
    const receivedNum = parseFloat(amountReceived) || 0;
    return Math.max(0, receivedNum - grandTotal);
  }, [amountReceived, grandTotal]);

  const applyReferralDiscount = async (opts?: {
    customer?: Customer;
  }): Promise<ReferralApplyResult | null> => {
    const customer = opts?.customer ?? selectedCustomer;
    const isWalkIn = customer.id === WALK_IN_CUSTOMER.id;
    // Same order amount basis as invoice checkout (before referral)
    const orderAmount = Math.max(0, subtotal - manualDiscount);

    if (isWalkIn || !customer.phone) {
      clearReferralDiscount();
      return null;
    }

    // Need cart amount > 0 — same as validate API (orderAmount must be > 0)
    if (orderAmount <= 0 || cart.length === 0) {
      clearReferralDiscount();
      setReferralStatusMessage(
        "Add food items to auto-apply referral discount for this customer.",
      );
      return null;
    }

    setLoadingReferral(true);
    try {
      // Same as invoice CheckoutModal handleSelectCustomer:
      // omit referralCode so server uses buyer.referredBy.
      // Inviter code (e.g. W9454ZZ5P) is returned in the response.
      const response = await handleValidateReferralDiscount({
        customerId: customer.id,
        customerPhone: customer.phone,
        orderAmount,
        items: cart.map((line) => ({
          productName: line.item.name,
          name: line.item.name,
          qty: line.quantity,
          unitPrice: line.item.price,
          price: line.item.price,
          discount: 0,
          category: "Food",
          lineTotal: line.item.price * line.quantity,
        })),
      });
      const data = response?.data || response;

      if (!data?.referralCode && !data?.ok && !Number(data?.discountAmount)) {
        clearReferralDiscount();
        setReferralStatusMessage(
          String(data?.message || "No referral discount for this customer."),
        );
        return null;
      }

      const discountAmt = Number(data.discountAmount || 0);
      const code = String(data.referralCode || "")
        .trim()
        .toUpperCase();
      const label = String(data.label || "Referral Discount");
      const inviterName = String(data.inviterName || "");
      const alreadyUsed =
        data.discountAlreadyUsed === true || data.discountEligible === false;
      const message = String(
        data.message ||
          (alreadyUsed
            ? "Referral discount already used on this account."
            : "Referral discount applied"),
      );

      setReferralDiscount(discountAmt);
      setReferralLabel(label);
      setReferralCodeApplied(code);
      setReferralInviterName(inviterName);
      setReferralStatusMessage(message);

      return {
        discountAmount: discountAmt,
        code,
        inviterName,
        label,
        message,
      };
    } catch (error: unknown) {
      clearReferralDiscount();
      const err = error as { response?: { data?: { message?: string } } };
      setReferralStatusMessage(
        err?.response?.data?.message ||
          "No referral discount for this customer.",
      );
      return null;
    } finally {
      setLoadingReferral(false);
    }
  };

  /** Same as invoice CheckoutModal — apply referral as soon as customer is picked */
  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    if (cust.id === WALK_IN_CUSTOMER.id) {
      clearReferralDiscount();
      return;
    }
    void applyReferralDiscount({ customer: cust });
  };

  // Re-apply when cart / discount changes for the selected customer
  const referralOrderKey = useMemo(
    () =>
      `${selectedCustomer.id}|${selectedCustomer.phone}|${cart
        .map((c) => `${c.item.id}:${c.quantity}`)
        .join(",")}|${manualDiscount}`,
    [selectedCustomer.id, selectedCustomer.phone, cart, manualDiscount],
  );
  const debouncedReferralKey = useDebounce(referralOrderKey, 350);

  useEffect(() => {
    void applyReferralDiscount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedReferralKey]);

  // Handle Generate Bill → same POST /invoice API as sales invoice
  const handleGenerateBill = async () => {
    if (cart.length === 0) {
      Swal.fire({
        title: "Cart Empty",
        text: "Please add at least one item to generate a bill.",
        icon: "warning",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    if (
      selectedCustomer.id === WALK_IN_CUSTOMER.id ||
      !selectedCustomer.phone
    ) {
      Swal.fire({
        title: "Customer required",
        text: "Search and select a customer with a mobile number before generating the invoice.",
        icon: "warning",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    const nowStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const today = new Date().toISOString().split("T")[0];
    const paid =
      paymentMethod === "Cash"
        ? Math.max(Number(amountReceived) || grandTotal, grandTotal)
        : grandTotal;
    const mode = toInvoicePaymentMode(paymentMethod);

    const confirm = await Swal.fire({
      title: "Confirm Bill Generation",
      html: `
        <div class="text-left bg-gray-50 p-4 rounded-xl text-sm leading-relaxed border border-gray-100">
          <p class="font-bold text-gray-800 text-center mb-3">WOO WOO ART HOUSE</p>
          <div class="flex justify-between text-xs text-gray-500 mb-2">
            <span>Food Bill → Invoice</span>
            <span>Date: Today, ${nowStr}</span>
          </div>
          <hr class="border-dashed border-gray-300 my-2" />
          <div class="space-y-1 my-2">
            ${cart
              .map(
                (item) => `
              <div class="flex justify-between text-xs">
                <span class="text-gray-700">${item.item.name} x${item.quantity}</span>
                <span class="font-medium text-gray-900">₹${item.item.price * item.quantity}</span>
              </div>
            `,
              )
              .join("")}
          </div>
          <hr class="border-dashed border-gray-300 my-2" />
          <div class="space-y-1 text-xs">
            <div class="flex justify-between"><span class="text-gray-500">Subtotal:</span><span class="text-gray-900">₹${subtotal.toFixed(2)}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Discount:</span><span class="text-green-600">-₹${manualDiscount.toFixed(2)}</span></div>
            ${
              referralDiscount > 0
                ? `<div class="flex justify-between"><span class="text-gray-500">${referralLabel}${referralCodeApplied ? ` (${referralCodeApplied})` : ""}:</span><span class="text-green-600">-₹${referralDiscount.toFixed(2)}</span></div>`
                : ""
            }
            <div class="flex justify-between"><span class="text-gray-500">Tax (5%):</span><span class="text-gray-900">₹${tax.toFixed(2)}</span></div>
            <div class="flex justify-between font-bold text-base text-gray-900 pt-1 mt-1 border-t border-gray-200">
              <span>Grand Total:</span>
              <span class="text-blue-600">₹${grandTotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-xs mt-2 text-gray-600 pt-1 border-t border-gray-100">
              <span>Paid via ${paymentMethod}:</span>
              <span>₹${paid.toFixed(2)}</span>
            </div>
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save Invoice",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#3B82F6",
      cancelButtonColor: "#6B7280",
    });

    if (!confirm.isConfirmed) return;

    try {
      setSavingBill(true);
      // Refresh referral once more before save; use returned values (avoid stale state)
      const referral = await applyReferralDiscount();
      const appliedReferralDiscount = Number(
        referral?.discountAmount ?? referralDiscount ?? 0,
      );
      const appliedReferralCode = String(
        referral?.code ?? referralCodeApplied ?? "",
      ).trim();
      const appliedReferralLabel = String(
        referral?.label ?? referralLabel ?? "Referral Discount",
      );
      const appliedReferralInviter = String(
        referral?.inviterName ?? referralInviterName ?? "",
      );
      const payableTotal = Math.max(
        0,
        roundedBeforeReferral - appliedReferralDiscount,
      );
      const paidFinal =
        paymentMethod === "Cash"
          ? Math.max(Number(amountReceived) || payableTotal, payableTotal)
          : payableTotal;

      const notes = [
        billNote,
        specialInstructions,
        `${orderType} · ${tableNumber}`,
        "Source: Food Bill",
      ]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
        .join(" | ");

      const response = await handleCreateInvoice({
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        invoiceDate: today,
        dueDate: today,
        salesPersonName: staff?.m_staff_name ?? "Food Bill",
        notes,
        items: cart.map((line) => ({
          productName: line.item.name,
          qty: line.quantity,
          unitPrice: line.item.price,
          discount: 0,
          category: "Food",
        })),
        subTotal: subtotal,
        discountTotal:
          Number(manualDiscount || 0) + Number(appliedReferralDiscount || 0),
        grandTotal: payableTotal,
        coupon: null,
        referral: appliedReferralCode
          ? {
              code: appliedReferralCode,
              discountAmount: appliedReferralDiscount,
              inviterName: appliedReferralInviter,
              label: appliedReferralLabel,
            }
          : null,
        status: "final",
        mode,
        paymentStatus: "full",
        paymentBreakdown: {
          cash: mode === "CASH" ? paidFinal : 0,
          upi: mode === "UPI" ? paidFinal : 0,
          card: mode === "CARD" ? paidFinal : 0,
          wallet: mode === "WALLET" ? paidFinal : 0,
          paidAmount: paidFinal,
          dueAmount: 0,
          changeAmount: Math.max(0, paidFinal - payableTotal),
        },
        createdBy: {
          m_staff_id: staff?.m_staff_id ?? null,
          m_staff_name: staff?.m_staff_name ?? null,
          m_staff_email: staff?.m_staff_email ?? null,
        },
      });

      const invoiceCode =
        response?.invoice?.invoiceCode ||
        response?.invoice?.invoiceNumber ||
        response?.invoice?._id ||
        "N/A";

      const newBill: RecentBill = {
        id: String(invoiceCode),
        customerName: selectedCustomer.name,
        grandTotal: payableTotal,
        paymentMethod,
        date: `Today, ${nowStr}`,
        itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      };
      setRecentBills((prev) => [newBill, ...prev]);

      await Swal.fire({
        icon: "success",
        title: "Invoice created",
        html: `
          <div class="text-sm text-left space-y-1">
            <p>Invoice <b>${invoiceCode}</b> saved.</p>
            ${
              appliedReferralDiscount > 0
                ? `<p class="text-green-700">${appliedReferralLabel}${appliedReferralCode ? ` (${appliedReferralCode})` : ""}: −₹${appliedReferralDiscount.toFixed(2)}</p>`
                : ""
            }
            <p>Total: <b>₹${payableTotal.toFixed(2)}</b></p>
          </div>
        `,
        confirmButtonColor: "#3B82F6",
      });

      setCart([]);
      setAmountReceived("0");
      setManualDiscount(0);
      setSpecialInstructions("");
      setBillNote("");
      clearReferralDiscount();
      setCustomerSearch("");
      setSelectedCustomerId(WALK_IN_CUSTOMER.id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Bill failed",
        err?.response?.data?.message ?? "Could not create invoice. Try again.",
        "error",
      );
    } finally {
      setSavingBill(false);
    }
  };

  const handleManualDiscountClick = async () => {
    const { value: discountInput } = await Swal.fire({
      title: "Add Manual Discount",
      input: "number",
      inputLabel: "Discount Amount (₹)",
      inputValue: manualDiscount.toString(),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value || isNaN(Number(value)) || Number(value) < 0) {
          return "Please enter a valid positive discount amount!";
        }
        if (Number(value) > subtotal) {
          return `Discount cannot exceed subtotal (₹${subtotal})`;
        }
        return null;
      },
      confirmButtonColor: "#3B82F6",
    });

    if (discountInput) {
      setManualDiscount(Number(discountInput));
    }
  };

  const handleInstructionsClick = async () => {
    const { value: text } = await Swal.fire({
      title: "Special Instructions",
      input: "textarea",
      inputPlaceholder: "E.g., No onion/garlic, extra spicy, warm water...",
      inputValue: specialInstructions,
      showCancelButton: true,
      confirmButtonColor: "#3B82F6",
    });

    if (text !== undefined) {
      setSpecialInstructions(text);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-1 py-2 sm:px-2 md:py-4">
      {/* 1. TOP HEADER BAR */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition hover:bg-gray-50 cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 text-lg md:text-xl">
              Billing
            </h1>
            <p className="text-xs text-gray-500">Create bill for food orders</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Table Selector */}
          <div className="relative inline-block text-left">
            <select
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 focus:outline-none appearance-none pr-8 cursor-pointer"
            >
              <option value="Table 5">🍽️ Dine In: Table 5</option>
              <option value="Table 1">🍽️ Dine In: Table 1</option>
              <option value="Table 2">🍽️ Dine In: Table 2</option>
              <option value="Table 3">🍽️ Dine In: Table 3</option>
              <option value="Table 4">🍽️ Dine In: Table 4</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-3 pointer-events-none text-gray-400"
            />
          </div>

          {/* Order Type Selector */}
          <div className="relative inline-block text-left">
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 focus:outline-none appearance-none pr-8 cursor-pointer"
            >
              <option value="Takeaway">🛍️ Order Type: Takeaway</option>
              <option value="Dine In">🍽️ Order Type: Dine In</option>
              <option value="Delivery">🚚 Order Type: Delivery</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-3 pointer-events-none text-gray-400"
            />
          </div>

          {/* New Walk-in Button */}
          <button
            onClick={() => {
              handleSelectCustomer(WALK_IN_CUSTOMER);
              setCart([]);
              setManualDiscount(0);
              setSpecialInstructions("");
              setCustomerSearch("");
              Swal.fire({
                title: "New Walk-in Session",
                text: "Cart cleared. Walk-in customer selected.",
                icon: "success",
                timer: 1200,
                showConfirmButton: false,
              });
            }}
            className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 transition cursor-pointer"
          >
            <Plus size={14} />
            New Walk-in
          </button>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT / CENTER PANEL (8 Columns on desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* A. CUSTOMER SEARCH & QUICK CARDS */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            {/* Search customer */}
            <div className="mb-3.5 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600 focus-within:border-blue-400 focus-within:bg-white transition-colors duration-150">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search customer by name or mobile"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
              {loadingCustomers ? (
                <span className="shrink-0 text-[10px] font-medium text-blue-500">
                  Searching…
                </span>
              ) : null}
              <span title="Scan Barcode" className="shrink-0">
                <Scan
                  size={18}
                  className="cursor-pointer text-gray-400 hover:text-gray-600"
                />
              </span>
            </div>

            {/* Quick Cards Grid — filtered via useMemo on each key; API only after pause */}
            <div
              className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 ${
                loadingCustomers &&
                customerSearch.trim() !== debouncedCustomerSearch
                  ? "opacity-80"
                  : ""
              }`}
            >
              {filteredCustomers.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-500">
                  {!customerSearch.trim()
                    ? "Search by name or mobile to find a customer. Walk-in stays selected by default."
                    : loadingCustomers
                      ? "Looking up customers…"
                      : "No customers found. Add a new customer to continue."}
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomerId === cust.id;
                  const initials = cust.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const isWalkIn = cust.id === WALK_IN_CUSTOMER.id;

                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition duration-150 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/50 shadow-2xs"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          cust.tier === "Gold"
                            ? "bg-amber-100 text-amber-700"
                            : cust.tier === "Silver"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {isWalkIn || !cust.phone ? (
                          <User size={16} />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-gray-900 text-xs sm:text-sm">
                          {cust.name}
                        </h3>
                        <p className="truncate text-[11px] text-gray-500">
                          {cust.phone || "No phone linked"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span
                            className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                              cust.tier === "Gold"
                                ? "border border-amber-100 bg-amber-50 text-amber-600"
                                : cust.tier === "Silver"
                                  ? "border border-slate-200 bg-slate-100 text-slate-600"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {cust.tier}
                          </span>
                          {cust.referredBy ? (
                            <span className="inline-block rounded-md border border-green-100 bg-green-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-green-700">
                              Referred
                            </span>
                          ) : null}
                          {cust.referralCode ? (
                            <span
                              className="inline-block rounded-md border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-indigo-700"
                              title="Customer's own share code (not applied as discount)"
                            >
                              {cust.referralCode}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add customer action */}
            <div className="mt-3.5 text-center">
              <button
                type="button"
                onClick={() => setShowCreateCustomerModal(true)}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-800"
              >
                <UserPlus size={14} />+ Add New Customer
              </button>
            </div>
          </div>

          {/* B. CATEGORIES SIDEBAR + PRODUCTS LIST */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Category sidebar list (1/4 columns on desktop) */}
            <div className="md:col-span-1 flex md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 pb-2 md:pb-0 scrollbar-none">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setViewAllItems(false); // Reset view limit on category switch
                    }}
                    className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs font-semibold whitespace-nowrap transition cursor-pointer md:w-full ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <IconComponent size={16} className="shrink-0" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Dishes list grid (3/4 columns on desktop) */}
            <div className="md:col-span-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs flex flex-col">
              {/* Search item */}
              <div className="mb-3.5 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-gray-600 focus-within:border-blue-400 transition-colors">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search item..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-gray-800 outline-none"
                />
                <button
                  className="text-gray-400 hover:text-gray-600"
                  title="Filters"
                >
                  <SlidersIcon size={16} />
                </button>
              </div>

              {/* Items Rows */}
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {loadingFoods ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[70px] animate-pulse rounded-xl border border-gray-50 bg-gray-50"
                    />
                  ))
                ) : visibleItems.length > 0 ? (
                  visibleItems.map((food) => {
                    const isInCart = cart.some((c) => c.item.id === food.id);

                    return (
                      <div
                        key={food.id}
                        className="flex items-center justify-between rounded-xl border border-gray-50 p-2 transition hover:bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={food.image}
                            alt={food.name}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                PLACEHOLDER_FOOD_IMAGE;
                            }}
                            className="h-14 w-14 rounded-lg border border-gray-100 bg-gray-100 object-cover shadow-2xs"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-gray-900">
                                {food.name}
                              </span>
                              <span
                                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border text-[8px] font-bold ${
                                  food.isVeg
                                    ? "border-green-600 text-green-600"
                                    : "border-red-600 text-red-600"
                                }`}
                                title={
                                  food.isVeg ? "Vegetarian" : "Non-Vegetarian"
                                }
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${food.isVeg ? "bg-green-600" : "bg-red-600"}`}
                                />
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-gray-600">
                              ₹{food.price}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            title="Edit food item"
                            aria-label={`Edit ${food.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditFood(food);
                            }}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-blue-50/40 text-blue-600 transition hover:bg-blue-50"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => addToCart(food)}
                            className={`cursor-pointer rounded-lg border px-4 py-1.5 text-xs font-bold transition ${
                              isInCart
                                ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                                : "border-blue-200 bg-blue-50/40 text-blue-600 hover:bg-blue-50"
                            }`}
                          >
                            {isInCart ? "Add +" : "Add"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-xs text-gray-400">
                    <UtensilsCrossed
                      size={32}
                      className="mx-auto mb-2 opacity-50"
                    />
                    {itemSearch.trim()
                      ? "No food items match your search."
                      : "No active foods yet. Add foods from Catalogue → Foods."}
                  </div>
                )}
              </div>

              {/* View More Items */}
              {filteredItems.length > 8 && (
                <div className="mt-4 border-t border-gray-100 pt-3 text-center">
                  <button
                    onClick={() => setViewAllItems(!viewAllItems)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-800 transition cursor-pointer"
                  >
                    <span>
                      {viewAllItems ? "View Less Items" : "View More Items"}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${viewAllItems ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: ORDER SUMMARY SIDEBAR (4 Columns on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col h-full min-h-[600px] justify-between">
            <div>
              {/* Order summary header */}
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="font-bold text-gray-900 text-sm">
                  Order Summary
                </h2>
                <div className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600 border border-blue-100">
                  <span>{tableNumber}</span>
                  <button
                    onClick={async () => {
                      const { value: tbl } = await Swal.fire({
                        title: "Edit Table Number",
                        input: "text",
                        inputValue: tableNumber,
                        showCancelButton: true,
                        confirmButtonColor: "#3B82F6",
                      });
                      if (tbl) setTableNumber(tbl);
                    }}
                    className="hover:text-blue-800 animate-pulse"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              </div>

              {/* Cart List */}
              <div className="mb-4 max-h-[220px] overflow-y-auto space-y-3 pr-1">
                {cart.length > 0 ? (
                  cart.map((item) => (
                    <div
                      key={item.item.id}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <h4 className="truncate text-xs font-bold text-gray-800">
                          {item.item.name}
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          {item.quantity} x ₹{item.item.price}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Qty Selector */}
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1">
                          <button
                            onClick={() => updateQuantity(item.item.id, -1)}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-black cursor-pointer"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="text-xs font-bold text-gray-800 w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.item.id, 1)}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-black cursor-pointer"
                          >
                            <Plus size={10} />
                          </button>
                        </div>

                        {/* Price */}
                        <span className="text-xs font-bold text-gray-800 min-w-[32px] text-right">
                          ₹{item.item.price * item.quantity}
                        </span>

                        {/* Delete button */}
                        <button
                          onClick={() => removeFromCart(item.item.id)}
                          className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    No items in order
                  </div>
                )}
              </div>

              {/* Special Instructions Link */}
              <div className="mb-4">
                <button
                  onClick={handleInstructionsClick}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-200 bg-blue-50/20 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                >
                  <Pencil size={12} />
                  {specialInstructions
                    ? "Edit Special Instructions"
                    : "Add Special Instructions"}
                </button>
                {specialInstructions && (
                  <div className="mt-1.5 rounded-lg bg-gray-50 p-2 text-[10px] text-gray-500 italic border border-gray-100">
                    "{specialInstructions}"
                  </div>
                )}
              </div>

              {/* Bill values breakdown */}
              <div className="border-t border-gray-100 pt-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-850">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 items-center">
                  <span>Discount</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleManualDiscountClick}
                      className="text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Add Discount
                    </button>
                    <span className="font-semibold text-green-600">
                      -₹{manualDiscount.toFixed(2)}
                    </span>
                  </div>
                </div>
                {selectedCustomer.id !== WALK_IN_CUSTOMER.id ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/50 px-2.5 py-2 space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-violet-600">
                        Referral Discount
                        {loadingReferral ? " …" : ""}
                      </span>
                      <span className="text-xs font-semibold text-green-600">
                        -₹{Number(referralDiscount || 0).toFixed(2)}
                      </span>
                    </div>
                    {referralDiscount > 0 ? (
                      <p className="text-[10px] text-violet-700">
                        {referralLabel}
                        {referralCodeApplied
                          ? ` · Code ${referralCodeApplied}`
                          : ""}
                        {referralInviterName
                          ? ` · referred by ${referralInviterName}`
                          : ""}
                      </p>
                    ) : (
                      <p className="text-[10px] text-violet-500">
                        {referralStatusMessage ||
                          "Select customer — discount auto-applies if they were referred."}
                      </p>
                    )}
                  </div>
                ) : null}
                <div className="flex justify-between text-gray-500">
                  <span>Tax (5%)</span>
                  <span className="font-semibold text-gray-850">
                    ₹{tax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Round off</span>
                  <span className="font-semibold text-gray-850">
                    ₹
                    {roundOff >= 0
                      ? `+${roundOff.toFixed(2)}`
                      : roundOff.toFixed(2)}
                  </span>
                </div>

                {/* Grand Total Highlight */}
                <div className="mt-3.5 flex items-center justify-between rounded-xl bg-blue-50 p-3 border border-blue-100">
                  <span className="font-bold text-blue-700 text-sm">
                    Grand Total
                  </span>
                  <span className="font-extrabold text-blue-700 text-base md:text-lg">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Loyalty banner */}
              {selectedCustomer.tier !== "New Customer" && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 p-2.5 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-bold text-gray-900">
                        {selectedCustomer.name} ({selectedCustomer.tier})
                      </h4>
                      <p className="text-[10px] text-gray-600">
                        You will earn {loyaltyPointsEarned} points on this bill
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCustomerId(WALK_IN_CUSTOMER.id);
                      clearReferralDiscount();
                    }}
                    className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 border border-gray-200 transition cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Payment Methods */}
              <div className="mt-4 border-t border-gray-100 pt-3.5">
                <h3 className="mb-2 text-xs font-bold text-gray-600">
                  Payment Method
                </h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "Cash", label: "Cash", icon: DollarSignIcon },
                    { id: "UPI", label: "UPI", icon: UpiIcon },
                    { id: "Card", label: "Card", icon: CreditCard },
                    { id: "More", label: "More", icon: MoreHorizontal },
                  ].map((method) => {
                    const IconComp = method.icon;
                    const isActive = paymentMethod === method.id;

                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 transition duration-150 cursor-pointer ${
                          isActive
                            ? "border-blue-500 bg-blue-50/50 text-blue-600 font-bold"
                            : "border-gray-250 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <IconComp size={16} />
                        <span className="text-[10px]">{method.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Amount Received (Only if Cash is selected) */}
                {paymentMethod === "Cash" && (
                  <div className="mt-3.5 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">
                          Amount Received
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-gray-500">
                            ₹
                          </span>
                          <input
                            type="number"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-5 pr-2.5 text-xs font-bold text-gray-800 focus:border-blue-400 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">
                          Change
                        </label>
                        <div className="rounded-xl bg-gray-50 border border-gray-100 py-1.5 px-3 text-xs font-bold text-green-600 min-h-[30px] flex items-center">
                          ₹{changeAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Billing Actions */}
            <div className="mt-5 pt-3 border-t border-gray-100 space-y-2">
              <button
                onClick={() => void handleGenerateBill()}
                disabled={savingBill || cart.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FileText size={15} />
                {savingBill ? "Saving Invoice…" : "Generate Bill"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (cart.length === 0) return;
                    Swal.fire({
                      title: "Order Held",
                      text: "The current bill is placed on hold.",
                      icon: "info",
                      timer: 1200,
                      showConfirmButton: false,
                    });
                  }}
                  className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  <Pause size={12} />
                  Hold Order
                </button>
                <button
                  onClick={() => {
                    if (cart.length === 0) return;
                    Swal.fire({
                      title: "Saved as Draft",
                      text: "Order details saved to drafts.",
                      icon: "success",
                      timer: 1200,
                      showConfirmButton: false,
                    });
                  }}
                  className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  <Save size={12} />
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. UTILITIES BOTTOM FOOTER BAR */}
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs md:flex-row md:items-center md:justify-between">
        {/* Cashier / Operator Selection */}
        <div className="flex flex-1 items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
              Billed By
            </label>
            <div className="relative min-w-[180px]">
              <div
                className="rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-xs font-semibold text-gray-700"
                title="Logged-in staff from session"
              >
                {billedBy}
              </div>
              <User
                size={13}
                className="pointer-events-none absolute left-2.5 top-2.5 text-gray-400"
              />
            </div>
          </div>

          {/* Bill Note input */}
          <div className="flex-1 max-w-sm">
            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
              Bill Note
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Add note (optional)"
                value={billNote}
                onChange={(e) => setBillNote(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
              />
              <Pencil
                size={11}
                className="absolute right-3 top-2.5 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Recent Bills navigation action */}
        <div>
          <button
            onClick={() => setShowRecentBillsDrawer(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            <History size={14} className="text-gray-500" />
            Recent Bills
            <ChevronRight size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {showCreateCustomerModal ? (
        <CreateCustomerModal
          loading={creatingCustomer}
          onClose={() => setShowCreateCustomerModal(false)}
          onSubmit={handleCreateCustomerSubmit}
        />
      ) : null}

      <AddFoodModal
        open={showEditFoodModal}
        loading={savingFood}
        initialFood={editingFood}
        onClose={() => {
          if (savingFood) return;
          setShowEditFoodModal(false);
          setEditingFood(null);
        }}
        onSubmit={handleUpdateFoodSubmit}
      />

      {/* RECENT BILLS SIDEBAR DRAWER */}
      {showRecentBillsDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-sm bg-white p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-gray-150 pb-3">
                <h3 className="font-bold text-gray-900 text-sm md:text-base flex items-center gap-1.5">
                  <History size={16} />
                  Recent Bills
                </h3>
                <button
                  onClick={() => setShowRecentBillsDrawer(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[75vh]">
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => {
                      Swal.fire({
                        title: bill.id,
                        html: `
                          <div class="text-xs text-left bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1">
                            <p><strong>Customer:</strong> ${bill.customerName}</p>
                            <p><strong>Total Paid:</strong> ₹${bill.grandTotal.toFixed(2)}</p>
                            <p><strong>Payment Mode:</strong> ${bill.paymentMethod}</p>
                            <p><strong>Time:</strong> ${bill.date}</p>
                            <p><strong>Items quantity:</strong> ${bill.itemsCount} items</p>
                          </div>
                        `,
                        icon: "info",
                        confirmButtonText: "Close",
                        confirmButtonColor: "#3B82F6",
                      });
                    }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-800 text-xs">
                        {bill.id}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {bill.date}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 truncate max-w-[150px]">
                        {bill.customerName}
                      </span>
                      <span className="font-extrabold text-blue-600">
                        ₹{bill.grandTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                      <span>
                        {bill.itemsCount} item{bill.itemsCount > 1 ? "s" : ""}
                      </span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded-sm">
                        {bill.paymentMethod}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowRecentBillsDrawer(false)}
              className="w-full py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-250 transition cursor-pointer"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponents / Mini Emojis/SVGs Icons
function SlidersIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="2" y1="14" x2="6" y2="14" />
      <line x1="10" y1="8" x2="14" y2="8" />
      <line x1="18" y1="16" x2="22" y2="16" />
    </svg>
  );
}

function DollarSignIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-green-600"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function UpiIcon(_props: { size?: number } = {}) {
  return (
    <div
      className="font-black italic text-[9px] border border-blue-600 text-blue-600 bg-white px-1 leading-none rounded-sm shrink-0 flex items-center justify-center h-4"
      style={{ minWidth: "22px" }}
      title="Unified Payments Interface"
    >
      UPI
    </div>
  );
}
