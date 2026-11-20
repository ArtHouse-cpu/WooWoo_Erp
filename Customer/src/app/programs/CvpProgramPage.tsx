import { useState } from "react";
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
  Sparkles,
  Heart,
  Gift,
  Coffee,
  CheckCircle2,
  MessageCircle,
  BookOpen,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardSidebar } from "../../components/dashboard/DashboardSidebar";
import { CvpJoinModal } from "../../components/dashboard/CvpJoinModal";
import { useCvpApplication } from "../../hooks/useCvpApplication";
import { useAuthStore } from "../../store/authStore";

// ================= TYPES =================
interface HoursLogEntry {
  id: string;
  eventName: string;
  date: string;
  hours: number;
  role: string;
  verifiedBy: string;
  status: "Verified" | "Pending Review";
}

const INITIAL_HOURS_LOG: HoursLogEntry[] = [
  {
    id: "log-1",
    eventName: "Mini Terrarium Workshop Assist",
    date: "14 Nov 2026",
    hours: 3.5,
    role: "Material Coordinator",
    verifiedBy: "Studio Mentor (Priya)",
    status: "Verified",
  },
  {
    id: "log-2",
    eventName: "Diwali Art House Flea & Exhibition",
    date: "08 Nov 2026",
    hours: 5.0,
    role: "Front Desk & Guest Welcome",
    verifiedBy: "Community Lead (Karan)",
    status: "Verified",
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
  const [activeTab, setActiveTab] = useState<"hours" | "perks" | "handbook">("hours");
  const [hoursLog, setHoursLog] = useState<HoursLogEntry[]>(INITIAL_HOURS_LOG);
  const [showLogModal, setShowLogModal] = useState(false);

  // Form for logging hours
  const [newLogEvent, setNewLogEvent] = useState("");
  const [newLogDate, setNewLogDate] = useState("");
  const [newLogHours, setNewLogHours] = useState("3");
  const [newLogRole, setNewLogRole] = useState("");

  const timeOptions = ["Lifetime", "Today", "This Week", "This Month", "This Year"];

  const helpWhatsApp = `https://wa.me/918073988123?text=${encodeURIComponent(
    application?.status === "rejected"
      ? "Hi, my CVP volunteer application was not approved. Please guide me."
      : "Hi, I need assistance with the Community Volunteering Program (CVP) at Woo Woo Art House."
  )}`;

  // Submit manual log entry
  const handleSubmitHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogEvent || !newLogDate || !newLogHours) {
      toast.error("Please fill in event name, date and hours.");
      return;
    }
    const newEntry: HoursLogEntry = {
      id: `log-${Date.now()}`,
      eventName: newLogEvent,
      date: newLogDate,
      hours: Number(newLogHours) || 1,
      role: newLogRole || "Volunteer",
      verifiedBy: "Pending Coordinator Review",
      status: "Pending Review",
    };
    setHoursLog((prev) => [newEntry, ...prev]);
    toast.success("Hours logged! Submitted to studio coordinator for review.");
    setShowLogModal(false);
    setNewLogEvent("");
    setNewLogDate("");
    setNewLogHours("3");
    setNewLogRole("");
  };

  // Aggregates
  const totalVerifiedHours = hoursLog
    .filter((h) => h.status === "Verified")
    .reduce((sum, h) => sum + h.hours, 0);
  const totalEventsSupported = hoursLog.filter((h) => h.status === "Verified").length;
  const studioCreditsEarned = Math.floor(totalVerifiedHours / 2);
  const impactPoints = Math.round(totalVerifiedHours * 20);

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
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
              aria-label="Go back"
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
                        navigate("/communityguidelines");
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

        {/* ================= 6 STAT CARDS (AT TOP DIRECTLY UNDER HEADER) ================= */}
        <div className="mb-5 grid grid-cols-3 gap-1.5 sm:mb-8 sm:gap-4 lg:grid-cols-6">
          {/* Card 1: Hours Volunteered */}
          <div className="flex flex-col justify-between rounded-xl border border-[#D1FAE5]/80 bg-[#ECFDF5] p-2 transition hover:shadow-sm sm:rounded-2xl sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-100/90 text-[#059669] sm:h-8 sm:w-8 sm:rounded-xl">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                Hours Contributed
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">
                {totalVerifiedHours}h
              </p>
              <span className="mt-1 hidden text-[10px] font-medium text-emerald-700 sm:mt-1.5 sm:block sm:text-[11px]">
                Verified by mentor
              </span>
            </div>
          </div>

          {/* Card 2: Events Supported */}
          <div className="flex flex-col justify-between rounded-xl border border-[#CCFBF1]/80 bg-[#F0FDFA] p-2 transition hover:shadow-sm sm:rounded-2xl sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-100/90 text-teal-700 sm:h-8 sm:w-8 sm:rounded-xl">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                Events Supported
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">
                {totalEventsSupported}
              </p>
              <span className="mt-1 hidden text-[10px] font-medium text-teal-700 sm:mt-1.5 sm:block sm:text-[11px]">
                Art & workshop jams
              </span>
            </div>
          </div>

          {/* Card 3: Studio Credits */}
          <div className="flex flex-col justify-between rounded-xl border border-[#FEF3C7]/80 bg-[#FFFBEB] p-2 transition hover:shadow-sm sm:rounded-2xl sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-100/90 text-amber-700 sm:h-8 sm:w-8 sm:rounded-xl">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                Studio Credits
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">
                {studioCreditsEarned}h
              </p>
              <span className="mt-1 hidden text-[10px] font-medium text-amber-700 sm:mt-1.5 sm:block sm:text-[11px]">
                Free studio access
              </span>
            </div>
          </div>

          {/* Card 4: Impact Score */}
          <div className="flex flex-col justify-between rounded-xl border border-[#FFE4E6]/80 bg-[#FFF1F2] p-2 transition hover:shadow-sm sm:rounded-2xl sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rose-100/90 text-rose-600 sm:h-8 sm:w-8 sm:rounded-xl">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                Impact Score
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">{impactPoints} pts</p>
              <span className="mt-1 hidden text-[10px] font-medium text-rose-600 sm:mt-1.5 sm:block sm:text-[11px]">
                Community karma
              </span>
            </div>
          </div>

          {/* Card 5: Badges Earned */}
          <div className="flex flex-col justify-between rounded-xl border border-[#EDE9FE]/80 bg-[#FAF5FF] p-2 transition hover:shadow-sm sm:rounded-2xl sm:p-3.5">
            <div className="flex items-start gap-1 sm:gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-purple-100/90 text-purple-700 sm:h-8 sm:w-8 sm:rounded-xl">
                <Award className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.2} />
              </div>
              <span className="text-[9px] font-semibold leading-tight text-gray-600 sm:text-xs">
                Badges
              </span>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <p className="text-sm font-black leading-none text-purple-700 sm:text-xl">2</p>
              <span className="mt-1 hidden text-[10px] font-medium text-purple-600 sm:mt-1.5 sm:block sm:text-[11px]">
                Art Angel & Helper
              </span>
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
              <p className="text-sm font-black leading-none text-gray-900 sm:text-xl">{hoursLog.length}</p>
              <span className="mt-1 hidden text-[10px] font-medium text-gray-400 sm:mt-1.5 sm:block sm:text-[11px]">
                Total sessions
              </span>
            </div>
          </div>
        </div>

        {/* ================= HORIZONTAL TABS ================= */}
        <div className="mb-6 border-b border-gray-100 pb-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-5 sm:gap-10 min-w-max whitespace-nowrap">
            {/* Hours Log Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("hours")}
              className={`flex shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === "hours"
                  ? "text-[#059669]"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Clock size={18} strokeWidth={activeTab === "hours" ? 2.5 : 2} className="shrink-0" />
              <span>Hours Log</span>
            </button>

            {/* Perks & Credits Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("perks")}
              className={`flex shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === "perks"
                  ? "text-[#059669]"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Gift size={18} strokeWidth={activeTab === "perks" ? 2.5 : 2} className="shrink-0" />
              <span>Credits & Perks</span>
            </button>

            {/* Handbook Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("handbook")}
              className={`flex shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === "handbook"
                  ? "text-[#059669]"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <BookOpen size={18} strokeWidth={activeTab === "handbook" ? 2.5 : 2} className="shrink-0" />
              <span>Handbook & Guidelines</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: HOURS LOG ================= */}
        {activeTab === "hours" && (
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
              <table className="w-full min-w-[580px] text-left text-xs whitespace-nowrap">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-bold">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Event / Task</th>
                    <th className="px-4 py-3 whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 whitespace-nowrap">Role</th>
                    <th className="px-4 py-3 whitespace-nowrap">Hours</th>
                    <th className="px-4 py-3 whitespace-nowrap">Verified By</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hoursLog.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{log.eventName}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{log.date}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{log.role}</td>
                      <td className="px-4 py-3.5 font-black text-emerald-700 whitespace-nowrap">{log.hours} hrs</td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{log.verifiedBy}</td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            log.status === "Verified"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: CREDITS & PERKS ================= */}
        {activeTab === "perks" && (
          <div className="space-y-6">
            {/* Credit Balance Card */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-[#F0FDF4] to-white p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Studio Credit Balance
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-slate-900">{studioCreditsEarned} Hours</span>
                    <span className="text-xs text-slate-500">Free studio & desk access</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toast.success("Pass booked! Show this to front desk on your next visit.")}
                  className="rounded-xl bg-[#059669] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#047857] shadow-xs active:scale-98 cursor-pointer"
                >
                  Redeem Free Studio Pass
                </button>
              </div>
            </div>

            {/* Redeemable Perks Grid */}
            <div>
              <h4 className="text-sm font-black text-slate-900 mb-3">Redeemable Volunteer Rewards</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Perk 1 */}
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mb-3">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h5 className="text-xs font-black text-slate-900">Studio Pass (2 Hours)</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enjoy unrestricted access to painting easel, co-working desk, and art library.
                  </p>
                  <button
                    type="button"
                    onClick={() => toast.success("Studio pass claimed!")}
                    className="mt-4 w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    Redeem (4 Credits)
                  </button>
                </div>

                {/* Perk 2 */}
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 mb-3">
                    <Coffee className="h-5 w-5" />
                  </div>
                  <h5 className="text-xs font-black text-slate-900">Artisan Cafe Beverage</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Complimentary iced latte, hot cappuccino or herbal tea at the Woo Woo Cafe.
                  </p>
                  <button
                    type="button"
                    onClick={() => toast.success("Drink voucher claimed! Check your WhatsApp.")}
                    className="mt-4 w-full rounded-xl border border-teal-200 bg-teal-50 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 cursor-pointer"
                  >
                    Claim Voucher
                  </button>
                </div>

                {/* Perk 3 */}
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 mb-3">
                    <Award className="h-5 w-5" />
                  </div>
                  <h5 className="text-xs font-black text-slate-900">Volunteer Certificate</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Official digital Certificate of Appreciation signed by the art house director.
                  </p>
                  <button
                    type="button"
                    onClick={() => toast.info("Certificate requested. It will be emailed to you.")}
                    className="mt-4 w-full rounded-xl border border-purple-200 bg-purple-50 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 cursor-pointer"
                  >
                    Request Certificate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: HANDBOOK & GUIDELINES ================= */}
        {activeTab === "handbook" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-2xs">
              <h4 className="text-sm font-black text-slate-900 mb-2">Volunteer Code of Conduct</h4>
              <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Punctuality:</strong> Please arrive 15 minutes prior to the shift start to receive instructions from the session mentor.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Warm Welcome:</strong> We are a safe, inclusive creative space. Greet all workshop participants with warmth and encouragement.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Dress Code:</strong> Comfortable casual attire suitable for creative work. An official Woo Woo Art House apron will be provided on-site.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h4 className="text-sm font-black text-slate-900 mb-1">Coordinator Contacts</h4>
              <p className="text-xs text-slate-500 mb-4">Need to reschedule a shift or have questions about a role?</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={helpWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-xs"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp Coordinator</span>
                </a>
                <a
                  href="mailto:community@woowoo.art"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
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
            <h3 className="text-base font-black text-slate-900">Log Volunteer Hours</h3>
            <p className="mt-1 text-xs text-slate-500">Submit completed volunteering hours for mentor sign-off</p>

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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Responsibilities</label>
                <input
                  type="text"
                  placeholder="e.g. Materials prep, guest registration"
                  value={newLogRole}
                  onChange={(e) => setNewLogRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#059669] py-2.5 text-xs font-bold text-white hover:bg-[#047857] cursor-pointer"
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
