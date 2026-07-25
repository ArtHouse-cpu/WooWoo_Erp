import React, { useState, useMemo } from "react";
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
  QrCode,
  Save,
  FileText,
  Pause,
  ChevronRight,
  UserPlus,
  UtensilsCrossed,
  X,
  History,
  CheckCircle,
  Percent,
} from "lucide-react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

// Types
interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
}

interface FoodItem {
  id: number;
  name: string;
  price: number;
  isVeg: boolean;
  category: string;
  image: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  tier: "Silver" | "Gold" | "New Customer";
  points?: number;
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

// Categories list
const CATEGORIES: Category[] = [
  { id: "all", name: "All Items", icon: Grid },
  { id: "drinks", name: "Drinks", icon: Coffee },
  { id: "healthy", name: "Healthy", icon: Leaf },
  { id: "starters", name: "Starters", icon: Flame },
  { id: "main", name: "Main Course", icon: Utensils },
  { id: "combos", name: "Combos", icon: Layers },
  { id: "dessert", name: "Desserts", icon: Cookie },
  { id: "extras", name: "Extras", icon: MoreHorizontal },
];

// Initial mock food items
const FOOD_ITEMS: FoodItem[] = [
  {
    id: 1,
    name: "Masala Tea",
    price: 40,
    isVeg: true,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 2,
    name: "Fresh Lime Soda",
    price: 60,
    isVeg: true,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 3,
    name: "Green Detox Juice",
    price: 120,
    isVeg: true,
    category: "healthy",
    image: "https://images.unsplash.com/photo-1610970881699-44a55b4cfd87?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 4,
    name: "Greek Yogurt Bowl",
    price: 150,
    isVeg: true,
    category: "healthy",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 5,
    name: "Quinoa Salad",
    price: 180,
    isVeg: true,
    category: "healthy",
    image: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 6,
    name: "Grilled Paneer Wrap",
    price: 160,
    isVeg: true,
    category: "starters",
    image: "https://images.unsplash.com/photo-1626700051175-6518c4793f06?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 7,
    name: "Veggie Sandwich",
    price: 120,
    isVeg: true,
    category: "starters",
    image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 8,
    name: "Chocolate Brownie",
    price: 100,
    isVeg: true,
    category: "dessert",
    image: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 9,
    name: "Paneer Tikka",
    price: 220,
    isVeg: true,
    category: "starters",
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 10,
    name: "Double Cheese Margherita Pizza",
    price: 280,
    isVeg: true,
    category: "main",
    image: "https://images.unsplash.com/photo-1601924582970-d47849767f22?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 11,
    name: "Family Combo Meal",
    price: 499,
    isVeg: true,
    category: "combos",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=300",
  },
  {
    id: 12,
    name: "Extra Paneer Cubes",
    price: 45,
    isVeg: true,
    category: "extras",
    image: "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?auto=format&fit=crop&q=80&w=300",
  },
];

// Initial mock customers
const INITIAL_CUSTOMERS: Customer[] = [
  { id: "c1", name: "Rahul Anand", phone: "98765 43210", tier: "Silver", points: 120 },
  { id: "c2", name: "Priya Singh", phone: "87654 32109", tier: "Gold", points: 340 },
  { id: "c3", name: "Walk-in Customer", phone: "", tier: "New Customer", points: 0 },
];

export default function FoodBill() {
  const navigate = useNavigate();

  // State Variables
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("c1"); // Default: Rahul Anand
  const [customerSearch, setCustomerSearch] = useState<string>("");
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [itemSearch, setItemSearch] = useState<string>("");
  const [viewAllItems, setViewAllItems] = useState<boolean>(false);

  // Cart/Order summary loaded with mock data from reference image
  const [cart, setCart] = useState<OrderItem[]>([
    { item: FOOD_ITEMS[0], quantity: 1 }, // Masala Chai
    { item: FOOD_ITEMS[1], quantity: 2 }, // Fresh Lime Soda
    { item: FOOD_ITEMS[3], quantity: 1 }, // Greek Yogurt Bowl
    { item: FOOD_ITEMS[5], quantity: 1 }, // Grilled Paneer Wrap
  ]);

  const [tableNumber, setTableNumber] = useState<string>("Table 5");
  const [orderType, setOrderType] = useState<string>("Takeaway");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [manualDiscount, setManualDiscount] = useState<number>(20); // Default: ₹20.00 discount from image
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [amountReceived, setAmountReceived] = useState<string>("500");
  const [billedBy, setBilledBy] = useState<string>("Aman (TM-07)");
  const [billNote, setBillNote] = useState<string>("");

  // Modals state
  const [showNewCustModal, setShowNewCustModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>("");
  const [newCustPhone, setNewCustPhone] = useState<string>("");
  const [newCustTier, setNewCustTier] = useState<"Silver" | "Gold" | "New Customer">("New Customer");
  
  const [showRecentBillsDrawer, setShowRecentBillsDrawer] = useState<boolean>(false);
  const [recentBills, setRecentBills] = useState<RecentBill[]>([
    { id: "BILL-10023", customerName: "Rahul Anand", grandTotal: 473.00, paymentMethod: "Cash", date: "Today, 11:15 AM", itemsCount: 5 },
    { id: "BILL-10022", customerName: "Priya Singh", grandTotal: 280.00, paymentMethod: "UPI", date: "Today, 10:42 AM", itemsCount: 2 },
    { id: "BILL-10021", customerName: "Walk-in Customer", grandTotal: 120.00, paymentMethod: "Card", date: "Yesterday, 08:30 PM", itemsCount: 1 },
  ]);

  // Selected Customer details helper
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[2]; // fallback to walk-in
  }, [customers, selectedCustomerId]);

  // Filtering Customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter(
      c => c.name.toLowerCase().includes(query) || c.phone.includes(query)
    );
  }, [customers, customerSearch]);

  // Filtering Menu Items
  const filteredItems = useMemo(() => {
    let list = FOOD_ITEMS;
    if (selectedCategory !== "all") {
      list = list.filter(item => item.category === selectedCategory);
    }
    if (itemSearch.trim()) {
      const query = itemSearch.toLowerCase();
      list = list.filter(item => item.name.toLowerCase().includes(query));
    }
    return list;
  }, [selectedCategory, itemSearch]);

  // Visible Items (collapsible)
  const visibleItems = useMemo(() => {
    if (viewAllItems) return filteredItems;
    return filteredItems.slice(0, 8); // Limit to 8 items default
  }, [filteredItems, viewAllItems]);

  // Cart operations
  const addToCart = (item: FoodItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: number, change: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.item.id === itemId) {
          const newQty = i.quantity + change;
          return { ...i, quantity: newQty > 0 ? newQty : 1 };
        }
        return i;
      }).filter(i => i.quantity > 0);
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  // Pricing calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
  }, [cart]);

  const tax = useMemo(() => {
    const taxableAmount = Math.max(0, subtotal - manualDiscount);
    return Math.round((taxableAmount * 0.05) * 100) / 100; // 5% tax
  }, [subtotal, manualDiscount]);

  const totalBeforeRound = useMemo(() => {
    return Math.max(0, subtotal - manualDiscount) + tax;
  }, [subtotal, manualDiscount, tax]);

  const grandTotal = useMemo(() => {
    return Math.round(totalBeforeRound);
  }, [totalBeforeRound]);

  const roundOff = useMemo(() => {
    const diff = grandTotal - totalBeforeRound;
    return Math.round(diff * 100) / 100;
  }, [grandTotal, totalBeforeRound]);

  // Loyalty calculations
  const loyaltyPointsEarned = useMemo(() => {
    if (selectedCustomer.tier === "New Customer") return 0;
    // Earn 1 point per 100 rupees
    return Math.max(1, Math.floor(grandTotal / 100));
  }, [selectedCustomer, grandTotal]);

  // Change computation
  const changeAmount = useMemo(() => {
    const receivedNum = parseFloat(amountReceived) || 0;
    return Math.max(0, receivedNum - grandTotal);
  }, [amountReceived, grandTotal]);

  // Handle Generate Bill
  const handleGenerateBill = () => {
    if (cart.length === 0) {
      Swal.fire({
        title: "Cart Empty",
        text: "Please add at least one item to generate a bill.",
        icon: "warning",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    const billId = `BILL-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    Swal.fire({
      title: "Confirm Bill Generation",
      html: `
        <div class="text-left bg-gray-50 p-4 rounded-xl text-sm leading-relaxed border border-gray-100">
          <p class="font-bold text-gray-800 text-center mb-3">WOO WOO ART HOUSE</p>
          <div class="flex justify-between text-xs text-gray-500 mb-2">
            <span>Bill ID: ${billId}</span>
            <span>Date: Today, ${nowStr}</span>
          </div>
          <hr class="border-dashed border-gray-300 my-2" />
          <div class="space-y-1 my-2">
            ${cart.map(item => `
              <div class="flex justify-between text-xs">
                <span class="text-gray-700">${item.item.name} x${item.quantity}</span>
                <span class="font-medium text-gray-900">₹${item.item.price * item.quantity}</span>
              </div>
            `).join('')}
          </div>
          <hr class="border-dashed border-gray-300 my-2" />
          <div class="space-y-1 text-xs">
            <div class="flex justify-between"><span class="text-gray-500">Subtotal:</span><span class="text-gray-900">₹${subtotal.toFixed(2)}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Discount:</span><span class="text-green-600">-₹${manualDiscount.toFixed(2)}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Tax (5%):</span><span class="text-gray-900">₹${tax.toFixed(2)}</span></div>
            <div class="flex justify-between font-bold text-base text-gray-900 pt-1 mt-1 border-t border-gray-200">
              <span>Grand Total:</span>
              <span class="text-blue-600">₹${grandTotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-xs mt-2 text-gray-600 pt-1 border-t border-gray-100">
              <span>Paid via ${paymentMethod}:</span>
              <span>₹${parseFloat(amountReceived) || grandTotal}</span>
            </div>
            <div class="flex justify-between text-xs font-semibold text-green-600">
              <span>Change Returned:</span>
              <span>₹${changeAmount.toFixed(2)}</span>
            </div>
          </div>
          ${selectedCustomer.tier !== "New Customer" ? `
            <div class="mt-3 bg-yellow-50 p-2 rounded-lg text-[11px] text-yellow-800 border border-yellow-100 flex items-center gap-1">
              <span>⭐</span>
              <span>Loyalty: <strong>${selectedCustomer.name}</strong> will earn <strong>${loyaltyPointsEarned} points</strong>.</span>
            </div>
          ` : ''}
        </div>
      `,
      icon: "success",
      showCancelButton: true,
      confirmButtonText: "Print Receipt",
      cancelButtonText: "Close & New Order",
      confirmButtonColor: "#3B82F6",
      cancelButtonColor: "#6B7280",
    }).then((result) => {
      // Add to recent bills list
      const newBill: RecentBill = {
        id: billId,
        customerName: selectedCustomer.name,
        grandTotal: grandTotal,
        paymentMethod: paymentMethod,
        date: `Today, ${nowStr}`,
        itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      };
      setRecentBills(prev => [newBill, ...prev]);

      if (result.isConfirmed) {
        Swal.fire({
          title: "Sending to Printer...",
          text: "Thermal receipt printer triggered successfully.",
          icon: "info",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      // Reset state for new order
      setCart([]);
      setAmountReceived("0");
      setManualDiscount(0);
      setSpecialInstructions("");
      setBillNote("");
    });
  };

  // Add Custom Customer handler
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newId = `c${customers.length + 1}`;
    const newCustomer: Customer = {
      id: newId,
      name: newCustName,
      phone: newCustPhone || "New Phone",
      tier: newCustTier,
      points: newCustTier === "Gold" ? 50 : newCustTier === "Silver" ? 20 : 0,
    };

    setCustomers(prev => [...prev.filter(c => c.id !== "c3"), newCustomer, prev.find(c => c.id === "c3")!]);
    setSelectedCustomerId(newId);
    setShowNewCustModal(false);
    setNewCustName("");
    setNewCustPhone("");
    setNewCustTier("New Customer");

    Swal.fire({
      title: "Customer Added",
      text: `${newCustomer.name} has been selected for this billing.`,
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
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

  // Image Fallback
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=150";
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
            <h1 className="font-bold text-gray-900 text-lg md:text-xl">Billing</h1>
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
            <ChevronDown size={14} className="absolute right-3 top-3 pointer-events-none text-gray-400" />
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
            <ChevronDown size={14} className="absolute right-3 top-3 pointer-events-none text-gray-400" />
          </div>

          {/* New Walk-in Button */}
          <button
            onClick={() => {
              setSelectedCustomerId("c3"); // Walk-in
              setCart([]);
              setManualDiscount(0);
              setSpecialInstructions("");
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
              <Scan size={18} className="text-gray-400 cursor-pointer hover:text-gray-600 shrink-0" title="Scan Barcode" />
            </div>

            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {filteredCustomers.slice(0, 3).map((cust) => {
                const isSelected = selectedCustomerId === cust.id;
                const initials = cust.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition duration-150 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 shadow-2xs"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      cust.tier === "Gold" 
                        ? "bg-amber-100 text-amber-700" 
                        : cust.tier === "Silver"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {cust.phone ? initials : <User size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-gray-900 text-xs sm:text-sm">{cust.name}</h3>
                      <p className="truncate text-[11px] text-gray-500">{cust.phone || "No phone linked"}</p>
                      <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none mt-1 ${
                        cust.tier === "Gold" 
                          ? "bg-amber-50 text-amber-600 border border-amber-100" 
                          : cust.tier === "Silver"
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {cust.tier}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add customer action */}
            <div className="mt-3.5 text-center">
              <button
                onClick={() => setShowNewCustModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                <UserPlus size={14} />
                + Add New Customer
              </button>
            </div>
          </div>

          {/* B. CATEGORIES SIDEBAR + PRODUCTS LIST */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Category sidebar list (1/4 columns on desktop) */}
            <div className="md:col-span-1 flex md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 pb-2 md:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => {
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
                <button className="text-gray-400 hover:text-gray-600" title="Filters">
                  <SlidersIcon size={16} />
                </button>
              </div>

              {/* Items Rows */}
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {visibleItems.length > 0 ? (
                  visibleItems.map((food) => {
                    const isInCart = cart.some(c => c.item.id === food.id);

                    return (
                      <div
                        key={food.id}
                        className="flex items-center justify-between rounded-xl border border-gray-50 p-2 hover:bg-slate-50/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={food.image}
                            alt={food.name}
                            onError={handleImageError}
                            className="h-14 w-14 rounded-lg object-cover bg-gray-100 shadow-2xs border border-gray-100"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900 text-sm">{food.name}</span>
                              <span
                                className={`flex h-3.5 w-3.5 items-center justify-center border text-[8px] font-bold rounded-sm shrink-0 ${
                                  food.isVeg
                                    ? "border-green-600 text-green-600"
                                    : "border-red-600 text-red-600"
                                }`}
                                title={food.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${food.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-gray-600">₹{food.price}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => addToCart(food)}
                          className={`rounded-lg border px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                            isInCart
                              ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                              : "border-blue-200 text-blue-600 bg-blue-50/40 hover:bg-blue-50"
                          }`}
                        >
                          {isInCart ? "Add +" : "Add"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-gray-400 text-xs">
                    <UtensilsCrossed size={32} className="mx-auto mb-2 opacity-50" />
                    No food items match your search.
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
                    <span>{viewAllItems ? "View Less Items" : "View More Items"}</span>
                    <ChevronDown size={14} className={`transition-transform ${viewAllItems ? "rotate-180" : ""}`} />
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
                <h2 className="font-bold text-gray-900 text-sm">Order Summary</h2>
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
                    <div key={item.item.id} className="flex items-center justify-between py-1">
                      <div className="min-w-0 flex-1 mr-2">
                        <h4 className="truncate text-xs font-bold text-gray-800">{item.item.name}</h4>
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
                          <span className="text-xs font-bold text-gray-800 w-4 text-center">{item.quantity}</span>
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
                  {specialInstructions ? "Edit Special Instructions" : "Add Special Instructions"}
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
                  <span className="font-semibold text-gray-850">₹{subtotal.toFixed(2)}</span>
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
                    <span className="font-semibold text-green-600">-₹{manualDiscount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax (5%)</span>
                  <span className="font-semibold text-gray-850">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Round off</span>
                  <span className="font-semibold text-gray-850">₹{roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</span>
                </div>

                {/* Grand Total Highlight */}
                <div className="mt-3.5 flex items-center justify-between rounded-xl bg-blue-50 p-3 border border-blue-100">
                  <span className="font-bold text-blue-700 text-sm">Grand Total</span>
                  <span className="font-extrabold text-blue-700 text-base md:text-lg">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Loyalty banner */}
              {selectedCustomer.tier !== "New Customer" && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 p-2.5 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-bold text-gray-900">{selectedCustomer.name} ({selectedCustomer.tier})</h4>
                      <p className="text-[10px] text-gray-600">You will earn {loyaltyPointsEarned} points on this bill</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomerId("c3")} // switch back to Walk-in
                    className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 border border-gray-200 transition cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Payment Methods */}
              <div className="mt-4 border-t border-gray-100 pt-3.5">
                <h3 className="mb-2 text-xs font-bold text-gray-600">Payment Method</h3>
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
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Amount Received</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-gray-500">₹</span>
                          <input
                            type="number"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-5 pr-2.5 text-xs font-bold text-gray-800 focus:border-blue-400 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Change</label>
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
                onClick={handleGenerateBill}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                <FileText size={15} />
                Generate Bill
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
            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Billed By</label>
            <div className="relative">
              <select
                value={billedBy}
                onChange={(e) => setBilledBy(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white pl-8 pr-8 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="Aman (TM-07)">Aman (TM-07)</option>
                <option value="Sarah (TM-08)">Sarah (TM-08)</option>
                <option value="Kabir (TM-09)">Kabir (TM-09)</option>
              </select>
              <User size={13} className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Bill Note input */}
          <div className="flex-1 max-w-sm">
            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Bill Note</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Add note (optional)"
                value={billNote}
                onChange={(e) => setBillNote(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
              />
              <Pencil size={11} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
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

      {/* NEW CUSTOMER MODAL */}
      {showNewCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="font-bold text-gray-900 text-sm md:text-base">Add New Customer</h3>
              <button onClick={() => setShowNewCustModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="E.g. Priya Singh"
                  className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs text-gray-800 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="E.g. 9876543210"
                  className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs text-gray-800 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Membership Tier</label>
                <select
                  value={newCustTier}
                  onChange={(e) => setNewCustTier(e.target.value as any)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs text-gray-800 focus:border-blue-400 focus:outline-none"
                >
                  <option value="New Customer">New Customer</option>
                  <option value="Silver">Silver Member</option>
                  <option value="Gold">Gold Member</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewCustModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-2xs"
                >
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <button onClick={() => setShowRecentBillsDrawer(false)} className="text-gray-400 hover:text-gray-600">
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
                      <span className="font-bold text-gray-800 text-xs">{bill.id}</span>
                      <span className="text-[10px] text-gray-400">{bill.date}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 truncate max-w-[150px]">{bill.customerName}</span>
                      <span className="font-extrabold text-blue-600">₹{bill.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                      <span>{bill.itemsCount} item{bill.itemsCount > 1 ? "s" : ""}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded-sm">{bill.paymentMethod}</span>
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
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function UpiIcon({ size = 16 }: { size?: number }) {
  return (
    <div 
      className="font-black italic text-[9px] border border-blue-600 text-blue-600 bg-white px-1 leading-none rounded-sm shrink-0 flex items-center justify-center h-4"
      style={{ minWidth: '22px' }}
      title="Unified Payments Interface"
    >
      UPI
    </div>
  );
}