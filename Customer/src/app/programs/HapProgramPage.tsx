import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  MoreVertical,
  Calendar,
  ChevronDown,
  ShoppingBag,
  IndianRupee,
  Wallet,
  Users,
  FileText,
  HelpCircle,
  Headset,
  Share2,
  X,
  Check,
  Search,
  Activity,
  TrendingUp,
  Copy,
  Sparkles,
  Clock3,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardSidebar } from "../../components/dashboard/DashboardSidebar";
import { HapJoinModal } from "../../components/dashboard/HapJoinModal";
import { useHapApplication } from "../../hooks/useHapApplication";
import { authApi } from "../../services/auth.service";
import type { WalletDashboard, ReferralDashboard } from "../../types/auth";

// ================= TYPES =================
export interface HapActivityItem {
  id: string;
  type: "signup" | "order" | "booking" | "membership";
  title: string;
  subtitle: string;
  userName?: string;
  date: string;
  amount?: number;
  commission?: number;
  status: "Completed" | "Pending" | "Paid";
}

export interface HapTimelineItem {
  id: string;
  type: "earning" | "payout";
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  status: "Completed" | "Pending" | "Processing";
  isCredit: boolean;
  reference?: string;
}

type TabType = "activities" | "timeline";
type ActivityCategory = "all" | "signups" | "orders" | "bookings" | "membership";
type TimelineCategory = "all" | "earnings" | "payouts";
type TimeFilter = "Today" | "This Week" | "This Month" | "Last Month" | "All Time";

export default function HapProgramPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("activities");
  const [activityCategory, setActivityCategory] = useState<ActivityCategory>("all");
  const [timelineCategory, setTimelineCategory] = useState<TimelineCategory>("all");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("This Month");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const { application, loaded, refresh } = useHapApplication();

  const [walletData, setWalletData] = useState<WalletDashboard | null>(null);
  const [referralData, setReferralData] = useState<ReferralDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wRes, rRes] = await Promise.allSettled([
          authApi.getWalletDashboard(),
          authApi.getReferralDashboard(),
        ]);
        if (!cancelled) {
          if (wRes.status === "fulfilled" && wRes.value.data.success) {
            setWalletData(wRes.value.data.data || null);
          }
          if (rRes.status === "fulfilled" && rRes.value.data.success) {
            setReferralData(rRes.value.data.data || null);
          }
        }
      } catch {
        // Fallback gracefully
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const timeOptions: TimeFilter[] = [
    "Today",
    "This Week",
    "This Month",
    "Last Month",
    "All Time",
  ];

  const referralCode = referralData?.referralCode || "WOOWOO10";
  const referralLink = referralData?.shareUrl || `https://woowoo.in?ref=${referralCode}`;
  const referralLinkDisplay = referralLink.replace(/^https?:\/\//, "");
  const hapBalance = walletData?.balances?.affiliateBalance ?? walletData?.summary?.totalAffiliateEarned ?? 0;
  const withdrawableBalance = walletData?.balances?.withdrawable ?? 0;

  const copyToClipboard = async (text: string, type: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "code") {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
        toast.success("Referral code copied!");
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        toast.success("Referral link copied!");
      }
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleShareLink = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join WooWoo Art House (10% OFF)",
          text: `Use my referral code ${referralCode} to get 10% OFF at WooWoo Art House!`,
          url,
        });
      } catch {
        // Ignored if cancelled
      }
    } else {
      void copyToClipboard(url, "link");
    }
  };

  // Derive Activities list from real referralData and walletData (with starter items if none yet)
  const allActivities = useMemo<HapActivityItem[]>(() => {
    const list: HapActivityItem[] = [];

    // From referral signups
    if (referralData?.recentReferrals && referralData.recentReferrals.length > 0) {
      referralData.recentReferrals.forEach((item, idx) => {
        list.push({
          id: item.id || `ref-${idx}`,
          type: "signup",
          title: `${item.name || "Referred Customer"} joined via referral`,
          subtitle: `Used code ${referralCode} · Welcome bonus credited`,
          userName: item.name || "Customer",
          date: item.joinedAt || "Recently",
          commission: item.totalEarned || item.pendingEarnings || 50,
          status: item.status === "pending" ? "Pending" : "Completed",
        });
      });
    }

    // From wallet affiliate transactions
    if (walletData?.transactions && walletData.transactions.length > 0) {
      walletData.transactions
        .filter((tx) => tx.type === "credit")
        .forEach((tx) => {
          const tLower = (tx.title || "").toLowerCase();
          const catLower = (tx.category || "").toLowerCase();
          let type: HapActivityItem["type"] = "order";
          if (tLower.includes("book") || catLower.includes("space") || catLower.includes("desk")) {
            type = "booking";
          } else if (tLower.includes("member") || catLower.includes("member")) {
            type = "membership";
          } else if (tLower.includes("invite") || tLower.includes("signup") || catLower.includes("invite")) {
            type = "signup";
          }

          list.push({
            id: tx.id,
            type,
            title: tx.title || "Affiliate Commission",
            subtitle: `${type.charAt(0).toUpperCase() + type.slice(1)} commission credited`,
            date: tx.createdAt || "Recently",
            amount: tx.amount ? tx.amount * 10 : undefined,
            commission: tx.amount,
            status: tx.status === "pending" ? "Pending" : "Paid",
          });
        });
    }

    if (list.length === 0) {
      return [
        {
          id: "act-1",
          type: "signup",
          title: "Aarav Patel signed up",
          subtitle: `Joined using your referral code ${referralCode}`,
          userName: "Aarav Patel",
          date: "Today, 2:45 PM",
          commission: 50,
          status: "Completed",
        },
        {
          id: "act-2",
          type: "order",
          title: "Store Order · Acrylic Paint Set 24pcs",
          subtitle: "Customer redeemed your 10% OFF coupon",
          userName: "Sneha Roy",
          date: "Yesterday, 6:10 PM",
          amount: 1450,
          commission: 145,
          status: "Paid",
        },
        {
          id: "act-3",
          type: "booking",
          title: "Space Booking · Flexi Desk 4h",
          subtitle: "Studio booking completed at WooWoo",
          userName: "Rohan Mehta",
          date: "17 Nov 2026",
          amount: 799,
          commission: 80,
          status: "Paid",
        },
        {
          id: "act-4",
          type: "membership",
          title: "Membership · Studio Pass Monthly",
          subtitle: "Referred member subscribed to Studio Pass",
          userName: "Pooja Hegde",
          date: "15 Nov 2026",
          amount: 2499,
          commission: 250,
          status: "Completed",
        },
      ];
    }

    return list;
  }, [referralData, walletData, referralCode]);

  // Filtered activities by category & search
  const filteredActivities = useMemo(() => {
    return allActivities.filter((item) => {
      if (activityCategory !== "all") {
        const catKey = activityCategory.endsWith("s") ? activityCategory.slice(0, -1) : activityCategory;
        if (item.type !== catKey) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          (item.userName && item.userName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allActivities, activityCategory, searchQuery]);

  // Derive Timeline list
  const allTimeline = useMemo<HapTimelineItem[]>(() => {
    const list: HapTimelineItem[] = [];

    if (walletData?.transactions && walletData.transactions.length > 0) {
      walletData.transactions.forEach((tx) => {
        const isCredit = tx.type === "credit";
        list.push({
          id: tx.id,
          type: isCredit ? "earning" : "payout",
          title: tx.title || (isCredit ? "Commission Credited" : "Payout Withdrawal"),
          subtitle: `${tx.kind === "withdrawal" ? "Bank Transfer" : "Affiliate Commission"} · ${tx.category || "General"}`,
          date: tx.createdAt || "Recently",
          amount: Number(tx.amount) || 0,
          isCredit,
          status: tx.status === "pending" ? "Pending" : tx.status === "processing" ? "Processing" : "Completed",
          reference: tx.id ? `#${tx.id.slice(-8).toUpperCase()}` : undefined,
        });
      });
    }

    if (list.length === 0) {
      return [
        {
          id: "tl-1",
          type: "earning",
          title: "Commission Credited · Space Booking",
          subtitle: "Order ref #BK-8291 · 10% commission",
          date: "Today, 3:15 PM",
          amount: 80,
          isCredit: true,
          status: "Completed",
          reference: "TXN-8492048",
        },
        {
          id: "tl-2",
          type: "payout",
          title: "Payout Transferred to Bank Account",
          subtitle: "Direct IMPS Bank Transfer",
          date: "18 Nov 2026, 11:30 AM",
          amount: 1500,
          isCredit: false,
          status: "Completed",
          reference: "UTR-HDFC0001928492",
        },
        {
          id: "tl-3",
          type: "earning",
          title: "Referral Signup Bonus",
          subtitle: "Friend account verification bonus",
          date: "15 Nov 2026, 6:20 PM",
          amount: 50,
          isCredit: true,
          status: "Completed",
          reference: "TXN-7291047",
        },
        {
          id: "tl-4",
          type: "earning",
          title: "Commission Credited · Art Store Order",
          subtitle: "Order ref #ORD-3019",
          date: "14 Nov 2026, 1:10 PM",
          amount: 145,
          isCredit: true,
          status: "Completed",
          reference: "TXN-6192834",
        },
      ];
    }

    return list;
  }, [walletData]);

  // Filtered timeline by category
  const filteredTimeline = useMemo(() => {
    return allTimeline.filter((item) => {
      if (timelineCategory === "earnings" && !item.isCredit) return false;
      if (timelineCategory === "payouts" && item.isCredit) return false;
      return true;
    });
  }, [allTimeline, timelineCategory]);

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
        <div className="mx-auto max-w-[1440px] p-2.5 sm:p-4 md:p-6">
          <div className="hidden gap-6 xl:flex">
            <DashboardSidebar mode="fixed" />
            <div className="min-w-0 flex-1 space-y-6">
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
            <div className="pb-6">
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
      <div className="overflow-hidden rounded-[24px] border border-black/[0.04] bg-white p-3.5 sm:p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        
        {/* ================= HEADER ================= */}
        <div className="mb-5 sm:mb-6 flex items-center justify-between gap-1.5 sm:gap-3 border-b border-gray-100 pb-4 sm:pb-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/ourprograms?tab=hap')}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
              aria-label="Go back to HAP Programs"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-[#111111]" strokeWidth={2.5} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h1 className="truncate text-base sm:text-2xl md:text-3xl font-black tracking-tight text-[#0f172a]">
                  HAP Program
                </h1>
                {/* 3 diagonal purple spark accent dashes */}
                <svg
                  className="h-3.5 w-3.5 sm:h-5 sm:w-5 -mt-1 shrink-0 text-[#7C3AED]"
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

              <p className="truncate text-[10px] sm:text-xs font-semibold text-[#94a3b8]">
                House Affiliate Program
              </p>
            </div>
          </div>

          {/* Right Controls: Filter + More */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen((v) => !v)}
                className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-gray-200/90 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-[10.5px] sm:text-xs font-bold text-gray-700 shadow-xs transition hover:bg-gray-50 cursor-pointer shrink-0"
              >
                <Calendar size={13} className="text-gray-500 shrink-0" />
                <span className="truncate max-w-[55px] sm:max-w-none">{timeFilter}</span>
                <ChevronDown size={13} className="text-gray-400 shrink-0" />
              </button>

              {filterDropdownOpen && (
                <div className="absolute right-0 top-10 sm:top-11 z-30 w-36 sm:w-40 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  {timeOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setTimeFilter(opt);
                        setFilterDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium transition cursor-pointer ${
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
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-gray-200/90 bg-white text-gray-600 shadow-xs transition hover:bg-gray-50 cursor-pointer shrink-0"
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

        {/* ================= 6 STAT CARDS (HAP PROGRAM KPIS) ================= */}
        {(() => {
          const referralsCount =
            walletData?.affiliateThisMonth?.referrals ??
            referralData?.stats?.totalReferrals ??
            0;

          const activityCount =
            walletData?.affiliateThisMonth?.transactionCount ??
            referralData?.stats?.totalTransactions ??
            allActivities.length;

          const conversionPct =
            walletData?.affiliateThisMonth?.conversionRate ??
            (referralsCount > 0
              ? Math.round((activityCount / referralsCount) * 100)
              : 0);

          const revenueAmount =
            walletData?.affiliateThisMonth?.revenue ??
            allActivities.reduce((sum, a) => sum + (a.amount || 0), 0);

          const earningsAmount =
            walletData?.affiliateThisMonth?.earnings ??
            referralData?.stats?.totalEarned ??
            allActivities.reduce((sum, a) => sum + (a.commission || 0), 0);

          const payoutsAmount =
            walletData?.balances?.withdrawable ??
            allTimeline.filter((t) => !t.isCredit).reduce((sum, t) => sum + t.amount, 0);

          return (
            <div className="mb-5 grid grid-cols-3 gap-1.5 sm:mb-8 sm:gap-4 lg:grid-cols-6">
              {/* Card 1: Referals */}
              <div className="flex flex-col justify-between rounded-xl border sm:rounded-2xl border-[#E0E7FF]/80 bg-[#F5F7FF] p-2 transition hover:shadow-sm sm:p-3.5">
                <div className="flex items-start gap-1 sm:gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-indigo-100/90 text-indigo-600">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
                  </div>
                  <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                    Referals
                  </span>
                </div>
                <div className="mt-1.5 sm:mt-3">
                  <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">
                    {referralsCount}
                  </p>
                </div>
              </div>

              {/* Card 2: Activity Count */}
              <div className="flex flex-col justify-between rounded-xl border sm:rounded-2xl border-[#EDE9FE]/80 bg-[#FAF8FF] p-2 transition hover:shadow-sm sm:p-3.5">
                <div className="flex items-start gap-1 sm:gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-purple-100/90 text-[#7C3AED]">
                    <Activity className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
                  </div>
                  <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                    Activity Count
                  </span>
                </div>
                <div className="mt-1.5 sm:mt-3">
                  <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">
                    {activityCount}
                  </p>
                </div>
              </div>

              {/* Card 3: Conversion% */}
              <div className="flex flex-col justify-between rounded-xl border sm:rounded-2xl border-[#E1F4E7]/80 bg-[#F3FAF5] p-2 transition hover:shadow-sm sm:p-3.5">
                <div className="flex items-start gap-1 sm:gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-emerald-100/90 text-emerald-600">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
                  </div>
                  <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                    Conversion%
                  </span>
                </div>
                <div className="mt-1.5 sm:mt-3">
                  <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">
                    {conversionPct}%
                  </p>
                </div>
              </div>

              {/* Card 4: Revenue */}
              <div className="flex flex-col justify-between rounded-xl border sm:rounded-2xl border-[#FFEADA]/80 bg-[#FFF9F5] p-2 transition hover:shadow-sm sm:p-3.5">
                <div className="flex items-start gap-1 sm:gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-orange-100/90 text-orange-600">
                    <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
                  </div>
                  <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                    Revenue
                  </span>
                </div>
                <div className="mt-1.5 sm:mt-3">
                  <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">
                    ₹{revenueAmount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Card 5: Earnings */}
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
                    ₹{earningsAmount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Card 6: payouts */}
              <div className="flex flex-col justify-between rounded-xl border border-[#E2EEFB]/80 bg-[#F4F8FC] p-2 sm:rounded-2xl sm:p-3.5 transition hover:shadow-sm">
                <div className="flex items-start gap-1 sm:gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-xl bg-blue-100/90 text-blue-600">
                    <Wallet className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
                  </div>
                  <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                    payouts
                  </span>
                </div>
                <div className="mt-1.5 sm:mt-3">
                  <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">
                    ₹{payoutsAmount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ================= REFERRAL CODE (10% OFF) | LINK | HAP BALANCE ================= */}
        <div className="mb-5 flex flex-col gap-2 sm:gap-2.5">
          {/* Card 1: Referral Code */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-amber-200/90 bg-white px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Referral Code
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 shadow-2xs">
                  <Sparkles size={10} className="text-amber-600" />
                  10% OFF
                </span>
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg sm:rounded-xl border border-dashed border-amber-300/90 bg-white px-3 py-1.5">
                <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-slate-900 select-all">
                  {referralCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(referralCode, "code")}
                  className="flex items-center gap-1 rounded-lg bg-orange-500 hover:bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                  title="Copy referral code"
                >
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
            <p className="mt-1.5 text-[10px] sm:text-[11px] text-slate-500 font-medium">
              Give friends 10% OFF on all activities, passes & orders.
            </p>
          </div>

          {/* Card 2: Link */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-blue-200/90 bg-white px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Referral Link
                </span>
                <button
                  type="button"
                  onClick={() => handleShareLink(referralLink)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Share2 size={12} />
                  <span>Share</span>
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg sm:rounded-xl border border-dashed border-blue-300/90 bg-white px-3 py-1.5">
                <span className="truncate text-[11px] sm:text-xs font-semibold text-slate-700 select-all max-w-[220px] sm:max-w-md">
                  {referralLinkDisplay}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(referralLink, "link")}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                  title="Copy referral link"
                >
                  {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
            <p className="mt-1.5 text-[10px] sm:text-[11px] text-slate-500 font-medium">
              Direct invite link with auto-applied discount for signups.
            </p>
          </div>

          {/* Card 3: HAP Balance */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-emerald-200/90 bg-white px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  HAP Balance
                </span>
                <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                  <Wallet size={13} />
                </div>
              </div>

              <div className="mt-1.5">
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                  ₹{hapBalance.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-[10px] sm:text-[11px] font-bold text-emerald-600">
                  Withdrawable: ₹{withdrawableBalance.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-emerald-100/90 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-medium">
              <span>Commission credited to wallet</span>
              <span className="font-bold text-emerald-600">Active</span>
            </div>
          </div>
        </div>

        {/* ================= HORIZONTAL TABS (ACTIVITIES | TIMELINE) ================= */}
        <div className="mb-5 border-b border-gray-100 pb-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-6 sm:gap-10 min-w-max whitespace-nowrap">
            {/* Tab 1: Activities */}
            <button
              type="button"
              onClick={() => setActiveTab("activities")}
              className={`flex shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap transition cursor-pointer pb-1 ${
                activeTab === "activities"
                  ? "text-[#7C3AED] border-b-2 border-[#7C3AED]"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Activity size={18} strokeWidth={activeTab === "activities" ? 2.5 : 2} className="shrink-0" />
              <span>Activities</span>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]">
                {allActivities.length}
              </span>
            </button>

            {/* Tab 2: Timeline */}
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`flex shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap transition cursor-pointer pb-1 ${
                activeTab === "timeline"
                  ? "text-[#7C3AED] border-b-2 border-[#7C3AED]"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Clock3 size={18} strokeWidth={activeTab === "timeline" ? 2.5 : 2} className="shrink-0" />
              <span>Timeline</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {allTimeline.length}
              </span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: ACTIVITIES (Signups, orders, bookings, membership) ================= */}
        {activeTab === "activities" && (
          <div className="space-y-4">
            {/* Sub-category Filter Buttons + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: "all", label: "All", count: allActivities.length },
                  {
                    id: "signups",
                    label: "Signups",
                    count: allActivities.filter((a) => a.type === "signup").length,
                  },
                  {
                    id: "orders",
                    label: "Orders",
                    count: allActivities.filter((a) => a.type === "order").length,
                  },
                  {
                    id: "bookings",
                    label: "Bookings",
                    count: allActivities.filter((a) => a.type === "booking").length,
                  },
                  {
                    id: "membership",
                    label: "Membership",
                    count: allActivities.filter((a) => a.type === "membership").length,
                  },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActivityCategory(cat.id as ActivityCategory)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      activityCategory === cat.id
                        ? "bg-[#7C3AED] text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        activityCategory === cat.id
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activities..."
                  className="w-full rounded-xl border border-gray-200/90 bg-gray-50/60 py-1.5 pl-8.5 pr-7 text-xs font-medium text-gray-900 outline-none transition focus:border-purple-500 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Activities List */}
            {filteredActivities.length === 0 ? (
              <div className="rounded-2xl border border-gray-200/80 bg-white py-12 text-center shadow-xs">
                <Activity size={36} className="mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-bold text-gray-800">No activities found</p>
                <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto">
                  When customers use your referral code or link for signups, orders, bookings, or memberships, they will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
                {filteredActivities.map((act) => {
                  const isSignup = act.type === "signup";
                  const isOrder = act.type === "order";
                  const isBooking = act.type === "booking";

                  const badgeColor = isSignup
                    ? "bg-blue-50 text-blue-700 border-blue-100"
                    : isOrder
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : isBooking
                    ? "bg-purple-50 text-purple-700 border-purple-100"
                    : "bg-amber-50 text-amber-700 border-amber-100";

                  const IconComp = isSignup
                    ? UserCheck
                    : isOrder
                    ? ShoppingBag
                    : isBooking
                    ? Calendar
                    : Sparkles;

                  return (
                    <div
                      key={act.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-gray-50/60 transition"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${badgeColor}`}
                        >
                          <IconComp size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                              {act.title}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                act.status === "Completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : act.status === "Paid"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {act.status}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate mt-0.5">
                            {act.subtitle}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                            {act.userName && (
                              <span className="font-semibold text-gray-700">
                                {act.userName}
                              </span>
                            )}
                            {act.userName && <span>•</span>}
                            <span>{act.date}</span>
                            {act.amount !== undefined && (
                              <>
                                <span>•</span>
                                <span>Gross: ₹{act.amount.toLocaleString("en-IN")}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {act.commission !== undefined && (
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-gray-100 pt-2 sm:pt-0 shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Earnings
                          </span>
                          <span className="text-sm font-black text-emerald-600">
                            +₹{act.commission.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: TIMELINE (earnings & payouts) ================= */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            {/* Sub-category Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "all", label: "All Activity", count: allTimeline.length },
                {
                  id: "earnings",
                  label: "Earnings Only",
                  count: allTimeline.filter((t) => t.isCredit).length,
                },
                {
                  id: "payouts",
                  label: "Payouts Only",
                  count: allTimeline.filter((t) => !t.isCredit).length,
                },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setTimelineCategory(cat.id as TimelineCategory)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    timelineCategory === cat.id
                      ? "bg-[#7C3AED] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      timelineCategory === cat.id
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Timeline List */}
            {filteredTimeline.length === 0 ? (
              <div className="rounded-2xl border border-gray-200/80 bg-white py-12 text-center shadow-xs">
                <Clock3 size={36} className="mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-bold text-gray-800">No timeline entries found</p>
                <p className="mt-1 text-xs text-gray-400">
                  Affiliate earnings and payout transactions will be chronicled here over time.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
                {filteredTimeline.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-gray-50/60 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          item.isCredit
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-blue-50 text-blue-600 border-blue-100"
                        }`}
                      >
                        {item.isCredit ? <TrendingUp size={18} /> : <CreditCard size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                            {item.title}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              item.status === "Completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "Processing"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-medium">
                          <span className="truncate">{item.subtitle}</span>
                          {item.reference && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-gray-400">{item.reference}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-gray-400">{item.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm sm:text-base font-black ${
                          item.isCredit ? "text-emerald-600" : "text-slate-900"
                        }`}
                      >
                        {item.isCredit ? "+" : "-"}₹{item.amount.toLocaleString("en-IN")}
                      </p>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {item.isCredit ? "Earning" : "Payout"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardSidebar
        mode="drawer"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="mx-auto max-w-[1440px] p-2.5 sm:p-4 md:p-6">
        <div className="hidden gap-6 xl:flex">
          <DashboardSidebar mode="fixed" />
          <div className="min-w-0 flex-1 space-y-6">
            {content}
          </div>
        </div>
        <div className="xl:hidden">
          <div className="pb-6">
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
