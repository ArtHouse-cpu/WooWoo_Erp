import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  X,
  ShoppingBag,
  Users,
  Play,
  ArrowRight,
  MessageSquare,
  Sparkles,
  IndianRupee,
  Target,
  Store,
  Package,
  Wallet,
  Clock,
  HeartHandshake,
  Award,
  Ticket,
  Gift,
  LayoutDashboard,
  Calendar,
  Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CspJoinModal } from "./CspJoinModal";
import { HapJoinModal } from "./HapJoinModal";
import { HapPublicView } from "./HapPublicView";
import { CvpJoinModal, type CvpApplication } from "./CvpJoinModal";
import { useCspApplication } from "../../hooks/useCspApplication";
import { useHapApplication } from "../../hooks/useHapApplication";
import { useMembership } from "../../context/MembershipContext";
import { useAuthStore } from "../../store/authStore";
import { rememberReturnTo } from "../../utils/returnTo";
import { cspProductApi, type CspProgramProduct } from "../../services/csp.service";
import { authApi } from "../../services/auth.service";
import type { WalletDashboard } from "../../types/auth";
import Swal from "sweetalert2";

type ProgramsBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "all" | "csp" | "hap" | "cvp";
  /** Full page at /ourprograms instead of a phone sheet. */
  asPage?: boolean;
};

type TabId = "all" | "csp" | "hap" | "cvp";

type GalleryItem = {
  id: string;
  type: "video" | "image" | "custom";
  image?: string;
  tag: string;
  badge?: string;
  title?: string;
  hasPlayButton?: boolean;
  customComponent?: () => React.ReactNode;
};

// Custom SVG illustrations for high-fidelity rendering
function CspIllustration() {
  return (
    <div className="relative h-20 w-24 sm:h-24 sm:w-28 shrink-0 flex items-center justify-center bg-transparent overflow-visible">
      {/* Easel/Art board SVG */}
      <svg
        className="w-12 h-12 text-[#EA580C] relative z-10"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 21m0 0l-.813-5.096M9 21h6m-1.813-5.096L15 21m0 0l.813-5.096M3 14.25V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v7.5A2.25 2.25 0 0118.75 16.5H5.25A2.25 2.25 0 013 14.25z"
        />
      </svg>
      {/* Tote bag overlay */}
      <div className="absolute bottom-1 right-1 w-9 h-11 bg-white border border-[#FFEDD5] rounded-lg shadow-2xs flex flex-col items-center justify-between p-1 z-20">
        <div className="w-4 h-2.5 border-2 border-slate-300 border-b-0 rounded-t-full" />
        <div className="text-[5px] text-[#EA580C] font-black leading-none">
          WOOWOO
        </div>
        <div className="text-[4px] text-slate-400 font-bold leading-none">
          ART HOUSE
        </div>
      </div>
      {/* Palette overlay */}
      <div className="absolute top-1 left-2 w-7 h-7 bg-amber-50 rounded-full border border-amber-200 shadow-3xs p-1 flex flex-wrap gap-0.5 justify-center items-center z-20">
        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
      </div>
    </div>
  );
}

function HapIllustration() {
  return (
    <div className="relative h-20 w-24 sm:h-24 sm:w-28 shrink-0 flex items-center justify-center bg-transparent overflow-visible">
      {/* Mega Phone SVG in Purple */}
      <svg
        className="w-12 h-12 text-[#7C3AED] relative z-10 transform -rotate-12"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
        />
      </svg>
      {/* Floating Coins & Profiles */}
      <div className="absolute top-0.5 right-1 bg-yellow-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black shadow-xs z-20">
        ₹
      </div>
      <div className="absolute bottom-1 right-2 bg-yellow-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-black shadow-xs z-20">
        ₹
      </div>
      {/* A small mock phone card */}
      <div className="absolute -left-1 bottom-1 w-7 h-11 bg-white border border-[#EDE9FE] rounded-md shadow-2xs rotate-12 flex flex-col justify-between p-0.5 z-0">
        <div className="h-1 w-4 bg-[#7C3AED]/20 rounded-xs mx-auto" />
        <div className="h-4 w-5 bg-[#7C3AED]/10 rounded-xs mx-auto flex items-center justify-center text-[4px] text-[#7C3AED] font-black">
          Woo
        </div>
        <div className="flex justify-around">
          <div className="w-1.5 h-1 bg-yellow-400 rounded-full" />
          <div className="w-1.5 h-1 bg-yellow-400 rounded-full" />
        </div>
      </div>
      {/* Connected user circles */}
      <div className="absolute top-0 left-6 w-5 h-5 rounded-full border border-white bg-slate-200 shadow-2xs overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=60&q=80"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute bottom-1 right-0 w-5 h-5 rounded-full border border-white bg-slate-200 shadow-2xs overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&q=80"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

function CvpIllustration() {
  return (
    <div className="relative h-20 w-24 sm:h-24 sm:w-28 shrink-0 flex items-center justify-center bg-transparent overflow-visible">
      {/* Caring hands holding heart in Emerald */}
      <svg
        className="w-12 h-12 text-[#059669] relative z-10"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      {/* Floating Volunteer ID Badge */}
      <div className="absolute -left-1 bottom-1 w-9 h-11 bg-white border border-[#D1FAE5] rounded-md shadow-2xs rotate-[-8deg] flex flex-col justify-between p-1 z-20">
        <div className="w-3 h-1 bg-emerald-500 rounded-full mx-auto" />
        <div className="w-5 h-5 rounded-full bg-emerald-100 mx-auto flex items-center justify-center text-[8px] font-black text-emerald-700">
          ★
        </div>
        <div className="text-[5px] text-[#059669] font-black text-center leading-none">
          VOLUNTEER
        </div>
      </div>
      {/* Floating Handshake & Check */}
      <div className="absolute top-0 right-2 w-6 h-6 bg-emerald-50 rounded-full border border-emerald-200 shadow-3xs flex items-center justify-center text-[10px] z-20">
        🤝
      </div>
      <div className="absolute bottom-0 right-1 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black shadow-xs z-20">
        ✓
      </div>
    </div>
  );
}

function CspStatusNotice({
  status,
  reason,
}: {
  status: "under_review" | "rejected";
  reason?: string;
}) {
  const rejected = status === "rejected";
  return (
    <div
      className={`mx-5 mb-4 rounded-2xl border px-3.5 py-3 text-left ${
        rejected
          ? "border-rose-200 bg-rose-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
          rejected ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
        }`}
      >
        {rejected ? "Rejected" : "Under Review"}
      </span>
      <p
        className={`mt-2 text-[12px] font-semibold leading-relaxed ${
          rejected ? "text-rose-700" : "text-amber-900"
        }`}
      >
        {rejected
          ? reason?.trim() || "No reason was provided."
          : "Your application is under review. Approval usually takes 24–48 hours."}
      </p>
    </div>
  );
}

function HapMemberDashboard({
  networkSize,
  profession,
  presence,
}: {
  networkSize: number | string;
  profession: string;
  presence: string;
}) {
  const size =
    Number(networkSize) > 0
      ? Number(networkSize).toLocaleString("en-IN")
      : String(networkSize || "0");
  const kpis = [
    { label: "Network Size", value: size, icon: Users, tone: "bg-[#F5F3FF] text-[#7C3AED]" },
    { label: "Total Earnings", value: "₹0", icon: IndianRupee, tone: "bg-[#FFF8F2] text-[#EA580C]" },
    { label: "Pending Payout", value: "₹0", icon: Wallet, tone: "bg-[#EFF6FF] text-[#2563EB]" },
    { label: "Referrals", value: "0", icon: Target, tone: "bg-[#F0FDF4] text-[#16A34A]" },
  ];

  return (
    <div className="space-y-4 px-5 pb-2 text-left">
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-100 bg-white p-3 shadow-xs"
            >
              <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full ${item.tone}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              </div>
              <p className="text-[15px] font-black leading-none text-slate-900">{item.value}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-500">{item.label}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-100 bg-[#FAFBFD] p-3.5">
        <h4 className="text-[13px] font-black text-slate-900">Affiliate Profile</h4>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-slate-500">Profession</p>
            <p className="truncate text-[12px] font-black text-slate-900">{profession || "—"}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-slate-500">Website / social</p>
            <p className="max-w-[60%] truncate text-right text-[12px] font-black text-slate-900">
              {presence || "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-3.5">
        <h4 className="text-[13px] font-black text-slate-900">Payout Summary</h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#EFF6FF] px-3 py-2">
            <p className="text-[10px] font-bold text-slate-500">Pending</p>
            <p className="mt-1 text-[14px] font-black text-slate-900">₹0</p>
          </div>
          <div className="rounded-xl bg-[#F0FDF4] px-3 py-2">
            <p className="text-[10px] font-bold text-slate-500">Completed</p>
            <p className="mt-1 text-[14px] font-black text-slate-900">₹0</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-3.5">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <h4 className="text-[13px] font-black text-slate-900">Recent Activity</h4>
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-500">
          No referrals or payouts yet.
        </p>
      </section>
    </div>
  );
}

function CvpMemberDashboard({
  application,
}: {
  application: CvpApplication;
}) {
  const [walletData, setWalletData] = useState<WalletDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    authApi
      .getWalletDashboard()
      .then((res) => {
        if (!cancelled && res.data?.success && res.data?.data) {
          setWalletData(res.data.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const eventsCount = application.eventCount
    ? application.eventCount.replace(/\s*events?/i, "").trim()
    : "0";

  const totalEarnings = walletData?.affiliateThisMonth?.earnings
    ? `₹${walletData.affiliateThisMonth.earnings.toLocaleString("en-IN")}`
    : "₹0";

  const totalPayout = walletData?.balances?.withdrawable
    ? `₹${walletData.balances.withdrawable.toLocaleString("en-IN")}`
    : "₹0";

  const kpis = [
    { label: "Events", value: eventsCount, icon: Calendar, tone: "bg-[#F0FDFA] text-[#0D9488]" },
    { label: "Hours", value: "0h", icon: Clock, tone: "bg-[#ECFDF5] text-[#059669]" },
    { label: "Earnings", value: totalEarnings, icon: IndianRupee, tone: "bg-[#FFF8F2] text-[#EA580C]" },
    { label: "Payout", value: totalPayout, icon: Wallet, tone: "bg-[#EFF6FF] text-[#2563EB]" },
  ];

  const availability =
    Array.isArray(application.availability) && application.availability.length > 0
      ? application.availability.join(", ")
      : "Flexible";

  return (
    <div className="space-y-4 px-5 pb-2 text-left">
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-100 bg-white p-3 shadow-xs"
            >
              <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full ${item.tone}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              </div>
              <p className="text-[15px] font-black leading-none text-slate-900">{item.value}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-500">{item.label}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-100 bg-[#FAFBFD] p-3.5">
        <h4 className="text-[13px] font-black text-slate-900">Volunteer Profile</h4>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-slate-500">Profession</p>
            <p className="truncate text-[12px] font-black text-slate-900">
              {application.profession || "Volunteer"}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-slate-500">Availability</p>
            <p className="max-w-[60%] truncate text-right text-[12px] font-black text-slate-900">
              {availability}
            </p>
          </div>
          {application.eventType && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold text-slate-500">Event Preference</p>
              <p className="max-w-[60%] truncate text-right text-[12px] font-black text-slate-900">
                {application.eventType === "Both"
                  ? "Paid & Unpaid"
                  : `${application.eventType} Events`}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-slate-500">Status</p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                application.status === "approved"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {application.status === "approved" ? "Active Volunteer" : "Under Review"}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-3.5">
        <h4 className="text-[13px] font-black text-slate-900">Payout Summary</h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#EFF6FF] px-3 py-2">
            <p className="text-[10px] font-bold text-slate-500">Pending</p>
            <p className="mt-1 text-[14px] font-black text-slate-900">
              ₹{walletData?.balances?.affiliateReserved?.toLocaleString("en-IN") || "0"}
            </p>
          </div>
          <div className="rounded-xl bg-[#F0FDF4] px-3 py-2">
            <p className="text-[10px] font-bold text-slate-500">Completed</p>
            <p className="mt-1 text-[14px] font-black text-slate-900">
              ₹{walletData?.summary?.totalAffiliateEarned?.toLocaleString("en-IN") || "0"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-3.5">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <h4 className="text-[13px] font-black text-slate-900">Recent Activity</h4>
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-500">
          No volunteer shifts or payouts yet.
        </p>
      </section>
    </div>
  );
}

function CspMemberDashboard({
  products,
  loading,
}: {
  products: CspProgramProduct[];
  loading: boolean;
}) {
  const kpis = [
    { label: "Products Sold", value: "0", icon: ShoppingBag, tone: "bg-[#F0FDF4] text-[#16A34A]" },
    { label: "Total Earnings", value: "₹0", icon: IndianRupee, tone: "bg-[#FFF8F2] text-[#EA580C]" },
    { label: "Pending Payout", value: "₹0", icon: Wallet, tone: "bg-[#EFF6FF] text-[#2563EB]" },
    { label: "Total Leads", value: "0", icon: Users, tone: "bg-[#F5F3FF] text-[#7C3AED]" },
  ];

  return (
    <div className="space-y-4 px-5 pb-2 text-left">
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-100 bg-white p-3 shadow-xs"
            >
              <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full ${item.tone}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              </div>
              <p className="text-[15px] font-black leading-none text-slate-900">{item.value}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-500">{item.label}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-100 bg-[#FAFBFD] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[13px] font-black text-slate-900">Product Performance</h4>
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black text-[#EA580C]">
            {products.length} displayed
          </span>
        </div>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">0 sales so far</p>
        {loading ? (
          <p className="mt-3 text-[12px] font-semibold text-slate-400">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="mt-3 text-[12px] font-semibold text-slate-500">
            No products displayed yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {products.slice(0, 3).map((product) => (
              <li key={product.id} className="flex items-center gap-2.5">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {product.image ? (
                    <img src={product.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="m-2.5 h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-black text-slate-900">{product.name}</p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    ₹{Number(product.price || 0).toLocaleString("en-IN")} · 0 sold
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-3.5">
        <h4 className="text-[13px] font-black text-slate-900">Payout Summary</h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#EFF6FF] px-3 py-2">
            <p className="text-[10px] font-bold text-slate-500">Pending</p>
            <p className="mt-1 text-[14px] font-black text-slate-900">₹0</p>
          </div>
          <div className="rounded-xl bg-[#F0FDF4] px-3 py-2">
            <p className="text-[10px] font-bold text-slate-500">Completed</p>
            <p className="mt-1 text-[14px] font-black text-slate-900">₹0</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-3.5">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <h4 className="text-[13px] font-black text-slate-900">Recent Activity</h4>
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-500">
          No sales, leads, or payouts yet.
        </p>
      </section>
    </div>
  );
}

export function ProgramsBottomSheet({
  isOpen,
  onClose,
  initialTab = "all",
  asPage = false,
}: ProgramsBottomSheetProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const customer = useAuthStore((state) => state.customer);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { isPremium } = useMembership();
  const { application, loaded: cspLoaded, refresh: refreshCsp } = useCspApplication();
  const { application: hapApplication, loaded: hapLoaded, refresh: refreshHap } = useHapApplication();
  const enrolled = application?.status === "approved";
  const hapApproved = hapApplication?.status === "approved";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const handleTabClick = (tab: TabId) => {
    setActiveTab(tab);
    if (asPage) {
      const path =
        tab === "all"
          ? "/program"
          : tab === "csp"
            ? "/program/csp"
            : tab === "hap"
              ? "/program/hap"
              : "/program/cvp";
      navigate(path, { replace: true });
    }
  };

  const [activeGalleryDot, setActiveGalleryDot] = useState(0);
  const galleryScrollRef = useRef<HTMLDivElement>(null);

  const handleGalleryScroll = () => {
    if (!galleryScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = galleryScrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) return;
    const progress = scrollLeft / maxScroll;
    const dotIndex = Math.min(4, Math.max(0, Math.round(progress * 4)));
    setActiveGalleryDot(dotIndex);
  };

  const scrollToGalleryDot = (idx: number) => {
    setActiveGalleryDot(idx);
    if (!galleryScrollRef.current) return;
    const { scrollWidth, clientWidth } = galleryScrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) return;
    const targetScroll = (idx / 4) * maxScroll;
    galleryScrollRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
  };
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isHapJoinOpen, setIsHapJoinOpen] = useState(false);
  const [isCvpJoinOpen, setIsCvpJoinOpen] = useState(false);
  const [cvpApplication, setCvpApplication] = useState<CvpApplication | null>(null);
  const [cvpLoaded, setCvpLoaded] = useState(false);
  const [cspProducts, setCspProducts] = useState<CspProgramProduct[]>([]);
  const [cspProductsLoading, setCspProductsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || application?.status !== "approved") return;
    let cancelled = false;
    setCspProductsLoading(true);
    cspProductApi
      .list()
      .then(({ data }) => {
        if (!cancelled) setCspProducts(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {
        if (!cancelled) setCspProducts([]);
      })
      .finally(() => {
        if (!cancelled) setCspProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, application?.status]);

  // Load CVP application from storage
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw =
        localStorage.getItem(`cvp_application_${customer?._id || "guest"}`) ||
        (customer?._id ? localStorage.getItem("cvp_application_guest") : null);
      if (raw) {
        setCvpApplication(JSON.parse(raw));
      } else {
        setCvpApplication(null);
      }
    } catch {
      setCvpApplication(null);
    } finally {
      setCvpLoaded(true);
    }
  }, [isOpen, customer?._id]);

  // Independent enrollment checks for CSP, HAP, and CVP
  const isCspJoined = Boolean(
    cspLoaded &&
      application &&
      (application.status === "approved" || application.status === "under_review")
  );

  const isHapJoined = Boolean(
    hapLoaded &&
      hapApplication &&
      (hapApplication.status === "approved" || hapApplication.status === "under_review")
  );

  const isCvpJoined = Boolean(
    cvpLoaded &&
      cvpApplication &&
      (cvpApplication.status === "approved" || cvpApplication.status === "under_review")
  );

  const isCurrentProgramJoined =
    activeTab === "csp"
      ? isCspJoined
      : activeTab === "hap"
      ? isHapJoined
      : activeTab === "cvp"
      ? isCvpJoined
      : false;

  const startJoin = (tab: "csp" | "hap" | "cvp") => {
    if (!isAuthenticated) {
      const returnTo = `/program/${tab}?join=${tab}`;
      rememberReturnTo(returnTo);
      navigate("/login", {
        state: {
          returnTo,
          from: { pathname: `/program/${tab}`, search: `?join=${tab}` },
        },
      });
      return;
    }
    if (tab === "csp") {
      if (!isPremium) {
        Swal.fire({
          icon: "info",
          title: "Premium Membership Required",
          text: "Upgrade to Premium to join CSP.",
          confirmButtonText: "OK",
          confirmButtonColor: "#4F46E5",
        });
        return;
      }
      setIsJoinModalOpen(true);
      return;
    }
    if (tab === "hap") {
      setIsHapJoinOpen(true);
      return;
    }
    setIsCvpJoinOpen(true);
  };

  useEffect(() => {
    const join = (searchParams.get("join") || "").toLowerCase();
    if (join !== "csp" && join !== "hap" && join !== "cvp") return;
    if (!isAuthenticated) return;
    const loaded = join === "csp" ? cspLoaded : join === "hap" ? hapLoaded : cvpLoaded;
    if (!loaded) return;
    const alreadyJoined =
      join === "csp" ? isCspJoined : join === "hap" ? isHapJoined : isCvpJoined;
    const next = new URLSearchParams(searchParams);
    next.delete("join");
    setSearchParams(next, { replace: true });
    if (activeTab !== join) setActiveTab(join);
    if (!alreadyJoined) startJoin(join);
    // Open once when the customer returns from login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, cspLoaded, hapLoaded, cvpLoaded, searchParams]);

  const handleOpenDashboard = (tab: "csp" | "hap" | "cvp") => {
    if (!asPage) {
      onClose();
    }
    const path =
      tab === "csp"
        ? "/program/csp/dashboard"
        : tab === "hap"
          ? "/program/hap/dashboard"
          : "/program/cvp/dashboard";
    navigate(path);
  };

  // Sync active tab with initialTab prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    setActiveGalleryDot(0);
    galleryScrollRef.current?.scrollTo({ left: 0 });
  }, [activeTab]);

  const cspGallery: GalleryItem[] = [
    {
      id: "csp-vid-1",
      type: "video",
      image:
        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80",
      tag: "VIDEO",
      title: "Creative sailors",
      hasPlayButton: true,
    },
    {
      id: "csp-img-1",
      type: "image",
      image:
        "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80",
      tag: "IMAGE",
    },
    {
      id: "csp-vid-2",
      type: "video",
      image:
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80",
      tag: "VIDEO",
      hasPlayButton: true,
    },
    {
      id: "csp-img-2",
      type: "image",
      image:
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
      tag: "IMAGE",
    },
    {
      id: "csp-img-3",
      type: "image",
      image:
        "https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?auto=format&fit=crop&w=400&q=80",
      tag: "IMAGE",
      badge: "1/8",
    },
  ];

  const cvpGallery: GalleryItem[] = [
    {
      id: "cvp-vid-1",
      type: "video",
      image:
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80",
      tag: "COMMUNITY",
      title: "Join our vibrant crew!",
      hasPlayButton: true,
    },
    {
      id: "cvp-custom-1",
      type: "custom",
      tag: "HIGHLIGHTS",
      customComponent: () => (
        <div className="relative h-full w-full bg-gradient-to-br from-[#059669] to-[#047857] p-2.5 flex flex-col justify-between text-left text-white">
          <div className="space-y-0.5">
            <p className="text-[8px] font-black uppercase tracking-wider text-emerald-200">
              Crew Benefits
            </p>
            <p className="text-[10px] font-black leading-tight text-white">
              Learn, Lead & Connect
            </p>
          </div>
          <div className="space-y-1.5 my-auto">
            <div className="flex items-center gap-1">
              <span className="text-[10px]">🎨</span>
              <span className="text-[7.5px] font-bold text-white">Curate Art Shows</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px]">🎟️</span>
              <span className="text-[7.5px] font-bold text-white">Free Event Passes</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px]">📜</span>
              <span className="text-[7.5px] font-bold text-white">Official Certificate</span>
            </div>
          </div>
          <p className="text-[7.5px] font-bold text-emerald-100 leading-snug">
            Be the heartbeat of Woo Woo!
          </p>
        </div>
      ),
    },
    {
      id: "cvp-img-1",
      type: "image",
      image:
        "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=400&q=80",
      tag: "WORKSHOPS",
      title: "Hands-on creative mentoring",
    },
    {
      id: "cvp-custom-2",
      type: "custom",
      tag: "COMMUNITY",
      customComponent: () => (
        <div className="relative h-full w-full bg-white p-2 flex flex-col justify-between text-left border border-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-[7px] font-black text-slate-800">
              Volunteer Network
            </span>
            <span className="text-[5px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.25 rounded-xs">
              Active Crew
            </span>
          </div>
          <div className="mt-0.5">
            <span className="text-[10px] font-black text-slate-900 leading-none">
              100+ Volunteers
            </span>
            <p className="text-[5px] font-bold text-slate-400 leading-none">
              Across 30+ Exhibitions & Events
            </p>
          </div>
          <div className="space-y-0.75 mt-0.5 text-[5.5px]">
            <div className="flex justify-between items-center leading-none">
              <div className="flex items-center gap-0.5 min-w-0">
                <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-500 truncate">Event Management</span>
              </div>
              <span className="font-extrabold text-slate-800">45%</span>
            </div>
            <div className="flex justify-between items-center leading-none">
              <div className="flex items-center gap-0.5 min-w-0">
                <div className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                <span className="text-slate-500 truncate">Gallery Guides</span>
              </div>
              <span className="font-extrabold text-slate-800">30%</span>
            </div>
            <div className="flex justify-between items-center leading-none">
              <div className="flex items-center gap-0.5 min-w-0">
                <div className="w-1 h-1 rounded-full bg-purple-500 shrink-0" />
                <span className="text-slate-500 truncate">Media & Content</span>
              </div>
              <span className="font-extrabold text-slate-800">25%</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "cvp-img-2",
      type: "image",
      image:
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&q=80",
      tag: "EVENTS",
      title: "Make lifelong artist friends",
    },
  ];

  return (
    <>
      <AnimatePresence>
        {(asPage || isOpen) && (
          <div className={asPage ? "min-h-dvh bg-[#F3F5F9] md:px-6 md:py-6" : "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"}>
            {asPage ? null : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            />
            )}

            <motion.div
              initial={asPage ? { opacity: 0 } : { y: "100%" }}
              animate={asPage ? { opacity: 1 } : { y: 0 }}
              exit={asPage ? { opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className={
                asPage
                  ? "relative mx-auto flex w-full max-w-5xl flex-col overflow-hidden bg-white md:rounded-[28px] md:border md:border-slate-200 md:shadow-sm"
                  : "relative z-10 flex max-h-[90dvh] h-auto w-full max-w-lg flex-col rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl overflow-hidden border-t sm:border border-slate-100"
              }
            >
              {asPage ? null : (
              <div className="flex shrink-0 justify-center py-2.5">
                <div className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
              </div>
              )}

              {/* Header Info */}
              <div className={`relative shrink-0 px-5 pb-3 flex items-center justify-between gap-3 ${asPage ? "pt-4 md:px-6 md:pt-5" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-[18px] bg-[#0A0F1D] text-amber-300 shadow-sm">
                    <Sparkles className="h-6 w-6 sm:h-6.5 sm:w-6.5 text-amber-300" strokeWidth={2.2} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[19px] sm:text-[20px] font-black tracking-tight text-[#111111] leading-tight">
                      Our Programs
                    </h3>
                    <p className="mt-0.5 text-[12.5px] font-medium text-[#6B7280]">
                      Grow, collaborate &amp; earn with us
                    </p>
                  </div>
                </div>

                {asPage || activeTab === "csp" || activeTab === "hap" || activeTab === "cvp" ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0A0F1D] px-3.5 py-2 text-[12.5px] font-extrabold text-white transition hover:bg-[#1B2438] cursor-pointer"
                  >
                    <Home className="h-4 w-4" strokeWidth={2.4} />
                    <span>Home</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB] cursor-pointer"
                    aria-label="Close sheet"
                  >
                    <X className="h-4.5 w-4.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Sleek Program Category Pills: All -> CSP -> HAP -> CVP */}
              <div className={`shrink-0 px-4 sm:px-5 mb-3 flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-none pb-0.5 ${asPage ? "md:px-6" : ""}`}>
                {/* 1. All */}
                <button
                  type="button"
                  onClick={() => handleTabClick("all")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-black transition-all duration-200 cursor-pointer shrink-0 ${
                    activeTab === "all"
                      ? "bg-[#0A0F1D] text-white border border-[#0A0F1D] shadow-[0_2px_8px_rgba(10,15,29,0.25)] ring-2 ring-indigo-500/20"
                      : "bg-[#F9FAFB] text-slate-700 border border-slate-200/90 hover:bg-slate-100"
                  }`}
                >
                  <Sparkles className={`h-4 w-4 ${activeTab === "all" ? "text-amber-400" : "text-slate-600"}`} strokeWidth={2.2} />
                  <span>All</span>
                </button>

                {/* 2. CSP */}
                <button
                  type="button"
                  onClick={() => handleTabClick("csp")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-black transition-all duration-200 cursor-pointer shrink-0 ${
                    activeTab === "csp"
                      ? "bg-[#0A0F1D] text-white border border-[#0A0F1D] shadow-[0_2px_8px_rgba(10,15,29,0.25)] ring-2 ring-indigo-500/20"
                      : "bg-[#F9FAFB] text-slate-700 border border-slate-200/90 hover:bg-slate-100"
                  }`}
                >
                  <ShoppingBag className={`h-4 w-4 ${activeTab === "csp" ? "text-amber-400" : "text-slate-600"}`} strokeWidth={2.2} />
                  <span>CSP</span>
                </button>

                {/* 3. HAP */}
                <button
                  type="button"
                  onClick={() => handleTabClick("hap")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-black transition-all duration-200 cursor-pointer shrink-0 ${
                    activeTab === "hap"
                      ? "bg-[#0A0F1D] text-white border border-[#0A0F1D] shadow-[0_2px_8px_rgba(10,15,29,0.25)] ring-2 ring-indigo-500/20"
                      : "bg-[#F9FAFB] text-slate-700 border border-slate-200/90 hover:bg-slate-100"
                  }`}
                >
                  <Users className={`h-4 w-4 ${activeTab === "hap" ? "text-amber-400" : "text-slate-600"}`} strokeWidth={2.2} />
                  <span>HAP</span>
                </button>

                {/* 4. CVP */}
                <button
                  type="button"
                  onClick={() => handleTabClick("cvp")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-black transition-all duration-200 cursor-pointer shrink-0 ${
                    activeTab === "cvp"
                      ? "bg-[#0A0F1D] text-white border border-[#0A0F1D] shadow-[0_2px_8px_rgba(10,15,29,0.25)] ring-2 ring-indigo-500/20"
                      : "bg-[#F9FAFB] text-slate-700 border border-slate-200/90 hover:bg-slate-100"
                  }`}
                >
                  <HeartHandshake className={`h-4 w-4 ${activeTab === "cvp" ? "text-amber-400" : "text-slate-600"}`} strokeWidth={2.2} />
                  <span>CVP</span>
                </button>
              </div>

              {/* Scrollable Contents - Non-rigid content-driven height */}
              <div className={`min-h-0 overflow-y-auto ${asPage && !isCurrentProgramJoined ? "flex-1" : "flex-initial"} ${activeTab === "all" || isCurrentProgramJoined ? "pb-2" : "pb-5"} [scrollbar-gutter:stable]`}>
                {activeTab === "all" ? (
                  /* ALL PROGRAMS OVERVIEW TAB */
                  <div className="space-y-3 px-4 sm:px-5 pb-1 text-left">
                    {/* Ecosystem Welcome Banner */}
                    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#0C1033] via-[#1B114F] to-[#450A7C] p-5 sm:p-6 text-white shadow-md">
                      {/* Decorative flowing wave glow in background */}
                      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-500/50 via-purple-600/30 to-transparent" />
                      <div className="absolute -bottom-8 -right-8 w-44 h-44 rounded-full bg-purple-500/30 blur-2xl pointer-events-none" />

                      <div className="relative z-10">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-[10.5px] font-black tracking-wider uppercase backdrop-blur-md border border-white/10">
                          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                          <span>WOO WOO ECOSYSTEM</span>
                        </span>
                        <h4 className="mt-2.5 sm:mt-3 text-[19px] sm:text-[22px] font-black leading-tight text-white tracking-tight">
                          3 Pathways to Create, Earn &amp; Belong
                        </h4>
                      </div>
                    </div>

                    {/* 3 Pathways Cards Row */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                      {/* Card 1: CSP */}
                      <div
                        onClick={() => handleTabClick("csp")}
                        className="relative rounded-[22px] sm:rounded-[26px] border border-[#FED7AA]/90 bg-[#FFF8F2] p-3 sm:p-4.5 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                      >
                        <span className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 rounded-full bg-[#EA580C] px-2 sm:px-2.5 py-0.5 text-[8.5px] sm:text-[10px] font-black text-white shadow-2xs whitespace-nowrap">
                          Sell Products
                        </span>
                        <div className="flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-[#FFEADB]/80 text-[#EA580C] mt-4 sm:mt-5 mb-2.5 sm:mb-3 shadow-3xs group-hover:scale-105 transition-transform">
                          <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-[#EA580C]" strokeWidth={2.2} />
                        </div>
                        <h4 className="text-[12px] sm:text-[14.5px] font-black text-slate-900 leading-tight">
                          Creative Sailor<br />Program (CSP)
                        </h4>
                        <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11.5px] font-semibold text-slate-500 leading-snug">
                          Sell products with<br />zero investment
                        </p>
                      </div>

                      {/* Card 2: HAP */}
                      <div
                        onClick={() => handleTabClick("hap")}
                        className="relative rounded-[22px] sm:rounded-[26px] border border-[#DDD6FE]/90 bg-[#F8F5FF] p-3 sm:p-4.5 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                      >
                        <span className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 rounded-full bg-[#6366F1] px-2 sm:px-2.5 py-0.5 text-[8.5px] sm:text-[10px] font-black text-white shadow-2xs whitespace-nowrap">
                          Refer &amp; Earn
                        </span>
                        <div className="flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-[#EDE9FE]/80 text-[#7C3AED] mt-4 sm:mt-5 mb-2.5 sm:mb-3 shadow-3xs group-hover:scale-105 transition-transform">
                          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-[#7C3AED]" strokeWidth={2.2} />
                        </div>
                        <h4 className="text-[12px] sm:text-[14.5px] font-black text-slate-900 leading-tight">
                          House Affiliate<br />Program (HAP)
                        </h4>
                        <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11.5px] font-semibold text-slate-500 leading-snug">
                          Earn unlimited<br />rewards &amp; payouts
                        </p>
                      </div>

                      {/* Card 3: CVP */}
                      <div
                        onClick={() => handleTabClick("cvp")}
                        className="relative rounded-[22px] sm:rounded-[26px] border border-[#BBF7D0]/90 bg-[#F2FCF5] p-3 sm:p-4.5 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                      >
                        <span className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 rounded-full bg-[#15803D] px-2 sm:px-2.5 py-0.5 text-[8.5px] sm:text-[10px] font-black text-white shadow-2xs whitespace-nowrap">
                          Volunteer
                        </span>
                        <div className="flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-[#DCFCE7]/80 text-[#16A34A] mt-4 sm:mt-5 mb-2.5 sm:mb-3 shadow-3xs group-hover:scale-105 transition-transform">
                          <HeartHandshake className="h-6 w-6 sm:h-8 sm:w-8 text-[#16A34A]" strokeWidth={2.2} />
                        </div>
                        <h4 className="text-[12px] sm:text-[14.5px] font-black text-slate-900 leading-tight">
                          Community Volunteering<br />Program (CVP)
                        </h4>
                        <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11.5px] font-semibold text-slate-500 leading-snug">
                          Get official recognition<br />&amp; event benefits
                        </p>
                      </div>
                    </div>
                  </div>
                ) : activeTab === "csp" && (enrolled || isCspJoined) ? (
                  <CspMemberDashboard products={cspProducts} loading={cspProductsLoading} />
                ) : activeTab === "hap" && (hapApproved || isHapJoined) && hapApplication && !asPage ? (
                  <HapMemberDashboard
                    networkSize={hapApplication.networkSize}
                    profession={hapApplication.profession}
                    presence={hapApplication.presence}
                  />
                ) : activeTab === "hap" ? (
                  <HapPublicView
                    asPage={asPage}
                    isJoined={isHapJoined}
                    hapApplication={hapApplication}
                    onStartJoin={() => startJoin("hap")}
                    onOpenDashboard={() => handleOpenDashboard("hap")}
                    illustrationComponent={() => <HapIllustration />}
                  />
                ) : activeTab === "cvp" && isCvpJoined && cvpApplication ? (
                  <CvpMemberDashboard application={cvpApplication} />
                ) : (
                  <>
                    {/* Status Notice for CSP */}
                    {activeTab === "csp" &&
                    (application?.status === "under_review" ||
                      application?.status === "rejected") ? (
                      <CspStatusNotice
                        status={application.status}
                        reason={application.rejectionReason}
                      />
                    ) : null}

                    {/* Status Notice for CVP (if rejected) */}
                    {activeTab === "cvp" && cvpApplication?.status === "rejected" ? (
                      <div className="mx-5 mb-4 rounded-2xl border px-3.5 py-3 text-left border-rose-200 bg-rose-50">
                        <span className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-700">
                          Application Not Approved
                        </span>
                        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-rose-700">
                          We could not approve your volunteer application at this time. Please contact our community coordinator on WhatsApp.
                        </p>
                      </div>
                    ) : null}

                    {/* Horizontal Gallery */}
                    <div
                      ref={galleryScrollRef}
                      onScroll={handleGalleryScroll}
                      className={`px-5 mb-1.5 flex gap-3 overflow-x-auto scrollbar-none py-1 snap-x snap-mandatory ${asPage ? "md:grid md:grid-cols-5 md:gap-3 md:overflow-visible md:px-6 md:snap-none" : ""}`}
                    >
                      {(activeTab === "csp" ? cspGallery : cvpGallery).map((item) => {
                        if (item.type === "custom" && item.customComponent) {
                          return (
                            <div
                              key={item.id}
                              className={`relative h-[160px] w-[110px] sm:h-[180px] sm:w-[120px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-black/[0.05] shadow-xs ${asPage ? "md:h-[210px] md:w-full" : ""}`}
                            >
                              {item.customComponent()}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={item.id}
                            className={`relative h-[160px] w-[110px] sm:h-[180px] sm:w-[120px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-black/[0.05] shadow-xs ${asPage ? "md:h-[210px] md:w-full" : ""}`}
                          >
                            <img
                              src={item.image}
                              alt={item.tag}
                              className="h-full w-full object-cover"
                            />

                            {/* Media Type Badge */}
                            <div className="absolute left-2.5 top-2.5 rounded-[5px] bg-black/60 px-1.5 py-0.5 text-[7.5px] font-black text-white tracking-wider">
                              {item.tag}
                            </div>

                            {/* Pagination or Custom Top Right Badge */}
                            {item.badge && (
                              <div className="absolute right-2.5 top-2.5 rounded-[5px] bg-black/60 px-1.5 py-0.5 text-[7.5px] font-black text-white tracking-wider">
                                {item.badge}
                              </div>
                            )}

                            {/* Play Button Overlay */}
                            {item.hasPlayButton && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/30 text-white border border-white/40 shadow-sm backdrop-blur-xs">
                                  <Play className="h-3 w-3 fill-white text-white ml-0.5" />
                                </div>
                              </div>
                            )}

                            {/* Footer text title */}
                            {item.title && (
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2.5 text-left">
                                <p className="text-[10px] font-extrabold text-white tracking-wide leading-tight">
                                  {item.title}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Dots */}
                    <div className={`flex justify-center gap-1.5 mt-2 mb-4 ${asPage ? "md:hidden" : ""}`}>
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => scrollToGalleryDot(idx)}
                          className={`h-1.5 rounded-full transition-all duration-200 ${
                            activeGalleryDot === idx
                              ? activeTab === "csp"
                                ? "bg-[#EA580C] w-3.5"
                                : "bg-[#059669] w-3.5"
                              : "bg-[#E5E7EB] w-1.5"
                          }`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>

                    {/* Statistics Grid */}
                    <div className={`grid grid-cols-3 gap-2.5 px-5 mb-4 ${asPage ? "md:gap-4 md:px-6" : ""}`}>
                      {activeTab === "csp" ? (
                        <>
                          {/* Stat 1 */}
                          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FFF8F2] border border-[#FFEDD5] text-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0EB] text-[#EA580C] mb-2">
                              <Users className="h-4.5 w-4.5" strokeWidth={2.25} />
                            </div>
                            <div className="text-[13px] font-black text-slate-900 leading-none">
                              50+
                            </div>
                            <div className="mt-1 text-[8.5px] font-extrabold text-[#7C2D12] leading-tight">
                              Creative sailors
                            </div>
                          </div>
                          {/* Stat 2 */}
                          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] text-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A] mb-2">
                              <IndianRupee className="h-4.5 w-4.5" strokeWidth={2.25} />
                            </div>
                            <div className="text-[13px] font-black text-slate-900 leading-none">
                              ₹25 Lakhs+
                            </div>
                            <div className="mt-1 text-[8.5px] font-extrabold text-[#14532D] leading-tight">
                              Revenue Gen
                            </div>
                          </div>
                          {/* Stat 3 */}
                          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] text-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB] mb-2">
                              <Target className="h-4.5 w-4.5" strokeWidth={2.25} />
                            </div>
                            <div className="text-[13px] font-black text-slate-900 leading-none">
                              5K+
                            </div>
                            <div className="mt-1 text-[8.5px] font-extrabold text-[#1E3A8A] leading-tight">
                              Customer Leads
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* CVP Stat 1 */}
                          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#ECFDF5] border border-[#D1FAE5] text-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D1FAE5] text-[#059669] mb-2">
                              <Users className="h-4.5 w-4.5" strokeWidth={2.25} />
                            </div>
                            <div className="text-[13px] font-black text-slate-900 leading-none">
                              100+
                            </div>
                            <div className="mt-1 text-[8.5px] font-extrabold text-[#065F46] leading-tight">
                              Active Crew
                            </div>
                            <div className="mt-1 text-[7.5px] font-bold text-slate-400 leading-none">
                              Passionate volunteers
                            </div>
                          </div>
                          {/* CVP Stat 2 */}
                          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] text-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB] mb-2">
                              <Ticket className="h-4.5 w-4.5" strokeWidth={2.25} />
                            </div>
                            <div className="text-[13px] font-black text-slate-900 leading-none">
                              30+
                            </div>
                            <div className="mt-1 text-[8.5px] font-extrabold text-[#1E3A8A] leading-tight">
                              Events Hosted
                            </div>
                            <div className="mt-1 text-[7.5px] font-bold text-slate-400 leading-none">
                              Exhibitions & shows
                            </div>
                          </div>
                          {/* CVP Stat 3 */}
                          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDE68A] text-[#D97706] mb-2">
                              <Award className="h-4.5 w-4.5" strokeWidth={2.25} />
                            </div>
                            <div className="text-[13px] font-black text-slate-900 leading-none">
                              100%
                            </div>
                            <div className="mt-1 text-[8.5px] font-extrabold text-[#92400E] leading-tight">
                              Certified Perks
                            </div>
                            <div className="mt-1 text-[7.5px] font-bold text-slate-400 leading-none">
                              Official recognition
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Main Detailed Info Card */}
                    <div className={`mx-5 p-4 rounded-[24px] border bg-[#FAFBFD] relative overflow-hidden text-left shadow-2xs border-slate-100 ${asPage ? "md:mx-6 md:p-5" : ""}`}>
                      {/* Info Card Content */}
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {/* Number Badge */}
                            <span
                              className={`inline-flex items-center justify-center text-[11px] font-black h-5 w-5 rounded-md leading-none ${
                                activeTab === "csp"
                                  ? "bg-[#EA580C] text-white"
                                  : "bg-[#059669] text-white"
                              }`}
                            >
                              {activeTab === "csp" ? "01" : "03"}
                            </span>
                            <h4 className="text-[15px] font-black text-slate-900 leading-none">
                              {activeTab === "csp"
                                ? "Creative Sailor Program"
                                : "Community Volunteering Program"}
                            </h4>
                          </div>

                          <p className="mt-3.5 text-[11.5px] font-bold text-slate-500 leading-relaxed max-w-[80%] md:max-w-[75%]">
                            {activeTab === "csp"
                              ? "A zero-cost opportunity for creative professionals and small businesses to sell their products directly at WOO WOO Art House."
                              : "Experience art from the inside out! Join our energetic crew of creators, curators, and event hosts at WOO WOO Art House."}
                          </p>
                        </div>

                        {/* Conditionally Render Custom Illustrations */}
                        {activeTab === "csp" ? (
                          <CspIllustration />
                        ) : (
                          <CvpIllustration />
                        )}
                      </div>

                      {/* Features Strip */}
                      <div className="border-t border-slate-100 pt-3.5 flex justify-between items-center gap-1 sm:gap-2">
                        {activeTab === "csp" ? (
                          <>
                            {/* Feature 1 */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                              <div className="h-6.5 w-6.5 sm:h-7 sm:w-7 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0">
                                <IndianRupee className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-700 leading-tight">
                                Zero Investment
                              </span>
                            </div>

                            <div className="h-5 w-[1px] bg-slate-100 shrink-0" />

                            {/* Feature 2 */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                              <div className="h-6.5 w-6.5 sm:h-7 sm:w-7 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0">
                                <Store className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-700 leading-tight">
                                Zero Rent
                              </span>
                            </div>

                            <div className="h-5 w-[1px] bg-slate-100 shrink-0" />

                            {/* Feature 3 */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                              <div className="h-6.5 w-6.5 sm:h-7 sm:w-7 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0">
                                <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-700 leading-tight">
                                Sell Direct
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Feature 1 */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                              <div className="h-6.5 w-6.5 sm:h-7 sm:w-7 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0">
                                <Award className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-700 leading-tight">
                                Official Certificate
                              </span>
                            </div>

                            <div className="h-5 w-[1px] bg-slate-100 shrink-0" />

                            {/* Feature 2 */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                              <div className="h-6.5 w-6.5 sm:h-7 sm:w-7 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0">
                                <Ticket className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-700 leading-tight">
                                Free Event Entry
                              </span>
                            </div>

                            <div className="h-5 w-[1px] bg-slate-100 shrink-0" />

                            {/* Feature 3 */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                              <div className="h-6.5 w-6.5 sm:h-7 sm:w-7 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0">
                                <Gift className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-700 leading-tight">
                                Art House Perks
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Fixed Bottom Actions */}
              <div className={`shrink-0 bg-white border-t border-slate-100 px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:p-4 flex gap-3 z-10 ${asPage ? "sticky bottom-0 md:px-6" : ""}`}>
                {isCurrentProgramJoined ? (
                  <button
                    type="button"
                    onClick={() => handleOpenDashboard(activeTab as "csp" | "hap" | "cvp")}
                    className={`w-full py-3 px-4 rounded-[16px] text-white text-[14px] font-extrabold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                      activeTab === "csp"
                        ? "bg-[#EA580C] hover:bg-[#D97706]"
                        : activeTab === "hap"
                        ? "bg-[#7C3AED] hover:bg-[#6D28D9]"
                        : "bg-[#059669] hover:bg-[#047857]"
                    }`}
                  >
                    <LayoutDashboard className="h-4.5 w-4.5" strokeWidth={2.2} />
                    <span>
                      Open {activeTab === "csp" ? "CSP" : activeTab === "hap" ? "HAP" : "CVP"} Dashboard
                    </span>
                  </button>
                ) : (
                  <>
                    {/* Query Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const text =
                          activeTab === "all"
                            ? "Hi! I would like to know more about the Programs at Woo Woo Art House."
                            : activeTab === "csp"
                            ? "Hi! I would like to know more about the Creative Sailor Program (CSP) at Woo Woo Art House."
                            : activeTab === "hap"
                            ? "Hi! I would like to know more about the House Affiliate Program (HAP) at Woo Woo Art House."
                            : "Hi! I would like to know more about the Community Volunteering Program (CVP) at Woo Woo Art House.";
                        window.open(`https://wa.me/918073988123?text=${encodeURIComponent(text)}`, "_blank");
                        if (!asPage) onClose();
                      }}
                      className={`flex-1 py-3 px-3 rounded-[16px] border text-[14px] font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        activeTab === "all"
                          ? "border-slate-800 text-slate-800 hover:bg-slate-50"
                          : activeTab === "csp"
                          ? "border-[#EA580C] text-[#EA580C] hover:bg-[#FFF8F2]"
                          : activeTab === "hap"
                          ? "border-[#7C3AED] text-[#7C3AED] hover:bg-[#F5F3FF]"
                          : "border-[#059669] text-[#059669] hover:bg-[#ECFDF5]"
                      }`}
                    >
                      <MessageSquare className="h-4.5 w-4.5" strokeWidth={2.5} />
                      <span>{activeTab === "all" ? "Query More" : "Query"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === "all") {
                          handleTabClick("csp");
                          return;
                        }
                        if (activeTab === "csp" || activeTab === "hap" || activeTab === "cvp") {
                          startJoin(activeTab);
                        }
                      }}
                      className={`flex-1 py-3 px-3 rounded-[16px] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        activeTab === "all"
                          ? "bg-slate-900 hover:bg-slate-800"
                          : activeTab === "csp"
                          ? "bg-[#EA580C] hover:bg-[#D97706]"
                          : activeTab === "hap"
                          ? "bg-[#7C3AED] hover:bg-[#6D28D9]"
                          : "bg-[#059669] hover:bg-[#047857]"
                      }`}
                    >
                      <span>{activeTab === "all" ? "Explore Programs" : "Join / Apply"}</span>
                      <ArrowRight className="h-4.5 w-4.5" strokeWidth={2.5} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CspJoinModal
        isOpen={isJoinModalOpen && activeTab === "csp"}
        onClose={() => {
          setIsJoinModalOpen(false);
          void refreshCsp();
        }}
        onSubmitted={() => {
          void refreshCsp();
          if (asPage) {
            navigate("/home");
          } else {
            onClose();
          }
        }}
      />
      <HapJoinModal
        isOpen={isHapJoinOpen}
        onClose={() => setIsHapJoinOpen(false)}
        onSubmitted={() => {
          void refreshHap();
          if (asPage) {
            navigate("/home");
          } else {
            onClose();
          }
        }}
      />
      <CvpJoinModal
        isOpen={isCvpJoinOpen}
        onClose={() => setIsCvpJoinOpen(false)}
        onSubmitted={(app) => {
          setCvpApplication(app);
          setCvpLoaded(true);
          if (asPage) {
            navigate("/home");
          } else {
            onClose();
          }
        }}
      />
    </>
  );
}
