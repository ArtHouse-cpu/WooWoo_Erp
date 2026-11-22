import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Calendar,
  ChevronDown,
  Check,
  MoreVertical,
  HelpCircle,
  Headset,
  FileText,
  Clock,
  Heart,
  CheckCircle2,
  MessageCircle,
  BookOpen,
  IndianRupee,
  Wallet,
  TrendingUp,
  CreditCard,
  Search,
  X,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardSidebar } from "../../components/dashboard/DashboardSidebar";
import { CvpJoinModal } from "../../components/dashboard/CvpJoinModal";
import { useCvpApplication } from "../../hooks/useCvpApplication";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../services/auth.service";
import type { WalletDashboard } from "../../types/auth";

// ================= TYPES =================
export interface CvpEventEntry {
  id: string;
  eventName: string;
  date: string;
  timeSlot?: string;
  hours: number;
  role: string;
  stipend?: number;
  verifiedBy: string;
  category?: "Workshop" | "Exhibition" | "Studio Jam" | "Flea Market" | "Community";
  status: "Completed" | "Verified" | "Upcoming" | "Pending Review";
}

export interface CvpTimelineItem {
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

type TabType = "events" | "timeline" | "guidelines";
type EventFilter = "all" | "completed" | "upcoming" | "workshops";
type TimelineFilter = "all" | "earnings" | "payouts";

const INITIAL_EVENTS: CvpEventEntry[] = [
  {
    id: "evt-1",
    eventName: "Mini Terrarium Workshop Assist",
    date: "14 Nov 2026",
    timeSlot: "Morning (9:30 AM – 1:00 PM)",
    hours: 3.5,
    role: "Material Coordinator",
    stipend: 450,
    verifiedBy: "Studio Mentor (Priya)",
    category: "Workshop",
    status: "Verified",
  },
  {
    id: "evt-2",
    eventName: "Diwali Art House Flea & Exhibition",
    date: "08 Nov 2026",
    timeSlot: "Full Shift (12:00 PM – 5:00 PM)",
    hours: 5.0,
    role: "Front Desk & Guest Welcome",
    stipend: 650,
    verifiedBy: "Community Lead (Karan)",
    category: "Exhibition",
    status: "Verified",
  },
  {
    id: "evt-3",
    eventName: "Weekend Pottery & Clay Studio Jam",
    date: "02 Nov 2026",
    timeSlot: "Afternoon (2:00 PM – 6:00 PM)",
    hours: 4.0,
    role: "Studio Prep & Glaze Assistant",
    stipend: 500,
    verifiedBy: "Pottery Master (Dev)",
    category: "Studio Jam",
    status: "Completed",
  },
  {
    id: "evt-4",
    eventName: "Children's Watercolor & Origami Camp",
    date: "25 Oct 2026",
    timeSlot: "Morning (10:00 AM – 2:00 PM)",
    hours: 4.0,
    role: "Child Safety & Activity Helper",
    stipend: 500,
    verifiedBy: "Lead Instructor (Ananya)",
    category: "Community",
    status: "Verified",
  },
  {
    id: "evt-5",
    eventName: "Live Acoustic Night & Canvas Showcase",
    date: "28 Nov 2026",
    timeSlot: "Evening (6:00 PM – 10:00 PM)",
    hours: 4.0,
    role: "Stage Setup & Registration Desk",
    stipend: 550,
    verifiedBy: "Studio Coordinator",
    category: "Exhibition",
    status: "Upcoming",
  },
];

const INITIAL_TIMELINE: CvpTimelineItem[] = [
  {
    id: "tl-cvp-1",
    type: "earning",
    title: "Volunteer Stipend · Mini Terrarium Workshop",
    subtitle: "Shift ref #CVP-4019 · 3.5 hrs verified",
    date: "14 Nov 2026, 2:30 PM",
    amount: 450,
    isCredit: true,
    status: "Completed",
    reference: "TXN-902814",
  },
  {
    id: "tl-cvp-2",
    type: "payout",
    title: "Stipend Disbursed to Bank Account",
    subtitle: "Direct IMPS Bank Transfer",
    date: "10 Nov 2026, 11:45 AM",
    amount: 1150,
    isCredit: false,
    status: "Completed",
    reference: "UTR-HDFC8890231",
  },
  {
    id: "tl-cvp-3",
    type: "earning",
    title: "Volunteer Stipend · Diwali Art Flea",
    subtitle: "Shift ref #CVP-3910 · 5.0 hrs verified",
    date: "08 Nov 2026, 6:15 PM",
    amount: 650,
    isCredit: true,
    status: "Completed",
    reference: "TXN-884102",
  },
  {
    id: "tl-cvp-4",
    type: "earning",
    title: "Volunteer Stipend · Pottery Studio Jam",
    subtitle: "Shift ref #CVP-3801 · 4.0 hrs verified",
    date: "02 Nov 2026, 7:00 PM",
    amount: 500,
    isCredit: true,
    status: "Completed",
    reference: "TXN-869201",
  },
  {
    id: "tl-cvp-5",
    type: "payout",
    title: "Stipend Disbursed to UPI / Bank Account",
    subtitle: "UPI Payout Transfer",
    date: "28 Oct 2026, 4:20 PM",
    amount: 500,
    isCredit: false,
    status: "Completed",
    reference: "UPI-40928172910",
  },
];

export default function CvpProgramPage() {
  const navigate = useNavigate();
  const customer = useAuthStore((state) => state.customer);
  const { application, loaded, refresh, setApplication } = useCvpApplication();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("Lifetime");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("events");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogModal, setShowLogModal] = useState(false);

  const [events, setEvents] = useState<CvpEventEntry[]>(INITIAL_EVENTS);
  const [timeline, setTimeline] = useState<CvpTimelineItem[]>(INITIAL_TIMELINE);
  const [walletData, setWalletData] = useState<WalletDashboard | null>(null);

  // Form for logging hours
  const [newLogEvent, setNewLogEvent] = useState("");
  const [newLogDate, setNewLogDate] = useState("");
  const [newLogHours, setNewLogHours] = useState("3");
  const [newLogRole, setNewLogRole] = useState("");
  const [newLogStipend, setNewLogStipend] = useState("");

  const timeOptions = ["Lifetime", "Today", "This Week", "This Month", "This Year"];

  const helpWhatsApp = `https://wa.me/918073988123?text=${encodeURIComponent(
    application?.status === "rejected"
      ? "Hi, my CVP volunteer application was not approved. Please guide me."
      : "Hi, I need assistance with the Community Volunteering Program (CVP) at Woo Woo Art House."
  )}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authApi.getWalletDashboard();
        if (!cancelled && res.data.success && res.data.data) {
          setWalletData(res.data.data);
        }
      } catch {
        // Fallback gracefully
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Aggregates for the 4 KPIs
  const totalEvents = events.filter((e) => e.status !== "Pending Review").length;
  const totalHours = events.reduce((sum, e) => sum + (e.hours || 0), 0);
  const totalEarnings =
    walletData?.affiliateThisMonth?.earnings ??
    timeline.filter((t) => t.isCredit).reduce((sum, t) => sum + t.amount, 0);
  const totalPayouts =
    walletData?.balances?.withdrawable ??
    timeline.filter((t) => !t.isCredit).reduce((sum, t) => sum + t.amount, 0);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (eventFilter === "completed" && e.status !== "Completed" && e.status !== "Verified") return false;
      if (eventFilter === "upcoming" && e.status !== "Upcoming") return false;
      if (eventFilter === "workshops" && e.category !== "Workshop") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.eventName.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q) ||
          e.verifiedBy.toLowerCase().includes(q) ||
          (e.category && e.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [events, eventFilter, searchQuery]);

  // Filtered Timeline
  const filteredTimeline = useMemo(() => {
    return timeline.filter((t) => {
      if (timelineFilter === "earnings" && !t.isCredit) return false;
      if (timelineFilter === "payouts" && t.isCredit) return false;
      return true;
    });
  }, [timeline, timelineFilter]);

  // Submit manual log entry
  const handleSubmitHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogEvent || !newLogDate || !newLogHours) {
      toast.error("Please fill in event name, date and hours.");
      return;
    }
    const hrs = Number(newLogHours) || 1;
    const stp = Number(newLogStipend) || 0;
    const newEntry: CvpEventEntry = {
      id: `log-${Date.now()}`,
      eventName: newLogEvent,
      date: newLogDate,
      hours: hrs,
      role: newLogRole || "Volunteer",
      stipend: stp > 0 ? stp : undefined,
      verifiedBy: "Pending Coordinator Review",
      category: "Workshop",
      status: "Pending Review",
    };
    setEvents((prev) => [newEntry, ...prev]);
    if (stp > 0) {
      setTimeline((prev) => [
        {
          id: `tl-${Date.now()}`,
          type: "earning",
          title: `Stipend Claim · ${newLogEvent}`,
          subtitle: `Manual log · ${hrs} hrs submitted for review`,
          date: "Just now",
          amount: stp,
          isCredit: true,
          status: "Pending",
          reference: `LOG-${Date.now().toString().slice(-6)}`,
        },
        ...prev,
      ]);
    }
    toast.success("Hours logged! Submitted to studio coordinator for review.");
    setShowLogModal(false);
    setNewLogEvent("");
    setNewLogDate("");
    setNewLogHours("3");
    setNewLogRole("");
    setNewLogStipend("");
  };

  // Unapproved or unsubmitted states
  if (!loaded || (!application && !customer?._id)) {
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
              <CvpAccessCard
                loaded={loaded}
                status={application?.status}
                helpUrl={helpWhatsApp}
                onApply={() => setApplyOpen(true)}
              />
            </div>
          </div>
          <div className="xl:hidden">
            <div className="pb-6">
              <CvpAccessCard
                loaded={loaded}
                status={application?.status}
                helpUrl={helpWhatsApp}
                onApply={() => setApplyOpen(true)}
              />
            </div>
          </div>
        </div>
        <CvpJoinModal
          isOpen={applyOpen}
          onClose={() => {
            setApplyOpen(false);
            refresh();
          }}
          onSubmitted={(app) => {
            setApplication(app);
            setApplyOpen(false);
            refresh();
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
              onClick={() => navigate('/ourprograms?tab=cvp')}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
              aria-label="Go back to CVP Programs"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-[#111111]" strokeWidth={2.5} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base sm:text-2xl md:text-3xl font-black tracking-tight text-[#0f172a]">
                  CVP Program
                </h1>
                {/* 3 diagonal emerald spark dashes */}
                <svg
                  className="h-3.5 w-3.5 sm:h-5 sm:w-5 -mt-1 shrink-0 text-[#059669]"
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
                Community Volunteering Program
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
                          ? "bg-emerald-50 text-emerald-700 font-bold"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {opt}
                      {timeFilter === opt && <Check size={14} className="text-emerald-600" />}
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
                <MoreVertical size={16} />
              </button>

              {menuDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuDropdownOpen(false)} />
                  <div className="absolute right-0 top-10 sm:top-11 z-40 w-44 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuDropdownOpen(false);
                        navigate("/help");
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 cursor-pointer"
                    >
                      <HelpCircle size={18} className="text-gray-900 stroke-[2] shrink-0" />
                      <span>FAQs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuDropdownOpen(false);
                        window.open(helpWhatsApp, "_blank");
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 cursor-pointer"
                    >
                      <Headset size={18} className="text-gray-900 stroke-[2] shrink-0" />
                      <span>Coordinator</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuDropdownOpen(false);
                        setActiveTab("guidelines");
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 cursor-pointer"
                    >
                      <FileText size={18} className="text-gray-900 stroke-[2] shrink-0" />
                      <span>Guidelines</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ================= 4 STAT CARDS (KPIS: Events, Hours, Earnings, Payouts) ================= */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          {/* Card 1: Events */}
          <div className="flex flex-col justify-between rounded-xl border border-[#CCFBF1]/90 bg-[#F0FDFA] p-3 transition hover:shadow-sm sm:rounded-2xl sm:p-4">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 sm:h-9 sm:w-9 sm:rounded-xl">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800/80 sm:text-xs">
                  Events
                </span>
                <span className="hidden sm:block text-[11px] text-teal-700/80 font-medium">Supported / shifts</span>
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3.5">
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {totalEvents}
              </p>
              <span className="mt-1 block text-[10px] sm:text-[11px] font-semibold text-teal-700">
                Workshops & exhibitions
              </span>
            </div>
          </div>

          {/* Card 2: Hours */}
          <div className="flex flex-col justify-between rounded-xl border border-[#D1FAE5]/90 bg-[#ECFDF5] p-3 transition hover:shadow-sm sm:rounded-2xl sm:p-4">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#059669] sm:h-9 sm:w-9 sm:rounded-xl">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 sm:text-xs">
                  Hours
                </span>
                <span className="hidden sm:block text-[11px] text-emerald-700/80 font-medium">Volunteered</span>
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3.5">
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {totalHours}h
              </p>
              <span className="mt-1 block text-[10px] sm:text-[11px] font-semibold text-emerald-700">
                Verified contributions
              </span>
            </div>
          </div>

          {/* Card 3: Earnings */}
          <div className="flex flex-col justify-between rounded-xl border border-[#FEF3C7]/90 bg-[#FFFBEB] p-3 transition hover:shadow-sm sm:rounded-2xl sm:p-4">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 sm:h-9 sm:w-9 sm:rounded-xl">
                <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80 sm:text-xs">
                  Earnings
                </span>
                <span className="hidden sm:block text-[11px] text-amber-700/80 font-medium">Stipends earned</span>
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3.5">
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                ₹{totalEarnings.toLocaleString("en-IN")}
              </p>
              <span className="mt-1 block text-[10px] sm:text-[11px] font-semibold text-amber-700">
                Credited to wallet
              </span>
            </div>
          </div>

          {/* Card 4: Payouts */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E0E7FF]/90 bg-[#F5F7FF] p-3 transition hover:shadow-sm sm:rounded-2xl sm:p-4">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 sm:h-9 sm:w-9 sm:rounded-xl">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800/80 sm:text-xs">
                  Payouts
                </span>
                <span className="hidden sm:block text-[11px] text-indigo-700/80 font-medium">Disbursed</span>
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3.5">
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                ₹{totalPayouts.toLocaleString("en-IN")}
              </p>
              <span className="mt-1 block text-[10px] sm:text-[11px] font-semibold text-indigo-700">
                Withdrawn to bank
              </span>
            </div>
          </div>
        </div>

        {/* ================= HORIZONTAL TABS (Events | Timeline | Guidelines) ================= */}
        <div className="mb-6 border-b border-gray-100 pb-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-6 sm:gap-10 min-w-max whitespace-nowrap">
            {/* Tab 1: Events */}
            <button
              type="button"
              onClick={() => setActiveTab("events")}
              className={`flex shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap transition cursor-pointer pb-1 ${
                activeTab === "events"
                  ? "text-[#059669] border-b-2 border-[#059669]"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Calendar size={18} strokeWidth={activeTab === "events" ? 2.5 : 2} className="shrink-0" />
              <span>Events</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                {events.length}
              </span>
            </button>

            {/* Tab 2: Timeline */}
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`flex shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap transition cursor-pointer pb-1 ${
                activeTab === "timeline"
                  ? "text-[#059669] border-b-2 border-[#059669]"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Clock size={18} strokeWidth={activeTab === "timeline" ? 2.5 : 2} className="shrink-0" />
              <span>Timeline</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {timeline.length}
              </span>
            </button>

            {/* Tab 3: Guidelines */}
            <button
              type="button"
              onClick={() => setActiveTab("guidelines")}
              className={`flex shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap transition cursor-pointer pb-1 ${
                activeTab === "guidelines"
                  ? "text-[#059669] border-b-2 border-[#059669]"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <BookOpen size={18} strokeWidth={activeTab === "guidelines" ? 2.5 : 2} className="shrink-0" />
              <span>Guidelines</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: EVENTS ================= */}
        {activeTab === "events" && (
          <div className="space-y-4">
            {/* Sub-category Filter Buttons + Search + Log Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: "all", label: "All Events", count: events.length },
                  {
                    id: "completed",
                    label: "Completed",
                    count: events.filter((e) => e.status === "Completed" || e.status === "Verified").length,
                  },
                  {
                    id: "upcoming",
                    label: "Upcoming",
                    count: events.filter((e) => e.status === "Upcoming").length,
                  },
                  {
                    id: "workshops",
                    label: "Workshops",
                    count: events.filter((e) => e.category === "Workshop").length,
                  },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEventFilter(cat.id as EventFilter)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      eventFilter === cat.id
                        ? "bg-[#059669] text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        eventFilter === cat.id
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Bar + Log Hours Action */}
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-56 shrink-0">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events..."
                    className="w-full rounded-xl border border-gray-200/90 bg-gray-50/60 py-1.5 pl-8.5 pr-7 text-xs font-medium text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white"
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

                <button
                  type="button"
                  onClick={() => setShowLogModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#059669] px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>Log Hours</span>
                </button>
              </div>
            </div>

            {/* Events List */}
            {filteredEvents.length === 0 ? (
              <div className="rounded-2xl border border-gray-200/80 bg-white py-12 text-center shadow-xs">
                <Calendar size={36} className="mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-bold text-gray-800">No events found</p>
                <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto">
                  Volunteer events and workshop shifts will appear here once registered or completed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
                {filteredEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-gray-50/60 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700">
                        <Calendar size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                            {evt.eventName}
                          </p>
                          {evt.category && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {evt.category}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              evt.status === "Verified" || evt.status === "Completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : evt.status === "Upcoming"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {evt.status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-medium">
                          <span>{evt.date}</span>
                          {evt.timeSlot && (
                            <>
                              <span>•</span>
                              <span>{evt.timeSlot}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="font-semibold text-slate-700">{evt.role}</span>
                          <span>•</span>
                          <span className="text-gray-400">{evt.verifiedBy}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-gray-100 pt-2 sm:pt-0 shrink-0 gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700">
                          {evt.hours} hrs
                        </span>
                        {evt.stipend !== undefined && (
                          <span className="text-xs sm:text-sm font-black text-emerald-600">
                            +₹{evt.stipend.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400">
                        {evt.stipend ? "Stipend Earned" : "Volunteer Credit"}
                      </span>
                    </div>
                  </div>
                ))}
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
                { id: "all", label: "All Activity", count: timeline.length },
                {
                  id: "earnings",
                  label: "Earnings Only",
                  count: timeline.filter((t) => t.isCredit).length,
                },
                {
                  id: "payouts",
                  label: "Payouts Only",
                  count: timeline.filter((t) => !t.isCredit).length,
                },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setTimelineFilter(cat.id as TimelineFilter)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    timelineFilter === cat.id
                      ? "bg-[#059669] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      timelineFilter === cat.id
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
                <Clock size={36} className="mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-bold text-gray-800">No timeline entries found</p>
                <p className="mt-1 text-xs text-gray-400">
                  Volunteering stipends and payout disbursements will be recorded here over time.
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

        {/* ================= TAB 3: GUIDELINES ================= */}
        {activeTab === "guidelines" && (
          <div className="space-y-6">
            {/* Volunteer Code of Conduct */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h4 className="text-sm sm:text-base font-black text-slate-900">Volunteer Code of Conduct</h4>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Punctuality & Reporting:</strong> Please arrive 15 minutes before your shift start time to receive materials and briefing from the session mentor.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Warm & Encouraging Atmosphere:</strong> Woo Woo Art House is an inclusive creative haven. Greet participants with enthusiasm and maintain a supportive environment.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Dress Code & Volunteer Apron:</strong> Wear comfortable casual clothes suited for creative work. An official Woo Woo Art House apron and badge will be provided on-site.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Safety & Materials Care:</strong> Keep workshop tables organized, clean brushes and pottery tools post-session, and immediately notify the coordinator of any material shortage.
                  </span>
                </li>
              </ul>
            </div>

            {/* Compensation, Hours & Payout Policy */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-[#F0FDF4]/30 to-white p-4 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-[#059669]" />
                <h4 className="text-sm sm:text-base font-black text-slate-900">Stipend & Free Studio Credits Policy</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
                <div className="rounded-xl border border-emerald-100 bg-white p-3.5">
                  <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Shift Verification
                  </span>
                  <p className="mt-1 text-xs text-slate-600">
                    Mentors verify volunteer hours immediately at the close of every session.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-3.5">
                  <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Wallet Credit
                  </span>
                  <p className="mt-1 text-xs text-slate-600">
                    Verified stipends are credited to your WooWoo Wallet within 24 to 48 hours.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-3.5">
                  <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Free Studio Hours
                  </span>
                  <p className="mt-1 text-xs text-slate-600">
                    For every 2 hours volunteered, you earn 1 hour of complimentary personal studio time.
                  </p>
                </div>
              </div>
            </div>

            {/* Coordinator Contacts */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-6">
              <h4 className="text-sm font-black text-slate-900 mb-1">Coordinator Contacts & Support</h4>
              <p className="text-xs text-slate-500 mb-4">
                Need to reschedule a shift, report an absence, or have questions regarding volunteer roles?
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={helpWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp Coordinator</span>
                </a>
                <a
                  href="mailto:community@woowoo.art"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <span>community@woowoo.art</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Hours Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Log Volunteer Hours</h3>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Submit completed volunteering hours for mentor sign-off & stipend credit.
            </p>

            <form onSubmit={handleSubmitHours} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event / Workshop Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunday Pottery Assist"
                  value={newLogEvent}
                  onChange={(e) => setNewLogEvent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newLogDate}
                    onChange={(e) => setNewLogDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    required
                    value={newLogHours}
                    onChange={(e) => setNewLogHours(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role / Responsibilities</label>
                  <input
                    type="text"
                    placeholder="e.g. Materials prep"
                    value={newLogRole}
                    onChange={(e) => setNewLogRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stipend Claim (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={newLogStipend}
                    onChange={(e) => setNewLogStipend(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#059669] py-2.5 text-xs font-bold text-white hover:bg-[#047857] shadow-xs cursor-pointer"
                >
                  Submit for Review
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
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

function CvpAccessCard({
  loaded,
  status,
  helpUrl,
  onApply,
}: {
  loaded: boolean;
  status?: "under_review" | "approved" | "rejected";
  helpUrl: string;
  onApply: () => void;
}) {
  if (!loaded) {
    return <p className="p-6 text-sm text-slate-500">Loading your CVP Program…</p>;
  }

  if (status === "rejected") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Application not approved</h1>
        <p className="mt-3 text-sm leading-relaxed text-rose-700">
          We could not approve your volunteer application at this time. Please contact our community team for further info.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white"
          >
            Coordinator WhatsApp
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
      <div className="mx-auto max-w-lg rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Application under review</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your CVP volunteering application has been received and is currently under review. Our coordinator will contact you on WhatsApp!
        </p>
        <div className="mt-5 flex gap-2">
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white"
          >
            Coordinator WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#059669] mb-4">
        <Heart className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Community Volunteering Program (CVP)</h1>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        Give back, support creative workshops, meet inspiring artists, and earn free studio hours & event access.
      </p>
      <button
        type="button"
        onClick={onApply}
        className="mt-5 rounded-xl bg-[#059669] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#047857] transition cursor-pointer"
      >
        Apply for CVP Program
      </button>
    </div>
  );
}
