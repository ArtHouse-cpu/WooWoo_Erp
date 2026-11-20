import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  MoreVertical,
  Calendar,
  ChevronDown,
  Package,
  ShoppingBag,
  IndianRupee,
  Wallet,
  Users,
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
import { HapJoinModal } from "../../components/dashboard/HapJoinModal";
import { useHapApplication } from "../../hooks/useHapApplication";
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
                ? "bg-[#7C3AED] text-white"
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
                ? "bg-[#7C3AED] text-white"
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
          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500"
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
                className="text-xs font-bold text-[#7C3AED] hover:text-[#6D28D9]"
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
              ? "border-purple-500 bg-purple-50"
              : "border-gray-300 bg-[#FAF5FF] hover:border-purple-400"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-[#7C3AED]">
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

export default function HapProgramPage() {
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
  const { application, loaded, refresh } = useHapApplication();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await cspProductApi.list();
        if (!cancelled) setProducts(Array.isArray(data.data) ? data.data : []);
      } catch {
        // Fallback gracefully
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

  // Delete product
  const handleDeleteProduct = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: "Remove product?",
      text: `Remove "${name}" from your display?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#7C3AED",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, remove",
    });
    if (!result.isConfirmed) return;
    try {
      await cspProductApi.remove(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product removed from display");
    } catch (error) {
      toast.error(readApiError(error));
    }
  };

  // Share link
  const handleShare = (p: ProgramProduct) => {
    const shareUrl = `${window.location.origin}/supplies/product/${p.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Product link copied to clipboard!");
    } else {
      toast.info(`Share link: ${shareUrl}`);
    }
  };

  const helpWhatsApp = `https://wa.me/918073988123?text=${encodeURIComponent(
    application?.status === "rejected"
      ? `Hi, my HAP application was rejected. Reason: ${application.rejectionReason || "not specified"}. Please help.`
      : "Hi, I need help with the HAP Program.",
  )}`;

  // If not applied or rejected, show the access card
  if (loaded && application && application.status === "rejected") {
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
              <HapAccessCard
                loaded={loaded}
                status={application?.status}
                reason={application?.rejectionReason}
                helpUrl={helpWhatsApp}
                onApply={() => setApplyOpen(true)}
              />
            </div>
          </div>
          <div className="xl:hidden">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            <div className="mt-4">
              <HapAccessCard
                loaded={loaded}
                status={application?.status}
                reason={application?.rejectionReason}
                helpUrl={helpWhatsApp}
                onApply={() => setApplyOpen(true)}
              />
            </div>
          </div>
        </div>
        <HapJoinModal
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
      <div className="overflow-visible rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)] sm:p-6 md:p-8">
        
        {/* ================= HEADER ================= */}
        <div className="mb-6 flex flex-nowrap items-center justify-between gap-2 border-b border-gray-100 pb-5 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-[#111111]" strokeWidth={2.5} />
            </button>

            <div className="shrink-0">
              <div className="flex items-center gap-1">
                <h1 className="whitespace-nowrap text-[17px] font-black tracking-tight text-[#0f172a] sm:text-2xl md:text-3xl">
                  HAP Program
                </h1>
                {/* 3 diagonal purple spark accent dashes */}
                <svg
                  className="h-4 w-4 -mt-2 shrink-0 text-[#7C3AED] sm:h-5 sm:w-5"
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

              <p className="whitespace-nowrap text-[11px] font-semibold text-[#94a3b8] sm:text-sm">
                House Affiliate Program
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
                className="flex items-center gap-1.5 rounded-xl border border-gray-200/90 bg-white px-2.5 py-2 text-[11px] font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 sm:gap-2 sm:px-3.5 sm:text-xs cursor-pointer"
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
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition cursor-pointer ${
                        timeFilter === opt
                          ? "bg-purple-50 text-[#7C3AED] font-bold"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {opt}
                      {timeFilter === opt && <Check size={14} className="text-[#7C3AED]" />}
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
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuDropdownOpen(false)}
                  />

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
                        navigate("/terms");
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

        {/* ================= 6 STAT CARDS (KEPT AT TOP DIRECTLY UNDER HEADER) ================= */}
        <div className="mb-5 grid grid-cols-3 gap-1.5 sm:mb-8 sm:gap-4 lg:grid-cols-6">
          {/* Card 1: Products Displayed */}
          <div className="flex flex-col justify-between rounded-xl border sm:rounded-2xl border-[#FFEADA]/80 bg-[#FFF9F5] p-2 transition hover:shadow-sm sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-orange-100/90 text-orange-600">
                <Package className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                Products Displayed
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">{products.length}</p>
            </div>
          </div>

          {/* Card 2: Products Sold */}
          <div className="flex flex-col justify-between rounded-xl border sm:rounded-2xl border-[#E1F4E7]/80 bg-[#F3FAF5] p-2 transition hover:shadow-sm sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-emerald-100/90 text-emerald-600">
                <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                Products Sold
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">
                {sales.filter((sale) => sale.status === "Paid").length}
              </p>
            </div>
          </div>

          {/* Card 3: Earnings */}
          <div className="flex flex-col justify-between rounded-xl border sm:rounded-2xl border-[#F6EED8]/80 bg-[#FCFAF2] p-2 transition hover:shadow-sm sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-amber-100/90 text-amber-700">
                <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                Earnings
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">
                ₹{sales.reduce((sum, sale) => sum + (sale.status === "Paid" ? sale.commission || 0 : 0), 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Card 4: Payouts */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E2EEFB]/80 bg-[#F4F8FC] p-2 sm:rounded-2xl sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-blue-100/90 text-blue-600">
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                Payouts
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">₹0</p>
              <span className="mt-1 hidden text-[10px] font-medium text-gray-400 sm:mt-1.5 sm:block sm:text-[11px]">
                0 completed
              </span>
            </div>
          </div>

          {/* Card 5: Leads */}
          <div className="flex flex-col justify-between rounded-xl border sm:rounded-2xl border-[#FBE0E3]/80 bg-[#FCF4F5] p-2 transition hover:shadow-sm sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-rose-100/90 text-rose-500">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                Leads
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">0</p>
            </div>
          </div>

          {/* Card 6: History */}
          <div className="flex flex-col justify-between rounded-xl border sm:rounded-2xl border-[#E9EBEF]/80 bg-[#F6F7F9] p-2 transition hover:shadow-sm sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-slate-200/90 text-slate-700">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                History
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">{products.length}</p>
              <span className="mt-1 hidden text-[10px] font-medium text-gray-400 sm:mt-1.5 sm:block sm:text-[11px]">
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
                  ? "text-[#7C3AED]"
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
                  ? "text-[#7C3AED]"
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
                  ? "text-[#7C3AED]"
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
                    className="w-full rounded-xl border border-gray-200/90 bg-gray-50/50 py-2 pl-9 pr-3.5 text-xs font-medium text-gray-900 outline-none transition focus:border-purple-500 focus:bg-white"
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
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      viewMode === "list"
                        ? "bg-white text-[#7C3AED] shadow-sm"
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
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white text-[#7C3AED] shadow-sm"
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
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#7C3AED] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#6D28D9] active:scale-95 sm:px-4 cursor-pointer"
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

            {/* LIST VIEW */}
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
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95 cursor-pointer"
                          title="Share Link"
                        >
                          <Share2 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95 cursor-pointer"
                          title="Edit Product"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id, item.name)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95 cursor-pointer"
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
                        {item.category && (
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            {item.category}
                          </span>
                        )}
                        <h3 className="line-clamp-1 text-sm font-bold text-gray-900">
                          {item.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                          {offerLabel(item) ? (
                            <>
                              <span className="font-bold text-gray-900">
                                ₹{offeredPrice(item).toLocaleString("en-IN")}
                              </span>
                              <span className="text-[10px] font-medium text-gray-400 line-through">
                                ₹{item.price.toLocaleString("en-IN")}
                              </span>
                              <span className="rounded-md bg-emerald-50 px-1 py-0.2 text-[9px] font-bold text-emerald-600">
                                {offerLabel(item)}
                              </span>
                            </>
                          ) : (
                            <span>₹{item.price.toLocaleString("en-IN")}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 p-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleShare(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                        >
                          <Share2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(item.id, item.name)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: SALES ================= */}
        {activeTab === "sales" && (
          <div>
            {sales.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag size={36} className="mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-bold text-gray-700">No sales recorded yet</p>
                <p className="text-xs text-gray-400">
                  Sales will appear here automatically once customers purchase your products.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 bg-gray-50/75 text-gray-500 font-bold">
                    <tr>
                      <th className="px-4 py-3">Order No</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Buyer</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map((sale) => (
                      <tr
                        key={sale.id}
                        onClick={() => setSelectedSale(sale)}
                        className="cursor-pointer hover:bg-gray-50/50 transition"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">
                          {sale.orderNo}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {sale.productName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {sale.buyerName || "Customer"}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          ₹{sale.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              sale.status === "Paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: TIMELINE ================= */}
        {activeTab === "timeline" && (
          <div>
            {timelineGroups.length === 0 ? (
              <div className="py-12 text-center">
                <BarChart2 size={36} className="mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-bold text-gray-700">No activity yet</p>
                <p className="text-xs text-gray-400">
                  Sales and payout activities will be chronicled here over time.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {timelineGroups.map((group) => (
                  <div key={group.date}>
                    <h4 className="text-xs font-bold text-gray-400 mb-3">{group.date}</h4>
                    <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedPayout(item)}
                          className="flex items-center justify-between p-4 hover:bg-gray-50/50 cursor-pointer transition"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-900">{item.title}</p>
                            <p className="text-xs text-gray-400">{item.subtitle}</p>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {item.isCredit ? "+" : "-"}₹{item.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= ADD PRODUCT MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Add New Product</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Handmade Ceramic Cup"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="499"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="10"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Category</label>
                <select
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-purple-500"
                >
                  <option value="">Select Category</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
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

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="flex-1 rounded-xl bg-[#7C3AED] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#6D28D9] active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {savingProduct ? "Adding..." : "Add Product"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT PRODUCT MODAL ================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Product</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700">Product Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Category</label>
                <select
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-purple-500"
                >
                  <option value="">Select Category</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
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

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="flex-1 rounded-xl bg-[#7C3AED] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#6D28D9] active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {savingProduct ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SALE DETAILS MODAL ================= */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Sale Details</h3>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Order No:</span>
                <span className="font-bold text-gray-900">{selectedSale.orderNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Product:</span>
                <span className="font-bold text-gray-900">{selectedSale.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-gray-900">₹{selectedSale.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-bold text-emerald-600">{selectedSale.status}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSale(null)}
              className="mt-6 w-full rounded-xl bg-gray-100 py-2.5 text-xs font-bold text-gray-800 hover:bg-gray-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ================= PAYOUT DETAILS MODAL ================= */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Activity Details</h3>
              <button
                type="button"
                onClick={() => setSelectedPayout(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Title:</span>
                <span className="font-bold text-gray-900">{selectedPayout.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-gray-900">₹{selectedPayout.amount}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPayout(null)}
              className="mt-6 w-full rounded-xl bg-gray-100 py-2.5 text-xs font-bold text-gray-800 hover:bg-gray-200 cursor-pointer"
            >
              Close
            </button>
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
        <div className="hidden gap-6 xl:flex">
          <DashboardSidebar mode="fixed" />
          <div className="min-w-0 flex-1 space-y-6">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            {content}
          </div>
        </div>
        <div className="xl:hidden">
          <div className="space-y-5 pb-6">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

function HapAccessCard({
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
    return <p className="p-6 text-sm text-slate-500">Loading your HAP Program…</p>;
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
            className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white cursor-pointer"
          >
            Help
          </a>
          <button
            type="button"
            onClick={onApply}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 cursor-pointer"
          >
            Apply again
          </button>
        </div>
      </div>
    );
  }

  if (status === "under_review") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-purple-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Under review</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your HAP application is currently under review. The program dashboard will open fully once approved.
        </p>
        <div className="mt-5 flex gap-2">
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white cursor-pointer"
          >
            Help
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-[#7C3AED] mb-4">
        <Users className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">House Affiliate Program (HAP)</h1>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        Earn commission by referring art lovers, creators, and students to Woo Woo Art House workshops, exhibitions, and coworking spaces.
      </p>
      <button
        type="button"
        onClick={onApply}
        className="mt-5 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#6D28D9] transition cursor-pointer"
      >
        Apply for HAP Program
      </button>
    </div>
  );
}
