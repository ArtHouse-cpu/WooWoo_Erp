import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ChevronDown,
  Search,
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
  CreditCard,
  Save,
  FileText,
  Pause,
  ChevronRight,
  UserPlus,
  UtensilsCrossed,
  Wallet,
  X,
  History,
  Tag,
} from "lucide-react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import AddFoodModal, {
  type FoodFormPayload,
} from "@/features/catalogue/components/AddFoodModal";
import StaffVerifyModal from "@/features/sales/components/invoice/Modal/StaffVerifyModal";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/store/hooks";
import {
  customerPayloadToFormData,
  foodPayloadToFormData,
  handleCreateCustomer,
  handleCreateInvoice,
  handleGetCustomers,
  handleGetFoods,
  handleGetMemberships,
  handleGetWalletById,
  handleGetWalletInstructions,
  handleUpdateFood,
  handleValidateCoupon,
  handleValidateReferralDiscount,
  type CustomerPayload,
  type FoodPayload,
  type MembershipPlanPayload,
  type VerifiedStaff,
} from "@/services/apiClient";
import {
  membershipBenefitsForLine,
  summarizeMembershipForCart,
} from "@/features/sales/utils/membershipInvoiceUtils";
import { creditWalletCashback } from "@/features/sales/utils/walletCashback";

type SplitPayments = {
  cash: number;
  upi: number;
  card: number;
  wallet: number;
};

type SplitKey = keyof SplitPayments;

const FOOD_BILL_DRAFTS_KEY = "woowoo-foodbill-drafts";
const PLACEHOLDER_FOOD_IMAGE =
  "https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill/sample.jpg";

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
  membershipPlanId?: string | null;
  /** Customer's own share code (e.g. W9454ZZ5P) — not used as checkout discount code */
  referralCode?: string;
  referredBy?: string;
}

interface OrderItem {
  item: FoodItem;
  quantity: number;
}

type FoodBillDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  label: string;
  cart: OrderItem[];
  customer: Customer;
  tableNumber: string;
  orderType: string;
  paymentMethod: string;
  amountReceived: string;
  isMultiMode: boolean;
  splitPayments: SplitPayments;
  billNote: string;
  promoCodeInput?: string;
  couponCode?: string;
  couponDiscount?: number;
};

function loadDrafts(): FoodBillDraft[] {
  try {
    const raw = localStorage.getItem(FOOD_BILL_DRAFTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persistDrafts(list: FoodBillDraft[]) {
  localStorage.setItem(FOOD_BILL_DRAFTS_KEY, JSON.stringify(list));
}

function makeDraftLabel(
  cart: OrderItem[],
  customerName: string,
  total: number,
) {
  const qty = cart.reduce((s, l) => s + l.quantity, 0);
  return `${customerName || "Walk-in"} · ${qty} item(s) · ₹${total.toFixed(0)}`;
}

const WALK_IN_CUSTOMER: Customer = {
  id: "walk-in",
  name: "Walk-in Customer",
  phone: "",
  tier: "New Customer",
  points: 0,
  membershipType: "none",
  membershipPlanId: null,
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

function formatCustomerLabel(cust: { name: string; phone?: string }) {
  const phone = String(cust.phone || "").trim();
  return phone ? `${cust.name} · ${phone}` : cust.name;
}

function mapApiCustomer(raw: any): Customer | null {
  const id = String(raw?._id || raw?.id || "").trim();
  const name = String(raw?.name || "").trim();
  if (!id || !name) return null;
  const membershipType = String(raw?.membershipType || "none");
  const membershipPlanId = raw?.membershipPlanId
    ? String(
        raw.membershipPlanId._id ||
          raw.membershipPlanId.id ||
          raw.membershipPlanId,
      ).trim()
    : null;
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
    membershipPlanId: membershipPlanId || null,
    points: Number(raw?.walletAmount ?? raw?.points ?? 0) || 0,
    referralCode: ownCode || undefined,
    referredBy: referredBy || undefined,
  };
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
  /** Keep full customer (membership fields) even if search refetch replaces the list */
  const [selectedCustomerCache, setSelectedCustomerCache] =
    useState<Customer>(WALK_IN_CUSTOMER);   
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerSearchWrapRef = useRef<HTMLDivElement>(null);
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
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [amountReceived, setAmountReceived] = useState<string>("0");
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayments>({
    cash: 0,
    upi: 0,
    card: 0,
    wallet: 0,
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [minimumWalletBalance, setMinimumWalletBalance] = useState(0);
  const [billNote, setBillNote] = useState<string>("");
  const [savingBill, setSavingBill] = useState(false);
  const [showStaffVerify, setShowStaffVerify] = useState(false);
  const [membershipPlans, setMembershipPlans] = useState<
    MembershipPlanPayload[]
  >([]);

  // Promo codes (coupon OR referral — same APIs as invoice CheckoutModal)
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoType, setPromoType] = useState<"coupon" | "referral">("coupon");
  const [loadingPromo, setLoadingPromo] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLabel, setCouponLabel] = useState("");
  /** Coupon and membership discount are mutually exclusive */
  const [waiveMembershipForCoupon, setWaiveMembershipForCoupon] =
    useState(false);
  // Referral discount (auto from referredBy + optional manual code)
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [referralCodeApplied, setReferralCodeApplied] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState("");
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
  const [drafts, setDrafts] = useState<FoodBillDraft[]>(() => loadDrafts());
  const [showDraftsDrawer, setShowDraftsDrawer] = useState(false);

  useEffect(() => {
    setDrafts(loadDrafts());
  }, []);

  const restoreDraft = (d: FoodBillDraft) => {
    const customer = d.customer || WALK_IN_CUSTOMER;
    setCart(Array.isArray(d.cart) ? d.cart : []);
    setSelectedCustomerCache(customer);
    setSelectedCustomerId(customer.id);
    setCustomers((prev) => {
      if (customer.id === WALK_IN_CUSTOMER.id) return [WALK_IN_CUSTOMER];
      const without = prev.filter(
        (c) => c.id !== customer.id && c.id !== WALK_IN_CUSTOMER.id,
      );
      return [customer, ...without, WALK_IN_CUSTOMER];
    });
    setCustomerSearch(formatCustomerLabel(customer));
    setTableNumber(d.tableNumber || "Table 5");
    setOrderType(d.orderType || "Takeaway");
    setPaymentMethod(d.paymentMethod || "Cash");
    setAmountReceived(d.amountReceived || "0");
    setIsMultiMode(Boolean(d.isMultiMode));
    setSplitPayments(
      d.splitPayments || { cash: 0, upi: 0, card: 0, wallet: 0 },
    );
    setBillNote(d.billNote || "");
    setPromoCodeInput(d.promoCodeInput || "");
    setCouponCode(d.couponCode || "");
    setCouponDiscount(Number(d.couponDiscount || 0) || 0);
    setCouponLabel(d.couponCode ? "Coupon" : "");
    // Referral is not stored in drafts — clear any leftover from current session
    setReferralDiscount(0);
    setReferralCodeApplied("");
    setReferralCodeInput("");
    setReferralInviterName("");
    setReferralLabel("Referral Discount");
    setReferralStatusMessage("");
    setShowDraftsDrawer(false);
    Swal.fire({
      title: "Draft Restored",
      text: "Continue billing from where you left off.",
      icon: "success",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const deleteDraft = (id: string) => {
    const next = loadDrafts().filter((d) => d.id !== id);
    persistDrafts(next);
    setDrafts(next);
  };

  const clearReferralDiscount = () => {
    setReferralDiscount(0);
    setReferralCodeApplied("");
    setReferralCodeInput("");
    setReferralInviterName("");
    setReferralLabel("Referral Discount");
    setReferralStatusMessage("");
  };

  const clearCouponDiscount = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponLabel("");
    setWaiveMembershipForCoupon(false);
  };

  const fetchCustomers = async (
    searchText = "",
    signal?: AbortSignal,
    pinnedCustomer?: Customer | null,
  ) => {
    const q = searchText.trim();
    // Never auto-load the full customer list — only search results
    if (!q) {
      setCustomers(
        pinnedCustomer && pinnedCustomer.id !== WALK_IN_CUSTOMER.id
          ? [pinnedCustomer, WALK_IN_CUSTOMER]
          : [WALK_IN_CUSTOMER],
      );
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

      const pinned =
        pinnedCustomer && pinnedCustomer.id !== WALK_IN_CUSTOMER.id
          ? pinnedCustomer
          : null;
      const withoutPinned = pinned
        ? mapped.filter((c: any) => c.id !== pinned.id)
        : mapped;

      const walkInMatches = WALK_IN_CUSTOMER.name
        .toLowerCase()
        .includes(q.toLowerCase());

      const next = pinned ? [pinned, ...withoutPinned] : withoutPinned;
      setCustomers(
        walkInMatches
          ? [
              ...next.filter((c: any) => c.id !== WALK_IN_CUSTOMER.id),
              WALK_IN_CUSTOMER,
            ]
          : next.length
            ? next
            : pinned
              ? [pinned, WALK_IN_CUSTOMER]
              : [],
      );
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return;
      }
      setCustomers(
        pinnedCustomer && pinnedCustomer.id !== WALK_IN_CUSTOMER.id
          ? [pinnedCustomer, WALK_IN_CUSTOMER]
          : [],
      );
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Remote search only when user pauses typing for 300ms (skip empty query)
  useEffect(() => {
    const pinned =
      selectedCustomerCache.id !== WALK_IN_CUSTOMER.id
        ? selectedCustomerCache
        : null;

    if (!debouncedCustomerSearch) {
      // Keep selected customer pinned when search is cleared
      setCustomers(pinned ? [pinned, WALK_IN_CUSTOMER] : [WALK_IN_CUSTOMER]);
      setLoadingCustomers(false);
      return;
    }

    // After select the input shows "Name · Phone" — do not re-query that label
    // (API won't match and would wipe the selected member).
    if (pinned && formatCustomerLabel(pinned) === debouncedCustomerSearch) {
      setCustomers([pinned, WALK_IN_CUSTOMER]);
      setLoadingCustomers(false);
      return;
    }

    const controller = new AbortController();
    void fetchCustomers(debouncedCustomerSearch, controller.signal, pinned);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCustomerSearch, selectedCustomerCache]);

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

  // Active membership plans (Food usage-limit discounts)
  useEffect(() => {
    const controller = new AbortController();
    handleGetMemberships({ status: "Active" }, controller.signal)
      .then((res) => {
        const rows = Array.isArray(res?.memberships) ? res.memberships : [];
        setMembershipPlans(rows);
      })
      .catch(() => setMembershipPlans([]));
    return () => controller.abort();
  }, []);

  // Global minimum wallet balance (Wallet Instructions)
  useEffect(() => {
    const controller = new AbortController();
    handleGetWalletInstructions(controller.signal)
      .then((res) => {
        const min = Number(
          res?.minimumBalance ?? res?.instructions?.minimumBalance ?? 0,
        );
        setMinimumWalletBalance(Number.isFinite(min) && min > 0 ? min : 0);
      })
      .catch(() => setMinimumWalletBalance(0));
    return () => controller.abort();
  }, []);

  // Selected Customer details helper — prefer cache so membership survives search refetch
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === WALK_IN_CUSTOMER.id) return WALK_IN_CUSTOMER;
    if (selectedCustomerCache.id === selectedCustomerId) {
      return selectedCustomerCache;
    }
    return (
      customers.find((c) => c.id === selectedCustomerId) || WALK_IN_CUSTOMER
    );
  }, [customers, selectedCustomerId, selectedCustomerCache]);

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
      .slice(0, 8);
  }, [customers, deferredCustomerSearch]);

  const showCustomerDropdown =
    customerDropdownOpen && customerSearch.trim().length > 0;

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (
        customerSearchWrapRef.current &&
        !customerSearchWrapRef.current.contains(e.target as Node)
      ) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

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

  // Pricing calculations (membership discount → coupon/referral; no tax)
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
  }, [cart]);

  const membershipSummary = useMemo(() => {
    if (
      selectedCustomer.id === WALK_IN_CUSTOMER.id ||
      !selectedCustomer.membershipType ||
      selectedCustomer.membershipType === "none"
    ) {
      return {
        membershipDiscount: 0,
        cashbackTotal: 0,
        plan: undefined as MembershipPlanPayload | undefined,
      };
    }
    return summarizeMembershipForCart(
      membershipPlans,
      selectedCustomer.membershipType,
      selectedCustomer.membershipPlanId,
      cart.map((line) => ({
        price: line.item.price,
        qty: line.quantity,
        // Use Food so plan usageLimits.Food applies (also matches food item categories)
        category: "Food",
      })),
    );
  }, [
    membershipPlans,
    selectedCustomer.id,
    selectedCustomer.membershipType,
    selectedCustomer.membershipPlanId,
    cart,
  ]);

  const rawMembershipDiscount = Number(
    membershipSummary.membershipDiscount || 0,
  );
  const membershipDiscount = waiveMembershipForCoupon
    ? 0
    : rawMembershipDiscount;
  const membershipCashback = Number(membershipSummary.cashbackTotal || 0);
  const membershipPlan = membershipSummary.plan;
  const membershipBenefitTotal =
    Math.round((membershipDiscount + membershipCashback) * 10) / 10;

  // No tax on food bill — membership discount reduces payable; cashback is wallet credit
  const totalBeforeRound = useMemo(() => {
    return Math.max(0, subtotal - membershipDiscount);
  }, [subtotal, membershipDiscount]);

  const roundedBeforeReferral = useMemo(() => {
    return Math.round(totalBeforeRound);
  }, [totalBeforeRound]);

  const roundOff = useMemo(() => {
    const diff = roundedBeforeReferral - totalBeforeRound;
    return Math.round(diff * 100) / 100;
  }, [roundedBeforeReferral, totalBeforeRound]);

  const grandTotal = useMemo(() => {
    return Math.max(
      0,
      roundedBeforeReferral -
        Number(couponDiscount || 0) -
        Number(referralDiscount || 0),
    );
  }, [roundedBeforeReferral, couponDiscount, referralDiscount]);

  const setSplitAmount = (mode: SplitKey, value: number) => {
    setSplitPayments((prev) => ({
      ...prev,
      [mode]: Math.max(0, Number(value) || 0),
    }));
  };

  const splitTotalPaid = useMemo(
    () =>
      Number(splitPayments.cash || 0) +
      Number(splitPayments.upi || 0) +
      Number(splitPayments.card || 0) +
      Number(splitPayments.wallet || 0),
    [splitPayments],
  );

  const totalPaidDisplay = useMemo(() => {
    if (isMultiMode) return splitTotalPaid;
    if (paymentMethod === "Cash") {
      return Math.max(Number(amountReceived) || 0, 0);
    }
    return grandTotal;
  }, [isMultiMode, splitTotalPaid, paymentMethod, amountReceived, grandTotal]);

  const remainingForFull = useMemo(
    () =>
      Math.max(
        0,
        grandTotal - (isMultiMode ? splitTotalPaid : totalPaidDisplay),
      ),
    [grandTotal, isMultiMode, splitTotalPaid, totalPaidDisplay],
  );

  // Change computation (single cash or split overpay)
  const changeAmount = useMemo(() => {
    if (isMultiMode) {
      return Math.max(0, splitTotalPaid - grandTotal);
    }
    const receivedNum = parseFloat(amountReceived) || 0;
    return Math.max(0, receivedNum - grandTotal);
  }, [isMultiMode, splitTotalPaid, amountReceived, grandTotal]);

  // Keep single-mode cash amount in sync with payable when total changes
  useEffect(() => {
    if (isMultiMode) return;
    if (paymentMethod === "Cash") {
      setAmountReceived(String(grandTotal));
    }
  }, [grandTotal, paymentMethod, isMultiMode]);

  // When enabling split, seed remaining into cash if nothing allocated yet
  useEffect(() => {
    if (!isMultiMode) return;
    setSplitPayments((prev) => {
      const allocated = prev.cash + prev.upi + prev.card + prev.wallet;
      if (allocated > 0) return prev;
      return { cash: grandTotal, upi: 0, card: 0, wallet: 0 };
    });
  }, [isMultiMode, grandTotal]);

  const applyReferralDiscount = async (opts?: {
    customer?: Customer;
    referralCode?: string;
  }): Promise<ReferralApplyResult | null> => {
    const customer = opts?.customer ?? selectedCustomer;
    const isWalkIn = customer.id === WALK_IN_CUSTOMER.id;
    const manualCode = String(opts?.referralCode ?? referralCodeInput ?? "")
      .trim()
      .toUpperCase();
    // Same as invoice: amount after coupon, before referral
    const orderAmount = Math.max(
      0,
      roundedBeforeReferral - Number(couponDiscount || 0),
    );

    if ((isWalkIn || !customer.phone) && !manualCode) {
      clearReferralDiscount();
      return null;
    }

    if (orderAmount <= 0 || cart.length === 0) {
      if (!manualCode) clearReferralDiscount();
      setReferralStatusMessage(
        "Add food items to apply referral / coupon discount.",
      );
      return null;
    }

    setLoadingReferral(true);
    try {
      const response = await handleValidateReferralDiscount({
        ...(customer.id !== WALK_IN_CUSTOMER.id
          ? { customerId: customer.id }
          : {}),
        ...(customer.phone ? { customerPhone: customer.phone } : {}),
        ...(manualCode ? { referralCode: manualCode } : {}),
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
      const code = String(data.referralCode || manualCode || "")
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
      if (code) setReferralCodeInput(code);
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

  /** Apply coupon or referral from shared promo input in order summary */
  const handleApplyPromoCode = async () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      Swal.fire("Code required", "Enter a coupon or referral code.", "warning");
      return;
    }
    if (cart.length === 0) {
      Swal.fire(
        "Cart empty",
        "Add food items before applying a discount code.",
        "warning",
      );
      return;
    }

    setLoadingPromo(true);
    try {
      if (promoType === "coupon") {
        const activeMembership = Number(rawMembershipDiscount || 0);
        let useCouponInsteadOfMembership = waiveMembershipForCoupon;
        if (activeMembership > 0 && !waiveMembershipForCoupon) {
          const choice = await Swal.fire({
            icon: "question",
            title: "Choose one discount",
            html: `
              <p style="text-align:left;margin:0 0 12px;font-size:14px;color:#334155">
                Membership discount (<strong>₹${activeMembership.toFixed(2)}</strong>) is already applied.
                <br/><br/>
                Coupon discount and membership discount <strong>cannot be used together</strong>.
                Which one do you want to apply?
              </p>
            `,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: "Use Coupon Discount",
            denyButtonText: "Keep Membership Discount",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#7c3aed",
            denyButtonColor: "#4f46e5",
            reverseButtons: true,
          });

          if (choice.isDismissed) {
            return;
          }
          if (choice.isDenied) {
            clearCouponDiscount();
            await Swal.fire({
              icon: "info",
              title: "Membership discount kept",
              text: "Coupon was not applied. Membership discount remains on this bill.",
              timer: 2200,
              showConfirmButton: false,
            });
            return;
          }
          useCouponInsteadOfMembership = true;
        }

        const orderAmountForCoupon = useCouponInsteadOfMembership
          ? Math.max(0, Math.round(subtotal))
          : Math.max(0, roundedBeforeReferral);

        const response = await handleValidateCoupon({
          code,
          orderAmount: orderAmountForCoupon,
          customerPhone: selectedCustomer.phone || undefined,
        });
        const discount = Number(response?.discountAmount ?? 0);
        if (discount <= 0) {
          clearCouponDiscount();
          Swal.fire(
            "Invalid coupon",
            "Coupon did not apply a discount.",
            "error",
          );
          return;
        }
        setWaiveMembershipForCoupon(useCouponInsteadOfMembership);
        setCouponDiscount(discount);
        setCouponCode(code);
        setCouponLabel(
          String(
            response?.coupon?.title ?? response?.title ?? "Coupon Applied",
          ),
        );
        setPromoCodeInput(code);
        void applyReferralDiscount({
          referralCode: referralCodeInput || referralCodeApplied || "",
        });
        await Swal.fire({
          icon: "success",
          title: useCouponInsteadOfMembership
            ? "Coupon applied (membership removed)"
            : "Coupon applied",
          text: useCouponInsteadOfMembership
            ? `${code}: −₹${discount.toFixed(2)}. Membership discount was removed for this bill.`
            : `${code}: −₹${discount.toFixed(2)}`,
          timer: 2200,
          showConfirmButton: false,
        });
        return;
      }

      if (
        selectedCustomer.id === WALK_IN_CUSTOMER.id ||
        !selectedCustomer.phone
      ) {
        Swal.fire(
          "Customer required",
          "Select a customer before applying a referral code.",
          "warning",
        );
        return;
      }

      setReferralCodeInput(code);
      setPromoCodeInput(code);
      const result = await applyReferralDiscount({ referralCode: code });
      if (result && (result.discountAmount > 0 || result.code)) {
        await Swal.fire({
          icon: "success",
          title: "Referral applied",
          text:
            result.discountAmount > 0
              ? `${result.code || code}: −₹${result.discountAmount.toFixed(2)}`
              : result.message || "Referral code verified.",
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        console.error(
          "Referral not applied",
          "Could not apply this referral code.",
          "info",
        );
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      if (promoType === "coupon") {
        clearCouponDiscount();
        Swal.fire(
          "Invalid coupon",
          err?.response?.data?.message || "Coupon code is not valid.",
          "error",
        );
      } else {
        Swal.fire(
          "Referral failed",
          err?.response?.data?.message || "Referral code is not valid.",
          "error",
        );
      }
    } finally {
      setLoadingPromo(false);
    }
  };

  /** Same as invoice CheckoutModal — apply referral as soon as customer is picked */
  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setSelectedCustomerCache(cust);
    setCustomerDropdownOpen(false);
    if (cust.id === WALK_IN_CUSTOMER.id) {
      clearReferralDiscount();
      setWalletBalance(0);
      return;
    }
    setCustomerSearch(formatCustomerLabel(cust));
    // Keep selected customer in local list for display / re-select
    setCustomers((prev) => [
      cust,
      ...prev.filter((c) => c.id !== cust.id && c.id !== WALK_IN_CUSTOMER.id),
      WALK_IN_CUSTOMER,
    ]);
    setWalletBalance(Number(cust.points || 0) || 0);
    void applyReferralDiscount({ customer: cust });

    // Refresh wallet balance (needed for split / wallet payment)
    const customerId = String(cust.id || "").trim();
    if (!customerId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await handleGetWalletById(
          customerId,
          controller.signal,
        );
        const wallet = response?.wallet ?? response?.data ?? response ?? null;
        const total = Number(wallet?.totalBalance);
        if (Number.isFinite(total)) {
          setWalletBalance(Math.max(0, total));
          return;
        }
        const general = Number(
          wallet?.generalBalance ??
            wallet?.walletAmount ??
            wallet?.balance ??
            0,
        );
        const cashback = Number(wallet?.cashbackBalance ?? 0);
        const affiliate = Number(
          wallet?.affiliateBalance ?? wallet?.withdrawableBalance ?? 0,
        );
        if (
          wallet?.generalBalance !== undefined ||
          wallet?.cashbackBalance !== undefined ||
          wallet?.affiliateBalance !== undefined
        ) {
          setWalletBalance(Math.max(0, general + cashback + affiliate));
          return;
        }
        const amount = Number(
          wallet?.walletAmount ??
            wallet?.balance ??
            wallet?.currentBalance ??
            wallet?.availableBalance ??
            cust.points ??
            0,
        );
        if (Number.isFinite(amount)) setWalletBalance(Math.max(0, amount));
      } catch {
        setWalletBalance(Number(cust.points || 0) || 0);
      }
    })();
  };

  const handleClearSelectedCustomer = () => {
    handleSelectCustomer(WALK_IN_CUSTOMER);
    setCustomerSearch("");
    clearReferralDiscount();
    clearCouponDiscount();
    setPromoCodeInput("");
    setCustomerDropdownOpen(false);
  };

  // Re-apply when cart / discount changes for the selected customer
  const referralOrderKey = useMemo(
    () =>
      `${selectedCustomer.id}|${selectedCustomer.phone}|${cart
        .map((c) => `${c.item.id}:${c.quantity}`)
        .join(",")}`,
    [selectedCustomer.id, selectedCustomer.phone, cart],
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

    // Validate wallet usage before PIN verify
    const walletUsed = isMultiMode
      ? Number(splitPayments.wallet || 0)
      : paymentMethod === "Wallet"
        ? grandTotal
        : 0;
    if (walletUsed > walletBalance + 0.001) {
      Swal.fire(
        "Wallet amount exceeded",
        `Wallet payment (₹${walletUsed.toFixed(2)}) cannot exceed balance (₹${walletBalance.toFixed(2)}).`,
        "warning",
      );
      return;
    }
    if (walletUsed > 0) {
      const maxPayable = Math.max(
        0,
        walletBalance - Math.max(0, minimumWalletBalance),
      );
      if (walletUsed > maxPayable + 0.01) {
        Swal.fire(
          "Minimum wallet balance required",
          `Wallet payment would leave balance below the minimum of ₹${minimumWalletBalance.toFixed(2)}. ` +
            `Available for payment: ₹${maxPayable.toFixed(2)} ` +
            `(balance ₹${walletBalance.toFixed(2)} − minimum ₹${minimumWalletBalance.toFixed(2)}).`,
          "warning",
        );
        return;
      }
    }
    if (
      (paymentMethod === "Wallet" || (isMultiMode && walletUsed > 0)) &&
      selectedCustomer.id === WALK_IN_CUSTOMER.id
    ) {
      Swal.fire(
        "Customer required",
        "Select a customer before using wallet payment.",
        "warning",
      );
      return;
    }
    if (isMultiMode && remainingForFull > 0.001) {
      Swal.fire(
        "Payment incomplete",
        `Allocate the full amount. Remaining: ₹${remainingForFull.toFixed(2)}`,
        "warning",
      );
      return;
    }

    // Staff PIN required before bill generation (same as POS / Invoice checkout).
    setShowStaffVerify(true);
  };

  const completeGenerateBill = async (
    verifiedStaff: VerifiedStaff,
    verifiedAt: string,
  ) => {
    const nowStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const today = new Date().toISOString().split("T")[0];

    const previewPaid = isMultiMode
      ? splitTotalPaid
      : paymentMethod === "Cash"
        ? Math.max(Number(amountReceived) || grandTotal, grandTotal)
        : grandTotal;
    const paymentLabel = isMultiMode
      ? `Split (C:${splitPayments.cash}/U:${splitPayments.upi}/Card:${splitPayments.card}/W:${splitPayments.wallet})`
      : paymentMethod;

    const confirm = await Swal.fire({
      title: "Confirm Bill Generation",
      html: `
        <div class="text-left bg-gray-50 p-4 rounded-xl text-sm leading-relaxed border border-gray-100">
          <p class="font-bold text-gray-800 text-center mb-3">WOO WOO ART HOUSE</p>
          <div class="flex justify-between text-xs text-gray-500 mb-2">
            <span>Food Bill → Invoice</span>
            <span>Date: Today, ${nowStr}</span>
          </div>
          <div class="mb-2 rounded-lg bg-indigo-50 px-2 py-1.5 text-xs text-indigo-800">
            Invoice By: <b>${String(verifiedStaff.staffName || verifiedStaff.name || "").replace(/</g, "&lt;")}</b>
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
            ${
              membershipDiscount > 0 || membershipCashback > 0
                ? `<div class="flex justify-between"><span class="text-gray-500">Membership benefit:</span><span class="text-emerald-700 font-semibold">${membershipBenefitTotal.toFixed(1)}</span></div>
            <div class="flex justify-between pl-2"><span class="text-gray-500">discount:</span><span class="text-green-600">₹${membershipDiscount.toFixed(2)}</span></div>
            <div class="flex justify-between pl-2"><span class="text-gray-500">cashback:</span><span class="text-amber-600">₹${membershipCashback.toFixed(2)}</span></div>`
                : ""
            }
            ${
              couponDiscount > 0
                ? `<div class="flex justify-between"><span class="text-gray-500">${couponLabel || "Coupon"}${couponCode ? ` (${couponCode})` : ""}:</span><span class="text-green-600">-₹${couponDiscount.toFixed(2)}</span></div>`
                : ""
            }
            ${
              referralDiscount > 0
                ? `<div class="flex justify-between"><span class="text-gray-500">${referralLabel}${referralCodeApplied ? ` (${referralCodeApplied})` : ""}:</span><span class="text-green-600">-₹${referralDiscount.toFixed(2)}</span></div>`
                : ""
            }
            <div class="flex justify-between font-bold text-base text-gray-900 pt-1 mt-1 border-t border-gray-200">
              <span>Grand Total:</span>
              <span class="text-blue-600">₹${grandTotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-xs mt-2 text-gray-600 pt-1 border-t border-gray-100">
              <span>Paid via ${paymentLabel}:</span>
              <span>₹${previewPaid.toFixed(2)}</span>
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
      const referral = await applyReferralDiscount({
        referralCode: referralCodeInput || referralCodeApplied || "",
      });
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
      const appliedCouponDiscount = Number(couponDiscount || 0);
      const appliedMembershipDiscount = waiveMembershipForCoupon
        ? 0
        : Number(membershipDiscount || 0);
      // Server recomputes grandTotal from line discounts + coupon + referral.
      // Put membership (incl. round-off to match UI) on each item.discount.
      const membershipDiscountForInvoice = waiveMembershipForCoupon
        ? 0
        : Math.max(
            0,
            Math.round((subtotal - roundedBeforeReferral) * 100) / 100,
          );
      const payableTotal = Math.max(
        0,
        roundedBeforeReferral - appliedCouponDiscount - appliedReferralDiscount,
      );

      const invoiceItems = (() => {
        if (waiveMembershipForCoupon) {
          return cart.map((line) => ({
            productName: line.item.name,
            qty: line.quantity,
            unitPrice: line.item.price,
            discount: 0,
            category: "Food" as const,
          }));
        }
        const lines = cart.map((line) => {
          const fromPlan = membershipBenefitsForLine(
            line.item.price,
            line.quantity,
            "Food",
            membershipPlan,
          );
          return {
            productName: line.item.name,
            qty: line.quantity,
            unitPrice: line.item.price,
            discount: Math.max(0, Number(fromPlan.discount || 0)),
            category: "Food" as const,
            lineGross: line.item.price * line.quantity,
          };
        });
        const rawSum = lines.reduce((s, l) => s + l.discount, 0);
        const target = membershipDiscountForInvoice;
        const delta = Math.round((target - rawSum) * 100) / 100;
        if (lines.length > 0 && Math.abs(delta) >= 0.01) {
          // Adjust last line so invoice grand total matches Food Bill UI (incl. round off)
          const last = lines[lines.length - 1];
          last.discount = Math.max(
            0,
            Math.round((last.discount + delta) * 100) / 100,
          );
          // Cap so line discount never exceeds line gross
          last.discount = Math.min(last.discount, last.lineGross);
        }
        return lines.map(({ lineGross: _g, ...item }) => item);
      })();

      const mode = isMultiMode ? "MULTI" : toInvoicePaymentMode(paymentMethod);

      let breakdown = {
        cash: 0,
        upi: 0,
        card: 0,
        wallet: 0,
        paidAmount: 0,
        dueAmount: 0,
        changeAmount: 0,
      };

      if (isMultiMode) {
        const paidFinal = Math.round(splitTotalPaid * 100) / 100;
        if (paidFinal + 0.001 < payableTotal) {
          Swal.fire(
            "Payment incomplete",
            `Allocate the full amount. Remaining: ₹${(payableTotal - paidFinal).toFixed(2)}`,
            "warning",
          );
          return;
        }
        breakdown = {
          cash: Number(splitPayments.cash || 0),
          upi: Number(splitPayments.upi || 0),
          card: Number(splitPayments.card || 0),
          wallet: Number(splitPayments.wallet || 0),
          paidAmount: paidFinal,
          dueAmount: Math.max(0, payableTotal - paidFinal),
          changeAmount: Math.max(0, paidFinal - payableTotal),
        };
      } else {
        const paidFinal =
          paymentMethod === "Cash"
            ? Math.max(Number(amountReceived) || payableTotal, payableTotal)
            : payableTotal;
        breakdown = {
          cash: mode === "CASH" ? paidFinal : 0,
          upi: mode === "UPI" ? paidFinal : 0,
          card: mode === "CARD" ? paidFinal : 0,
          wallet: mode === "WALLET" ? paidFinal : 0,
          paidAmount: paidFinal,
          dueAmount: 0,
          changeAmount: Math.max(0, paidFinal - payableTotal),
        };
      }

      const notes = [
        billNote,
        `${orderType} · ${tableNumber}`,
        "Source: Food Bill",
      ]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
        .join(" | ");

      const response = await handleCreateInvoice({
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerId:
          selectedCustomer.id && selectedCustomer.id !== WALK_IN_CUSTOMER.id
            ? selectedCustomer.id
            : undefined,
        invoiceDate: today,
        dueDate: today,
        salesPersonName:
          verifiedStaff.staffName ||
          verifiedStaff.name ||
          staff?.m_staff_name ||
          "Food Bill",
        invoiceBy: {
          staffId: String(verifiedStaff.staffId || verifiedStaff._id),
          staffName: verifiedStaff.staffName || verifiedStaff.name,
          employeeId:
            verifiedStaff.employeeId || verifiedStaff.m_staff_id || "",
          email: verifiedStaff.email || "",
        },
        verifiedAt: verifiedAt || new Date().toISOString(),
        notes,
        items: invoiceItems,
        subTotal: subtotal,
        discountTotal:
          Number(membershipDiscountForInvoice || 0) +
          Number(appliedCouponDiscount || 0) +
          Number(appliedReferralDiscount || 0),
        grandTotal: payableTotal,
        coupon:
          couponCode && appliedCouponDiscount > 0
            ? {
                code: couponCode,
                discountAmount: appliedCouponDiscount,
              }
            : null,
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
        paymentBreakdown: breakdown,
        cashbackTotal: membershipCashback,
        membershipDiscount: appliedMembershipDiscount,
        membershipType: selectedCustomer.membershipType,
        activityType: "Food Bill",
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

      // Membership cashback → wallet (server also credits; wallet API is idempotent)
      if (
        membershipCashback > 0 &&
        selectedCustomer.id !== WALK_IN_CUSTOMER.id &&
        selectedCustomer.phone
      ) {
        try {
          await creditWalletCashback({
            customerId: selectedCustomer.id,
            customerPhone: selectedCustomer.phone,
            customerName: selectedCustomer.name,
            amount: membershipCashback,
            note: `Membership cashback for Food Bill #${invoiceCode}`,
            referenceId: String(invoiceCode),
            createdBy: {
              m_staff_id: staff?.m_staff_id ?? null,
              m_staff_name: staff?.m_staff_name ?? null,
              m_staff_email: staff?.m_staff_email ?? null,
            },
          });
        } catch (cashbackErr) {
          console.error(
            "Food Bill cashback wallet credit failed:",
            cashbackErr,
          );
        }
      }

      const newBill: RecentBill = {
        id: String(invoiceCode),
        customerName: selectedCustomer.name,
        grandTotal: payableTotal,
        paymentMethod: isMultiMode ? "Split" : paymentMethod,
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
              appliedMembershipDiscount > 0 || membershipCashback > 0
                ? `<p class="text-emerald-700">Membership benefit: ${membershipBenefitTotal.toFixed(1)} (discount ₹${appliedMembershipDiscount.toFixed(2)} · cashback ₹${membershipCashback.toFixed(2)})</p>`
                : ""
            }
            ${
              appliedCouponDiscount > 0
                ? `<p class="text-indigo-700">${couponLabel || "Coupon"}${couponCode ? ` (${couponCode})` : ""}: −₹${appliedCouponDiscount.toFixed(2)}</p>`
                : ""
            }
            ${
              appliedReferralDiscount > 0
                ? `<p class="text-green-700">${appliedReferralLabel}${appliedReferralCode ? ` (${appliedReferralCode})` : ""}: −₹${appliedReferralDiscount.toFixed(2)}</p>`
                : ""
            }
            <p>Total: <b>₹${payableTotal.toFixed(2)}</b></p>
            ${
              isMultiMode
                ? `<p class="text-gray-600">Split: Cash ₹${breakdown.cash} · UPI ₹${breakdown.upi} · Card ₹${breakdown.card} · Wallet ₹${breakdown.wallet}</p>`
                : ""
            }
          </div>
        `,
        confirmButtonColor: "#3B82F6",
      });

      setCart([]);
      setAmountReceived("0");
      setBillNote("");
      setIsMultiMode(false);
      setSplitPayments({ cash: 0, upi: 0, card: 0, wallet: 0 });
      setPaymentMethod("Cash");
      clearReferralDiscount();
      clearCouponDiscount();
      setPromoCodeInput("");
      setPromoType("coupon");
      setCustomerSearch("");
      setSelectedCustomerId(WALK_IN_CUSTOMER.id);
      setSelectedCustomerCache(WALK_IN_CUSTOMER);
      setWalletBalance(0);
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
          {/* A. CUSTOMER SEARCH DROPDOWN */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            <div ref={customerSearchWrapRef} className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600 focus-within:border-blue-400 focus-within:bg-white transition-colors duration-150">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  role="combobox"
                  aria-expanded={showCustomerDropdown}
                  aria-controls="foodbill-customer-listbox"
                  aria-autocomplete="list"
                  placeholder="Search customer by name or mobile"
                  value={customerSearch}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCustomerSearch(next);
                    setCustomerDropdownOpen(true);
                    if (selectedCustomerId !== WALK_IN_CUSTOMER.id) {
                      setSelectedCustomerId(WALK_IN_CUSTOMER.id);
                      setSelectedCustomerCache(WALK_IN_CUSTOMER);
                      clearReferralDiscount();
                      setWalletBalance(0);
                    }
                  }}
                  onFocus={() => {
                    if (customerSearch.trim()) setCustomerDropdownOpen(true);
                  }}
                  className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
                {loadingCustomers ? (
                  <span className="shrink-0 text-[10px] font-medium text-blue-500">
                    Searching…
                  </span>
                ) : null}
                {selectedCustomerId !== WALK_IN_CUSTOMER.id ? (
                  <button
                    type="button"
                    onClick={handleClearSelectedCustomer}
                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Change
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowCreateCustomerModal(true)}
                  title="Add customer"
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-800"
                >
                  <UserPlus size={14} />
                </button>
              </div>

              {showCustomerDropdown ? (
                <ul
                  id="foodbill-customer-listbox"
                  role="listbox"
                  aria-label="Customers"
                  className="absolute left-0 right-0 z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                >
                  {filteredCustomers.length === 0 ? (
                    <li className="px-3 py-3 text-center text-xs text-gray-500">
                      {loadingCustomers
                        ? "Looking up customers…"
                        : "No customers found"}
                    </li>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const membershipLabel =
                        cust.tier && cust.tier !== "New Customer"
                          ? cust.tier
                          : cust.membershipType &&
                              cust.membershipType !== "none"
                            ? mapMembershipTier(cust.membershipType)
                            : "No membership";
                      return (
                        <li key={cust.id} role="option">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectCustomer(cust)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {cust.name}
                              </p>
                              <p className="truncate text-[11px] text-gray-500">
                                {cust.phone || "No phone"}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                                membershipLabel === "Gold"
                                  ? "border border-amber-100 bg-amber-50 text-amber-700"
                                  : membershipLabel === "Silver"
                                    ? "border border-slate-200 bg-slate-100 text-slate-600"
                                    : membershipLabel === "No membership"
                                      ? "bg-gray-100 text-gray-500"
                                      : "border border-indigo-100 bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {membershipLabel}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              ) : null}
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

              {/* Bill values breakdown */}
              <div className="border-t border-gray-100 pt-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-850">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>

                {(membershipDiscount > 0 ||
                  membershipCashback > 0 ||
                  (selectedCustomer.id !== WALK_IN_CUSTOMER.id &&
                    selectedCustomer.membershipType &&
                    selectedCustomer.membershipType !== "none")) && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-2.5 py-2 space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wide text-emerald-700">
                        Membership benefit:{" "}
                        {membershipBenefitTotal > 0
                          ? membershipBenefitTotal.toFixed(1)
                          : "0"}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-600 truncate max-w-[40%]">
                        {membershipPlan?.displayName ||
                          selectedCustomer.tier ||
                          "Member"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-800">
                      <span>Membership discount:</span>
                      <span className="font-semibold text-green-600">
                        {waiveMembershipForCoupon
                          ? "₹0.00 (removed for coupon)"
                          : `₹${membershipDiscount.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-800">
                      <span>cashback:</span>
                      <span className="font-semibold text-amber-600">
                        ₹{membershipCashback.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Coupon / Referral promo — choose type, verify & apply */}
                <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40 px-2.5 py-2.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Tag size={12} className="text-violet-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-violet-600">
                      Coupon / Referral
                    </span>
                  </div>
                  <div className="flex gap-1 rounded-lg bg-white/80 p-0.5 border border-violet-100">
                    <button
                      type="button"
                      onClick={() => setPromoType("coupon")}
                      className={`flex-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                        promoType === "coupon"
                          ? "bg-violet-600 text-white"
                          : "text-violet-500 hover:bg-violet-50"
                      }`}
                    >
                      Coupon
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromoType("referral")}
                      className={`flex-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                        promoType === "referral"
                          ? "bg-violet-600 text-white"
                          : "text-violet-500 hover:bg-violet-50"
                      }`}
                    >
                      Referral
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      value={promoCodeInput}
                      onChange={(e) =>
                        setPromoCodeInput(e.target.value.toUpperCase())
                      }
                      placeholder={
                        promoType === "coupon"
                          ? "Enter coupon code"
                          : "Enter referral code"
                      }
                      className="min-w-0 flex-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-semibold uppercase text-gray-800 outline-none focus:border-violet-500"
                    />
                    <button
                      type="button"
                      disabled={loadingPromo || loadingReferral}
                      onClick={() => void handleApplyPromoCode()}
                      className="shrink-0 rounded-lg bg-violet-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-violet-600 disabled:opacity-60"
                    >
                      {loadingPromo || loadingReferral ? "…" : "Apply"}
                    </button>
                  </div>
                  {couponDiscount > 0 ? (
                    <div className="flex items-center justify-between gap-2 text-[10px] text-indigo-700">
                      <span className="truncate font-semibold">
                        {couponLabel || "Coupon"}
                        {couponCode ? ` (${couponCode})` : ""}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-green-600">
                          −₹{couponDiscount.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={clearCouponDiscount}
                          className="text-gray-400 hover:text-rose-500"
                          title="Remove coupon"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {referralDiscount > 0 ? (
                    <div className="flex items-center justify-between gap-2 text-[10px] text-violet-700">
                      <span className="truncate font-semibold">
                        {referralLabel}
                        {referralCodeApplied ? ` (${referralCodeApplied})` : ""}
                        {referralInviterName ? ` · ${referralInviterName}` : ""}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-green-600">
                          −₹{Number(referralDiscount || 0).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={clearReferralDiscount}
                          className="text-gray-400 hover:text-rose-500"
                          title="Remove referral"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : referralCodeApplied ? (
                    <div className="flex items-center justify-between gap-2 text-[10px] text-violet-700">
                      <span className="truncate font-semibold">
                        {referralStatusMessage ||
                          referralLabel ||
                          "Referral applied (no buyer discount)"}
                        {referralCodeApplied ? ` (${referralCodeApplied})` : ""}
                        {referralInviterName ? ` · ${referralInviterName}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={clearReferralDiscount}
                        className="shrink-0 text-gray-400 hover:text-rose-500"
                        title="Remove referral"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : selectedCustomer.id !== WALK_IN_CUSTOMER.id ? (
                    <p className="text-[10px] text-violet-500">
                      {referralStatusMessage ||
                        (loadingReferral
                          ? "Checking referral…"
                          : "Auto-checks referral on customer select. Or enter a code above.")}
                    </p>
                  ) : (
                    <p className="text-[10px] text-violet-500">
                      Choose Coupon or Referral, enter code, then Apply.
                    </p>
                  )}
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

              {/* Payment Methods */}
              <div className="mt-4 border-t border-gray-100 pt-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-gray-600">
                    Payment Method
                  </h3>
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1">
                    <input
                      type="checkbox"
                      checked={isMultiMode}
                      onChange={(e) => setIsMultiMode(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Split
                    </span>
                  </label>
                </div>

                {!isMultiMode ? (
                  <>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: "Cash", label: "Cash", icon: DollarSignIcon },
                        { id: "UPI", label: "UPI", icon: UpiIcon },
                        { id: "Card", label: "Card", icon: CreditCard },
                        { id: "Wallet", label: "Wallet", icon: Wallet },
                      ].map((method) => {
                        const IconComp = method.icon;
                        const isActive = paymentMethod === method.id;

                        return (
                          <button
                            key={method.id}
                            type="button"
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

                    {paymentMethod === "Wallet" ? (
                      <p className="mt-2 text-[10px] font-medium text-amber-700">
                        Wallet balance: ₹{walletBalance.toFixed(2)}
                      </p>
                    ) : null}

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
                                onChange={(e) =>
                                  setAmountReceived(e.target.value)
                                }
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
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { key: "cash", label: "Cash" },
                          { key: "upi", label: "UPI" },
                          { key: "card", label: "Card" },
                          { key: "wallet", label: "Wallet" },
                        ] as const
                      ).map(({ key, label }) => (
                        <div key={key}>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {label}
                            {key === "wallet"
                              ? ` (bal ₹${walletBalance.toFixed(0)})`
                              : ""}
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-xs text-gray-500">
                              ₹
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={splitPayments[key]}
                              onChange={(e) =>
                                setSplitAmount(key, Number(e.target.value) || 0)
                              }
                              className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-5 pr-2 text-xs font-bold text-gray-800 focus:border-blue-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          ["Cash", "cash"],
                          ["UPI", "upi"],
                          ["Card", "card"],
                          ["Wallet", "wallet"],
                        ] as const
                      ).map(([label, key]) => (
                        <button
                          key={key}
                          type="button"
                          disabled={remainingForFull <= 0}
                          onClick={() => {
                            const add =
                              key === "wallet"
                                ? Math.min(
                                    walletBalance - splitPayments.wallet,
                                    remainingForFull,
                                  )
                                : remainingForFull;
                            setSplitAmount(
                              key,
                              splitPayments[key] + Math.max(0, add),
                            );
                          }}
                          className="rounded-md bg-gray-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                        >
                          + Rest → {label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-[11px] font-semibold">
                      <div className="flex justify-between text-gray-500">
                        <span>Payable</span>
                        <span className="text-gray-800">
                          ₹{grandTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Allocated</span>
                        <span className="text-blue-600">
                          ₹{splitTotalPaid.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-1">
                        <span className="text-gray-600">Remaining</span>
                        <span
                          className={
                            remainingForFull > 0
                              ? "text-amber-600"
                              : "text-green-600"
                          }
                        >
                          ₹{remainingForFull.toFixed(2)}
                        </span>
                      </div>
                      {changeAmount > 0 ? (
                        <div className="flex justify-between text-green-600">
                          <span>Change</span>
                          <span>₹{changeAmount.toFixed(2)}</span>
                        </div>
                      ) : null}
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
                  type="button"
                  onClick={() => {
                    if (cart.length === 0) return;

                    const now = new Date().toISOString();
                    const draft: FoodBillDraft = {
                      id: `draft-${Date.now()}`,
                      createdAt: now,
                      updatedAt: now,
                      label: makeDraftLabel(
                        cart,
                        selectedCustomerCache.name,
                        grandTotal,
                      ),
                      cart,
                      customer: selectedCustomerCache,
                      tableNumber,
                      orderType,
                      paymentMethod,
                      amountReceived,
                      isMultiMode,
                      splitPayments,
                      billNote,
                      promoCodeInput,
                      couponCode,
                      couponDiscount,
                    };

                    const next = [draft, ...loadDrafts()].slice(0, 30); // keep last 30
                    persistDrafts(next);
                    setDrafts(next);

                    // optional: clear current bill after saving
                    setCart([]);
                    // reset customer / notes if you want a fresh counter

                    Swal.fire({
                      title: "Saved as Draft",
                      text: "Open Drafts to continue this order later.",
                      icon: "success",
                      timer: 1400,
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

        {/* Recent Bills / Drafts navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDrafts(loadDrafts());
              setShowDraftsDrawer(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            <Save size={14} className="text-gray-500" />
            Drafts
            {drafts.length > 0 ? (
              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                {drafts.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
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

      <StaffVerifyModal
        open={showStaffVerify}
        onClose={() => setShowStaffVerify(false)}
        onVerified={({ staff: verified, verifiedAt }) => {
          setShowStaffVerify(false);
          void completeGenerateBill(verified, verifiedAt);
        }}
      />

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
          </div>
        </div>
      )}

      {/* SAVED DRAFTS SIDEBAR DRAWER */}
      {showDraftsDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-sm bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Save size={16} />
                Saved Drafts
              </h3>
              <button
                type="button"
                onClick={() => setShowDraftsDrawer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {drafts.length === 0 ? (
              <p className="text-xs text-gray-500">No drafts yet.</p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[80vh]">
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <div className="text-xs font-bold text-gray-800">
                      {d.label}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {new Date(d.updatedAt).toLocaleString()}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => restoreDraft(d)}
                        className="flex-1 rounded-lg bg-blue-600 py-1.5 text-[11px] font-bold text-white"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDraft(d.id)}
                        className="rounded-lg border px-3 py-1.5 text-[11px] font-bold text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
