import { useEffect, useMemo, useRef, useState } from "react";

import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  MoreVertical,
  Calendar,
  ChevronDown,
  Package,
  ShoppingBag,
  IndianRupee,
  Wallet,
  Landmark,
  Users,
  User,
  CreditCard,
  Clock,
  Copy,
  Info,
  Receipt,
  FileText,
  HelpCircle,
  Headset,
  BarChart2,
  Share2,
  Pencil,
  Plus,
  X,
  Check,
  LayoutGrid,
  List,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardSidebar } from "../../components/dashboard/DashboardSidebar";
import { TopNavbar } from "../../components/dashboard/TopNavbar";
import { CspJoinModal } from "../../components/dashboard/CspJoinModal";
import { useCspApplication } from "../../hooks/useCspApplication";
import { cspProductApi } from "../../services/csp.service";

// ================= TYPES =================
export interface ProgramProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
  category?: string;
  offerType?: "percent" | "flat";
  offerValue?: number;
}

export interface ProgramSale {
  id: string;
  orderNo: string;
  productName: string;
  timeAgo: string;
  amount: number;
  status: "Paid" | "Cancelled" | "Returned";
  image: string;
  buyerName?: string;
  paymentMethod?: string;
  commission?: number;
  sku?: string;
  orderDate?: string;
  discount?: number;
  saleMilestone?: string;
  transactionId?: string;
  quantity?: number;
}

export interface ProgramTimelineEntry {
  id: string;
  type: "sale" | "payout";
  title: string;
  status: "Paid" | "Completed" | "Cancelled";
  subtitle: string;
  time: string;
  amount: number;
  isCredit: boolean;
  utr?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  payoutDate?: string;
  totalSalesAmount?: number;
  discount?: number;
  earnings?: number;
  previousPending?: number;
  relatedOrders?: string;
}

export interface ProgramTimelineGroup {
  date: string;
  items: ProgramTimelineEntry[];
}

const PRODUCT_CATEGORIES = [
  "Art Supplies",
  "Home Decor",
  "Fashion",
  "Handmade Crafts",
  "Pottery & Ceramics",
  "Jewellery & Accessories",
  "Stationery & Journals",
  "Paintings & Canvas",
  "Toys & Dolls",
  "Candles & Fragrances",
  "Gift Hampers",
  "Prints & Digital Art",
  "Clothing & Apparel",
  "Organic Goods",
];

type DiscountType = "percent" | "flat";

function readOffer(
  price: number,
  type: DiscountType,
  raw: string,
): { error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    return { error: "Enter a discount greater than 0." };
  }
  if (type === "percent" && value > 100) {
    return { error: "Percent discount cannot be more than 100." };
  }
  if (type === "flat" && value >= price) {
    return { error: "Flat discount must be less than the price." };
  }
  return {};
}

function offeredPrice(product: Pick<ProgramProduct, "price" | "offerType" | "offerValue">) {
  if (!product.offerType || !product.offerValue) return product.price;
  if (product.offerType === "percent") {
    return Math.max(0, Math.round((product.price * (100 - product.offerValue)) / 100));
  }
  return Math.max(0, product.price - product.offerValue);
}

function offerLabel(product: Pick<ProgramProduct, "offerType" | "offerValue">) {
  if (!product.offerType || !product.offerValue) return "";
  return product.offerType === "percent"
    ? `${product.offerValue}% off`
    : `₹${product.offerValue} off`;
}

function ProductOfferField({
  price,
  discountType,
  offerValue,
  onTypeChange,
  onValueChange,
}: {
  price: string;
  discountType: DiscountType;
  offerValue: string;
  onTypeChange: (type: DiscountType) => void;
  onValueChange: (value: string) => void;
}) {
  const parsed = readOffer(Number(price) || 0, discountType, offerValue);
  const payable =
    !parsed.error && offerValue.trim() && Number(price) > 0
      ? offeredPrice({
          price: Number(price),
          offerType: discountType,
          offerValue: Number(offerValue),
        })
      : null;

  return (
    <div>
      <label className="block text-xs font-bold text-gray-700">Discount</label>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => onTypeChange("percent")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
              discountType === "percent"
                ? "bg-orange-500 text-white"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => onTypeChange("flat")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
              discountType === "flat"
                ? "bg-orange-500 text-white"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Flat
          </button>
        </div>
        <input
          type="number"
          min="0"
          step="1"
          placeholder={discountType === "percent" ? "10" : "50"}
          value={offerValue}
          onChange={(event) => onValueChange(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
        />
      </div>
      <p className="mt-1.5 text-[11px] text-gray-400">
        {discountType === "percent"
          ? "Optional. Percent off the price."
          : "Optional. Rupees off the price."}
      </p>
      {parsed.error ? (
        <p className="mt-1 text-[11px] font-semibold text-rose-500">{parsed.error}</p>
      ) : payable !== null ? (
        <p className="mt-1 text-[11px] font-semibold text-emerald-600">
          Offer price ₹{payable.toLocaleString("en-IN")}
        </p>
      ) : null}
    </div>
  );
}

function ProductImageField({
  image,
  onFile,
  onClear,
}: {
  image: string;
  onFile: (file?: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div>
      <span className="block text-xs font-bold text-gray-700">Product Image</span>
      {image ? (
        <div className="mt-1 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          <img
            src={image}
            alt="Selected product"
            className="h-44 w-full object-cover"
          />
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-white px-3 py-2">
            <span className="text-xs font-medium text-gray-500">Image ready</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                Change
              </button>
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-bold text-gray-500 hover:text-gray-800"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            onFile(event.dataTransfer.files?.[0]);
          }}
          className={`mt-1 flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-4 py-8 text-center transition ${
            dragOver
              ? "border-orange-500 bg-orange-50"
              : "border-gray-300 bg-[#FFF9F5] hover:border-orange-400"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <Upload size={18} />
          </span>
          <span className="text-sm font-semibold text-gray-900">
            Upload product image
          </span>
          <span className="text-xs text-gray-500">
            Click or drop a JPG or PNG, up to 2 MB
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}

type TabType = "products" | "sales" | "timeline";
type ViewMode = "list" | "grid";
type TimeFilter = "Today" | "This Week" | "This Month" | "Last Month" | "All Time";

export default function ProgramsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("This Month");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [products, setProducts] = useState<ProgramProduct[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const sales: ProgramSale[] = [];
  const timelineGroups: ProgramTimelineGroup[] = [];

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProgramProduct | null>(null);
  const [selectedSale, setSelectedSale] = useState<ProgramSale | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<ProgramTimelineEntry | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formDiscountType, setFormDiscountType] = useState<DiscountType>("percent");
  const [formOfferValue, setFormOfferValue] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const { application, loaded, refresh } = useCspApplication();

  useEffect(() => {
    if (!loaded || application?.status !== "approved") return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await cspProductApi.list();
        if (!cancelled) setProducts(Array.isArray(data.data) ? data.data : []);
      } catch {
        if (!cancelled) toast.error("Could not load your products.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, application?.status]);

  const timeOptions: TimeFilter[] = [
    "Today",
    "This Week",
    "This Month",
    "Last Month",
    "All Time",
  ];

  // Filtered products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Open add modal
  const handleOpenAdd = () => {
    setFormName("");
    setFormPrice("");
    setFormStock("");
    setFormCategory("");
    setFormImage("");
    setFormImageFile(null);
    setFormDiscountType("percent");
    setFormOfferValue("");
    setIsAddModalOpen(true);
  };

  const handleImageFile = (file?: File) => {
    if (!file) {
      setFormImage("");
      setFormImageFile(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2 MB or smaller.");
      return;
    }
    setFormImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setFormImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const productPayload = () => ({
    name: formName.trim(),
    price: formPrice.trim(),
    stock: formStock.trim(),
    category: formCategory.trim(),
    offerType: formDiscountType,
    offerValue: formOfferValue.trim(),
  });

  const readApiError = (error: unknown) => {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    return response?.data?.message || "Could not save the product.";
  };

  // Open edit modal
  const handleOpenEdit = (p: ProgramProduct) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormPrice(String(p.price));
    setFormStock(String(p.stock));
    setFormCategory(p.category || "");
    setFormImage(p.image || "");
    setFormImageFile(null);
    setFormDiscountType(p.offerType === "flat" ? "flat" : "percent");
    setFormOfferValue(p.offerValue ? String(p.offerValue) : "");
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProduct) return;
    if (!formName.trim() || !formPrice.trim()) {
      toast.error("Please fill in all product details");
      return;
    }
    if (!formImageFile) {
      toast.error("Please upload a product image");
      return;
    }
    if (!formCategory.trim()) {
      toast.error("Please select a category");
      return;
    }
    const offer = readOffer(Number(formPrice) || 0, formDiscountType, formOfferValue);
    if (offer.error) {
      toast.error(offer.error);
      return;
    }
    try {
      setSavingProduct(true);
      const { data } = await cspProductApi.create(productPayload(), formImageFile);
      setProducts((prev) => [data.data, ...prev]);
      setIsAddModalOpen(false);
      toast.success("Product added successfully!");
    } catch (error) {
      toast.error(readApiError(error));
    } finally {
      setSavingProduct(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || savingProduct) return;
    if (!formName.trim() || !formPrice.trim() || !formStock.trim()) {
      toast.error("Please fill in all product details");
      return;
    }
    if (!formImage && !formImageFile) {
      toast.error("Please upload a product image");
      return;
    }
    const offer = readOffer(Number(formPrice) || 0, formDiscountType, formOfferValue);
    if (offer.error) {
      toast.error(offer.error);
      return;
    }
    try {
      setSavingProduct(true);
      const { data } = await cspProductApi.update(
        editingProduct.id,
        productPayload(),
        formImageFile,
      );
      setProducts((prev) =>
        prev.map((item) => (item.id === editingProduct.id ? data.data : item)),
      );
      setEditingProduct(null);
      toast.success("Product updated successfully!");
    } catch (error) {
      toast.error(readApiError(error));
    } finally {
      setSavingProduct(false);
    }
  };

const handleDeleteProduct = async (id: string, name: string) => {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: `Do you want to remove "${name}" from display?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, remove it!",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
  });

  if (!result.isConfirmed) return;

  try {
    await cspProductApi.remove(id);

    setProducts((prev) => prev.filter((p) => p.id !== id));

    toast.success(`Removed "${name}" from display.`);
  } catch (error) {
    toast.error(readApiError(error));
  }
};

  // Share product link
  const handleShare = (product: ProgramProduct) => {
    const url = `${window.location.origin}/programs#${product.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    toast.success(`Share link copied for ${product.name}!`);
  };

  // Horizontally adjustable content container
  const helpWhatsApp = `https://wa.me/918073988123?text=${encodeURIComponent(
    application?.status === "rejected"
      ? `Hi, my CSP application was rejected. Reason: ${application.rejectionReason || "not specified"}. Please help.`
      : "Hi, I need help with the CSP Program.",
  )}`;

  if (!loaded || application?.status !== "approved") {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardSidebar
          mode="drawer"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="mx-auto max-w-[1440px] p-4 md:p-6">
          <div className="hidden gap-6 xl:flex">
            <DashboardSidebar mode="fixed" />
            <div className="min-w-0 flex-1 space-y-6">
              <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
              <ProgramAccessCard
                loaded={loaded}
                status={application?.status}
                reason={application?.rejectionReason}
                helpUrl={helpWhatsApp}
                onApply={() => setApplyOpen(true)}
              />
            </div>
          </div>
          <div className="xl:hidden">
            <ProgramAccessCard
              loaded={loaded}
              status={application?.status}
              reason={application?.rejectionReason}
              helpUrl={helpWhatsApp}
              onApply={() => setApplyOpen(true)}
            />
          </div>
        </div>
        <CspJoinModal
          isOpen={applyOpen}
          onClose={() => {
            setApplyOpen(false);
            void refresh();
          }}
        />
      </div>
    );
  }

  const content = (
    <div className="w-full space-y-6 pb-12">
      <div className="overflow-hidden rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)] sm:p-6 md:p-8">
        
        {/* ================= HEADER ================= */}
        <div className="mb-6 flex flex-nowrap items-center justify-between gap-3 border-b border-gray-100 pb-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-700 transition hover:bg-gray-100 active:scale-95"
              aria-label="Go back"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-lg font-black tracking-tight text-[#0f172a] sm:text-2xl md:text-3xl">
                  CSP Program
                </h1>
                {/* 3 diagonal orange spark accent dashes */}
                <svg
                  className="h-5 w-5 -mt-2 text-orange-500"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M4 3L2 1.5" />
                  <path d="M8 2L8 0" />
                  <path d="M12 3L14 1.5" />
                </svg>
              </div>

              <p className="text-xs font-semibold text-[#94a3b8] sm:text-sm">
                Creative Seller Partner
              </p>
            </div>
          </div>

          {/* Right Controls: Filter + More */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <Calendar size={15} className="text-gray-500" />
                <span>{timeFilter}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {filterDropdownOpen && (
                <div className="absolute right-0 top-11 z-30 w-40 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  {timeOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setTimeFilter(opt);
                        setFilterDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                        timeFilter === opt
                          ? "bg-orange-50 text-orange-600 font-bold"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {opt}
                      {timeFilter === opt && <Check size={14} className="text-orange-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* More Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuDropdownOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/90 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 cursor-pointer"
                aria-label="More options"
              >
                <MoreVertical size={18} />
              </button>

              {menuDropdownOpen && (
                <>
                  {/* Backdrop to close when clicking outside */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuDropdownOpen(false)}
                  />

                  {/* Popover Card */}
                  <div className="absolute right-0 top-11 z-40 w-44 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuDropdownOpen(false);
                        navigate("/help");
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                    >
                      <HelpCircle size={20} className="text-gray-900 stroke-[2] shrink-0" />
                      <span>FAQs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuDropdownOpen(false);
                        navigate("/help");
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                    >
                      <Headset size={20} className="text-gray-900 stroke-[2] shrink-0" />
                      <span>Help</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                    >
                      <FileText size={20} className="text-gray-900 stroke-[2] shrink-0" />
                      <span>Terms</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ================= 6 STAT CARDS (ADJUSTS HORIZONTALLY ON LARGE SCREENS) ================= */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
          {/* Card 1: Products Displayed */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#FFEADA]/80 bg-[#FFF9F5] p-3.5 transition hover:shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100/90 text-orange-600">
                <Package size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                Products Displayed
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">{products.length}</p>
            </div>
          </div>

          {/* Card 2: Products Sold */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#E1F4E7]/80 bg-[#F3FAF5] p-3.5 transition hover:shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100/90 text-emerald-600">
                <ShoppingBag size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                Products Sold
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">
                {sales.filter((sale) => sale.status === "Paid").length}
              </p>
            </div>
          </div>

          {/* Card 3: Earnings */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#F6EED8]/80 bg-[#FCFAF2] p-3.5 transition hover:shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100/90 text-amber-700">
                <IndianRupee size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                Earnings
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">
                ₹{sales.reduce((sum, sale) => sum + (sale.status === "Paid" ? sale.commission || 0 : 0), 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Card 4: Payouts */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#E2EEFB]/80 bg-[#F4F8FC] p-3.5">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100/90 text-blue-600">
                <Wallet size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                Payouts
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">₹0</p>
              <span className="mt-1.5 block text-[11px] font-medium text-gray-400">
                0 completed
              </span>
            </div>
          </div>

          {/* Card 5: Leads */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#FBE0E3]/80 bg-[#FCF4F5] p-3.5 transition hover:shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100/90 text-rose-500">
                <Users size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                Leads
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">0</p>
            </div>
          </div>

          {/* Card 6: History */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#E9EBEF]/80 bg-[#F6F7F9] p-3.5 transition hover:shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200/90 text-slate-700">
                <FileText size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                History
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">{products.length}</p>
              <span className="mt-1.5 block text-[11px] font-medium text-gray-400">
                Total activities
              </span>
            </div>
          </div>
        </div>

        {/* ================= HORIZONTAL TABS ================= */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-6 sm:gap-10">
            {/* Products Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`flex items-center gap-2 text-sm font-bold transition cursor-pointer ${
                activeTab === "products"
                  ? "text-orange-500"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Package size={18} strokeWidth={activeTab === "products" ? 2.5 : 2} />
              <span>Products</span>
            </button>

            {/* Sales Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("sales")}
              className={`flex items-center gap-2 text-sm font-bold transition cursor-pointer ${
                activeTab === "sales"
                  ? "text-orange-500"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <ShoppingBag size={18} strokeWidth={activeTab === "sales" ? 2.5 : 2} />
              <span>Sales</span>
            </button>

            {/* Timeline Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center gap-2 text-sm font-bold transition cursor-pointer ${
                activeTab === "timeline"
                  ? "text-orange-500"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <BarChart2 size={18} strokeWidth={activeTab === "timeline" ? 2.5 : 2} />
              <span>Timeline</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: PRODUCTS ================= */}
        {activeTab === "products" && (
          <div>
            {/* Top Toolbar: Search + View Mode Switcher + Add Button */}
            <div className="mb-5 flex flex-nowrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="relative w-full">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products by name or category..."
                    className="w-full rounded-xl border border-gray-200/90 bg-gray-50/50 py-2 pl-9 pr-3.5 text-xs font-medium text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {/* View Mode Switcher (List vs Grid) */}
                <div className="flex items-center rounded-xl border border-gray-200/80 bg-gray-50/70 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      viewMode === "list"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    title="Horizontal List View"
                  >
                    <List size={15} />
                    <span className="hidden sm:inline">List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      viewMode === "grid"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    title="Horizontal Grid View"
                  >
                    <LayoutGrid size={15} />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                </div>

                {/* Add Product Button */}
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 active:scale-95 sm:px-4"
                >
                  <Plus size={15} className="stroke-[2.5]" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Empty search state */}
            {filteredProducts.length === 0 && (
              <div className="py-12 text-center">
                <Package size={36} className="mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-bold text-gray-700">No products found</p>
                <p className="text-xs text-gray-400">
                  Try adjusting your search query or add a new product.
                </p>
              </div>
            )}

            {/* LIST VIEW (Adjustable full-width horizontal rows) */}
            {viewMode === "list" && filteredProducts.length > 0 && (
              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
                {filteredProducts.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5 transition hover:bg-slate-50/70 sm:p-4"
                  >
                    {/* Left: Thumbnail + Name + Category + Price */}
                    <div className="flex items-center gap-3.5 min-w-[220px]">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border border-black/[0.06] bg-gray-100">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover transition hover:scale-105"
                          loading="lazy"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900">
                            {item.name}
                          </h3>
                          {item.category && (
                            <span className="hidden sm:inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-500">
                          {offerLabel(item) ? (
                            <>
                              <span className="font-bold text-gray-900">
                                ₹{offeredPrice(item).toLocaleString("en-IN")}
                              </span>
                              <span className="text-[11px] font-medium text-gray-400 line-through">
                                ₹{item.price.toLocaleString("en-IN")}
                              </span>
                              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                                {offerLabel(item)}
                              </span>
                            </>
                          ) : (
                            <span>₹{item.price.toLocaleString("en-IN")}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Stock + Action Buttons */}
                    <div className="flex items-center gap-6 sm:gap-8 ml-auto sm:ml-0">
                      <div className="text-right">
                        <span className="block text-[10px] sm:text-[11px] font-medium text-gray-400">
                          In Stock
                        </span>
                        <strong className="block text-base sm:text-lg font-bold text-emerald-600 leading-tight">
                          {item.stock}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleShare(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95"
                          title="Share Link"
                        >
                          <Share2 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95"
                          title="Edit Product"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id, item.name)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                          title="Remove from display"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GRID VIEW */}
            {viewMode === "grid" && filteredProducts.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((item) => (
                  <div
                    key={item.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-emerald-600 shadow-sm backdrop-blur">
                          {item.stock} in stock
                        </span>
                      </div>

                      <div className="p-3.5">
                        <h3 className="truncate text-sm font-bold text-gray-900">
                          {item.name}
                        </h3>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                            {offerLabel(item) ? (
                              <>
                                <span>₹{offeredPrice(item).toLocaleString("en-IN")}</span>
                                <span className="text-[11px] font-medium text-gray-400 line-through">
                                  ₹{item.price.toLocaleString("en-IN")}
                                </span>
                              </>
                            ) : (
                              <span>₹{item.price.toLocaleString("en-IN")}</span>
                            )}
                          </span>
                          {item.category && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleShare(item)}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
                      >
                        <Share2 size={14} />
                        <span>Share</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded p-1 text-gray-500 hover:text-gray-900"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id, item.name)}
                          className="rounded p-1 text-rose-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: SALES (EXACT REFERENCE DESIGN) ================= */}
        {activeTab === "sales" && (
          <div>
            {/* Header: Recent Sales (8) + View All Button */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 sm:text-lg">
                Recent Sales ({sales.length})
              </h2>

              <button
                type="button"
                onClick={() =>
                  toast.info(
                    sales.length
                      ? `Showing ${sales.length} sales.`
                      : "No sales yet.",
                  )
                }
                className="flex items-center gap-1 rounded-full border border-orange-500/80 px-3.5 py-1 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 active:scale-95"
              >
                <span>View All</span>
                <ArrowRight size={13} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Sales List */}
            <div className="divide-y divide-gray-100/90 rounded-2xl border border-gray-100/80 bg-white">
              {sales.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-500">
                  No sales yet. Sales appear here after someone buys a product you added.
                </p>
              ) : null}
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="group flex flex-wrap items-center justify-between gap-3 p-3 transition hover:bg-slate-50/70 sm:p-3.5 cursor-pointer"
                >
                  {/* Left: Thumbnail + Title + Order ID & Time */}
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-[200px]">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border border-black/[0.04] bg-gray-100">
                      <img
                        src={sale.image}
                        alt={sale.productName}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm sm:text-[15px] font-bold text-gray-900">
                        {sale.productName}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-400 font-medium">
                        {sale.orderNo} <span className="mx-1">•</span> {sale.timeAgo}
                      </p>
                    </div>
                  </div>

                  {/* Right: Price + Status Badge + Arrow */}
                  <div className="flex items-center gap-3 sm:gap-4 ml-auto sm:ml-0">
                    <span className="text-sm sm:text-[15px] font-bold text-gray-900">
                      ₹{sale.amount.toLocaleString("en-IN")}
                    </span>

                    <span
                      className={`min-w-[68px] text-center rounded-full px-3 py-1 text-xs font-semibold ${
                        sale.status === "Paid"
                          ? "bg-[#E8F8EE] text-[#16A34A]"
                          : sale.status === "Cancelled"
                          ? "bg-[#FEECEB] text-[#DC2626]"
                          : "bg-[#EBF3FE] text-[#2563EB]"
                      }`}
                    >
                      {sale.status}
                    </span>

                    <ChevronRight size={17} className="text-gray-400 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: TIMELINE (EXACT REFERENCE DESIGN) ================= */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            {timelineGroups.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">
                No activity yet.
              </p>
            ) : null}
            {timelineGroups.map((group) => (
              <div key={group.date} className="relative">
                {/* Date Heading with Orange Bullet */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                  <h3 className="text-sm font-bold text-gray-900 sm:text-[15px]">
                    {group.date}
                  </h3>
                </div>

                {/* Vertical timeline line connecting groups */}
                <div className="relative pl-5 sm:pl-6 space-y-2.5 before:absolute before:left-[4px] before:top-[-6px] before:bottom-[-16px] before:w-[1.5px] before:bg-gray-100 last:before:hidden">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.type === "payout") {
                          setSelectedPayout(item);
                        } else {
                          const match = sales.find((sale) =>
                            item.subtitle.includes(sale.orderNo),
                          );
                          if (match) setSelectedSale(match);
                        }
                      }}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-gray-100/90 bg-white p-3.5 sm:p-4 shadow-sm transition hover:shadow-md hover:border-gray-200 cursor-pointer"
                    >
                      {/* Left: Icon Badge + Title/Status + Subtitle + Time */}
                      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                        {/* Circular Icon */}
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition group-hover:scale-105 ${
                            item.type === "sale"
                              ? "bg-[#EAF8F0] text-emerald-600"
                              : "bg-[#EBF3FE] text-blue-600"
                          }`}
                        >
                          {item.type === "sale" ? (
                            <ShoppingBag size={18} strokeWidth={2.2} />
                          ) : (
                            <Wallet size={18} strokeWidth={2.2} />
                          )}
                        </div>

                        {/* Title, Badge, Subtitle & Time */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-[15px] font-bold text-gray-900">
                              {item.title}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                item.status === "Paid"
                                  ? "bg-[#E8F8EE] text-[#16A34A]"
                                  : item.status === "Completed"
                                  ? "bg-[#EBF3FE] text-[#2563EB]"
                                  : "bg-[#FEECEB] text-[#DC2626]"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <p className="mt-0.5 text-xs text-gray-500 font-medium truncate">
                            {item.subtitle}
                          </p>

                          <span className="mt-0.5 block text-[11px] text-gray-400 font-medium">
                            {item.time}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount + Chevron */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm sm:text-[15px] font-bold text-gray-900">
                          {item.isCredit ? "+ " : "- "}₹{item.amount.toLocaleString("en-IN")}
                        </span>

                        <ChevronRight
                          size={17}
                          className="text-gray-400 transition group-hover:translate-x-0.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= PAYOUT DETAILS MODAL (MATCHING REFERENCE IMAGE) ================= */}
      {selectedPayout && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPayout(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl overflow-hidden border-t sm:border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Handle (Mobile) */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            {/* Header: Wallet Icon + Title + UTR + Status Badge + Close Button */}
            <div className="shrink-0 px-5 pt-3 sm:px-6 sm:pt-5 pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EBF3FE] text-[#2563EB]">
                    <Wallet size={22} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-[22px] font-extrabold text-gray-950 tracking-tight leading-none">
                      Payout Details
                    </h2>
                    <p className="text-xs text-gray-400 font-medium font-mono mt-1">
                      UTR: {selectedPayout.utr || "SBIN3265987412"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#E8F8EE] px-2.5 py-0.5 text-xs font-bold text-[#16A34A] border border-emerald-100/60">
                      {selectedPayout.status || "Completed"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPayout(null)}
                      className="rounded-full p-1 text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                      aria-label="Close modal"
                    >
                      <X size={20} className="stroke-[2.2]" />
                    </button>
                  </div>
                  <span className="mt-1 text-[11px] sm:text-xs text-gray-400 font-medium">
                    {selectedPayout.payoutDate || "16 Oct 2026, 09:15 AM"}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-6 space-y-3.5">
              {/* Payout Amount Banner Card */}
              <div className="rounded-2xl bg-[#EEF5FF] border border-blue-100/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Amount */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-2xs border border-blue-100/60">
                    <ShoppingBag size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500">
                      Payout Amount
                    </span>
                    <p className="text-2xl sm:text-[26px] font-black text-gray-950 leading-tight">
                      ₹{selectedPayout.amount ? selectedPayout.amount.toLocaleString("en-IN") : "1,200"}
                    </p>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block h-10 w-[1px] bg-blue-200/60 mx-1" />

                {/* Right: Transferred to Bank */}
                <div className="flex flex-col sm:items-end">
                  <span className="text-[11px] font-medium text-gray-500">
                    Transferred to
                  </span>
                  <p className="text-xs font-bold text-gray-800 leading-snug">
                    {selectedPayout.bankName || "State Bank of India"}
                  </p>
                  <p className="text-xs font-semibold text-gray-500">
                    {selectedPayout.accountNumber || "••••• 7842"}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[11px] font-bold text-blue-600 border border-blue-200/60 shadow-2xs w-fit">
                    <Landmark size={11} strokeWidth={2.5} /> Payout to Bank
                  </span>
                </div>
              </div>

              {/* Payout Summary Card */}
              <div className="rounded-2xl bg-[#F8FAFC] border border-gray-100/80 p-4 space-y-2.5">
                <h4 className="text-sm font-bold text-gray-900">Payout Summary</h4>

                {/* Total Sales Amount */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <span className="text-gray-500 font-medium">Total Sales Amount</span>
                  <span className="font-bold text-gray-900">
                    ₹{selectedPayout.totalSalesAmount ? selectedPayout.totalSalesAmount.toLocaleString("en-IN") : "1,800"}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <span className="text-gray-500 font-medium">Discount</span>
                  <span className="font-bold text-gray-700">
                    - ₹{selectedPayout.discount ?? 300}
                  </span>
                </div>

                {/* Your Earnings (70%) */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 font-medium">Your Earnings (70%)</span>
                    <Info
                      size={13}
                      className="text-gray-400 stroke-[2] cursor-pointer"
                      onClick={() =>
                        toast.info("Net earnings based on 70% partner revenue share.")
                      }
                    />
                  </div>
                  <span className="font-bold text-gray-900">
                    ₹{selectedPayout.earnings ? selectedPayout.earnings.toLocaleString("en-IN") : "1,260"}
                  </span>
                </div>

                {/* Previous Pending */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <span className="text-gray-500 font-medium">Previous Pending</span>
                  <span className="font-bold text-gray-700">
                    + ₹{selectedPayout.previousPending ?? 60}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200/70" />

                {/* Total Payout */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-950">Total Payout</span>
                  <span className="text-base sm:text-lg font-black text-gray-950">
                    ₹{selectedPayout.amount ? selectedPayout.amount.toLocaleString("en-IN") : "1,200"}
                  </span>
                </div>
              </div>

              {/* Related Orders Card */}
              <div
                onClick={() => {
                  setSelectedPayout(null);
                  const match = sales.find((sale) =>
                    String(selectedPayout.relatedOrders || "").includes(sale.orderNo),
                  );
                  if (match) setSelectedSale(match);
                }}
                className="rounded-2xl bg-[#F8FAFC] border border-gray-100/80 p-3.5 flex items-center justify-between transition hover:bg-slate-100/70 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3ED] text-[#EA580C]">
                    <FileText size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">
                      2 Orders Included
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium">
                      (Order #ATV1284, #ATV1277)
                    </p>
                  </div>
                </div>

                <ChevronRight size={16} className="text-gray-400" />
              </div>

              {/* Additional Information Card */}
              <div className="rounded-2xl bg-[#F8FAFC] border border-gray-100/80 p-4 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Additional Information</h4>

                {/* Bank Name */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Landmark size={15} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Bank Name</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedPayout.bankName || "State Bank of India"}
                  </span>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <CreditCard size={15} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Account Number</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedPayout.accountNumber || "••••• 7842"}
                  </span>
                </div>

                {/* IFSC */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Receipt size={15} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>IFSC</span>
                  </div>
                  <span className="font-bold text-gray-900 font-mono text-xs">
                    {selectedPayout.ifsc || "SBIN0001234"}
                  </span>
                </div>

                {/* Payout Date */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Calendar size={15} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Payout Date</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedPayout.payoutDate || "16 Oct 2026, 09:15 AM"}
                  </span>
                </div>
              </div>

              {/* Bottom Need Help Bar */}
              <div
                onClick={() => navigate("/help")}
                className="flex items-center justify-between pt-2 pb-1 text-xs text-gray-600 hover:text-gray-900 cursor-pointer transition"
              >
                <div className="flex items-center gap-1.5">
                  <HelpCircle size={15} className="text-gray-400 stroke-[2]" />
                  <span>Need any help?</span>
                  <span className="font-bold text-blue-600 hover:underline">
                    Contact us
                  </span>
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SALE DETAILS MODAL (MATCHING REFERENCE IMAGE) ================= */}
      {selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl overflow-hidden border-t sm:border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Handle (Mobile) */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            {/* Header: Title + Status Pill + Close button */}
            <div className="shrink-0 px-5 pt-3 sm:px-6 sm:pt-5 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-[22px] font-extrabold text-gray-950 tracking-tight">
                    Sale Details
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      selectedSale.status === "Paid"
                        ? "bg-[#E8F8EE] text-[#16A34A] border border-emerald-100/60"
                        : selectedSale.status === "Cancelled"
                        ? "bg-[#FEECEB] text-[#DC2626] border border-red-100/60"
                        : "bg-[#EBF3FE] text-[#2563EB] border border-blue-100/60"
                    }`}
                  >
                    {selectedSale.status}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="rounded-full p-1.5 text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={20} className="stroke-[2.2]" />
                </button>
              </div>

              {/* Sub-header: Order No & Date + Milestone Pill */}
              <div className="mt-1 flex items-center justify-between text-xs sm:text-[13px]">
                <p className="text-gray-500 font-medium">
                  Order {selectedSale.orderNo} <span className="mx-1">•</span>{" "}
                  {selectedSale.orderDate || "16 Oct 2026, 11:24 AM"}
                </p>

                <div className="flex items-center gap-1.5 rounded-full bg-[#FFF3ED] px-2.5 py-0.5 text-xs font-bold text-[#EA580C] border border-orange-100">
                  <BarChart2 size={13} className="stroke-[2.5]" />
                  <span>{selectedSale.saleMilestone || "4th Sale"}</span>
                </div>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-6 space-y-3.5">
              {/* Product Info Box */}
              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Product Thumbnail + Title + SKU + Price & Qty */}
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={selectedSale.image}
                    alt={selectedSale.productName}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border border-gray-100 shrink-0 shadow-xs"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-extrabold text-gray-900 leading-snug truncate">
                      {selectedSale.productName}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      SKU: {selectedSale.sku || "HM-001"}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs sm:text-[13px] font-bold text-gray-900">
                      <span>₹{selectedSale.amount}</span>
                      <span className="text-gray-300 font-normal">|</span>
                      <span className="text-gray-500 font-medium">
                        Qty: {selectedSale.quantity || 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Amount Box (Light Blue) */}
                <div className="rounded-2xl bg-[#EEF5FF] px-4 py-3 text-center shrink-0 min-w-[110px] flex flex-col justify-center border border-blue-100/50">
                  <span className="text-[11px] font-semibold text-gray-500">
                    Total Amount
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-gray-900 mt-0.5">
                    ₹{selectedSale.amount}
                  </span>
                </div>
              </div>

              {/* Order Summary Box */}
              <div className="rounded-2xl bg-[#F8FAFC] border border-gray-100/80 p-4 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Order Summary</h4>

                {/* Subtotal */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <span className="text-gray-500 font-medium">
                    Subtotal ({selectedSale.quantity || 1} item)
                  </span>
                  <span className="font-bold text-gray-900">₹{selectedSale.amount}</span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium">Discount</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 border border-emerald-100/60">
                      - ₹{selectedSale.discount ?? 50}
                    </span>
                  </div>
                  <span className="font-bold text-gray-700">
                    - ₹{selectedSale.discount ?? 50}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200/70" />

                {/* Total Billing */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Total Billing</span>
                  <span className="text-sm sm:text-base font-extrabold text-gray-900">
                    ₹{Math.max(0, selectedSale.amount - (selectedSale.discount ?? 50))}
                  </span>
                </div>

                {/* Your Earnings Banner (Green Box) */}
                <div className="flex items-center justify-between rounded-xl bg-[#ECFDF5] px-3.5 py-2.5 border border-emerald-100/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-900">
                      Your Earnings (70%)
                    </span>
                    <Info
                      size={13}
                      className="text-emerald-700 stroke-[2] cursor-pointer"
                      onClick={() =>
                        toast.info("70% earnings based on CSP Creative Seller partner tier.")
                      }
                    />
                  </div>
                  <span className="text-sm sm:text-base font-extrabold text-emerald-600">
                    ₹{Math.round(
                      Math.max(0, selectedSale.amount - (selectedSale.discount ?? 50)) * 0.7
                    )}
                  </span>
                </div>
              </div>

              {/* Additional Information Box */}
              <div className="rounded-2xl bg-[#F8FAFC] border border-gray-100/80 p-4 space-y-3.5">
                <h4 className="text-sm font-bold text-gray-900">Additional Information</h4>

                {/* Customer Name */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <User size={16} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Customer Name</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedSale.buyerName || "Riya Sharma"}
                  </span>
                </div>

                {/* Payment Method */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <CreditCard size={16} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Payment Method</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedSale.paymentMethod || "Online Payment (UPI)"}
                  </span>
                </div>

                {/* Payment Time */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Clock size={16} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Payment Time</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedSale.orderDate || "16 Oct 2026, 11:24 AM"}
                  </span>
                </div>

                {/* Transaction ID */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Receipt size={16} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Transaction ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 font-mono text-xs">
                      {selectedSale.transactionId || "UPI32984756129"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const tid = selectedSale.transactionId || "UPI32984756129";
                        navigator.clipboard?.writeText(tid);
                        toast.success("Transaction ID copied to clipboard!");
                      }}
                      className="rounded p-0.5 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                      title="Copy Transaction ID"
                    >
                      <Copy size={14} className="stroke-[2]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ================= ADD PRODUCT MODAL ================= */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Add New Product</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ceramic Planter"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Category
                </label>
                <select
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                >
                  <option value="">Select a category</option>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Price (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="499"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <ProductOfferField
                price={formPrice}
                discountType={formDiscountType}
                offerValue={formOfferValue}
                onTypeChange={setFormDiscountType}
                onValueChange={setFormOfferValue}
              />

              <ProductImageField
                image={formImage}
                onFile={handleImageFile}
                onClear={() => {
                  setFormImage("");
                  setFormImageFile(null);
                }}
              />

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-600 active:scale-95 disabled:opacity-60"
                >
                  {savingProduct ? "Adding..." : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT PRODUCT MODAL ================= */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Product</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Category
                </label>
                <select
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                >
                  <option value="">Select a category</option>
                  {formCategory && !PRODUCT_CATEGORIES.includes(formCategory) ? (
                    <option value={formCategory}>{formCategory}</option>
                  ) : null}
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <ProductOfferField
                price={formPrice}
                discountType={formDiscountType}
                offerValue={formOfferValue}
                onTypeChange={setFormDiscountType}
                onValueChange={setFormOfferValue}
              />

              <ProductImageField
                image={formImage}
                onFile={handleImageFile}
                onClear={() => {
                  setFormImage("");
                  setFormImageFile(null);
                }}
              />

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-600 active:scale-95 disabled:opacity-60"
                >
                  {savingProduct ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardSidebar
        mode="drawer"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="mx-auto max-w-[1440px] p-4 md:p-6">
        {/* Desktop Layout */}
        <div className="hidden gap-6 xl:flex">
          <DashboardSidebar mode="fixed" />
          <div className="min-w-0 flex-1 space-y-6">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            {content}
          </div>
        </div>

        {/* Mobile / Tablet Layout */}
        <div className="xl:hidden">
          <div className="space-y-5 pb-6">{content}</div>
        </div>
      </div>
    </div>
  );
}

function ProgramAccessCard({
  loaded,
  status,
  reason,
  helpUrl,
  onApply,
}: {
  loaded: boolean;
  status?: "under_review" | "approved" | "rejected";
  reason?: string;
  helpUrl: string;
  onApply: () => void;
}) {
  if (!loaded) {
    return <p className="p-6 text-sm text-slate-500">Loading your program…</p>;
  }

  if (status === "rejected") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Application rejected</h1>
        <p className="mt-3 text-sm leading-relaxed text-rose-700">
          {reason?.trim() || "No reason was provided."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white"
          >
            Help
          </a>
          <button
            type="button"
            onClick={onApply}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            Apply again
          </button>
        </div>
      </div>
    );
  }

  if (status === "under_review") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Under review</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your CSP application is under review. The program opens after it is approved.
        </p>
        <a
          href={helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white"
        >
          Help
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">CSP Program</h1>
      <p className="mt-3 text-sm text-slate-600">
        Apply to join. The product program opens only after your application is approved.
      </p>
      <button
        type="button"
        onClick={onApply}
        className="mt-5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white"
      >
        Apply for CSP Program
      </button>
    </div>
  );
}
