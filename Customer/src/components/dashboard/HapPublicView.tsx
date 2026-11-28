import { useState, useRef } from "react";
import {
  IndianRupee,
  TrendingUp,
  Calendar,
  Share2,
  Wallet,
  Play,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  UserPlus,
  Users,
  Gift,
  Activity,
  UtensilsCrossed,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type HapPublicViewProps = {
  asPage?: boolean;
  isJoined?: boolean;
  hapApplication?: any;
  onStartJoin?: () => void;
  onOpenDashboard?: () => void;
  illustrationComponent?: () => React.ReactNode;
};

type HapSubTab = "about" | "commissions" | "faqs";

interface CommissionCardData {
  key: string;
  label: string;
  value: string;
  icon: typeof UserPlus;
  border: string;
  bg: string;
  iconBg: string;
  iconText: string;
  oneLiner: string;
}

const COMMISSION_CARDS: CommissionCardData[] = [
  {
    key: "invite",
    label: "Signup Bonus",
    value: "₹10",
    icon: UserPlus,
    border: "border-violet-200",
    bg: "bg-violet-50/40",
    iconBg: "bg-violet-100",
    iconText: "text-violet-600",
    oneLiner: "Instant bonus credited for every friend who registers with your link",
  },
  {
    key: "membership",
    label: "Membership",
    value: "10%",
    icon: Users,
    border: "border-indigo-200",
    bg: "bg-indigo-50/40",
    iconBg: "bg-indigo-100",
    iconText: "text-indigo-600",
    oneLiner: "Earn 10% on every General, Special, Junior & Premium membership",
  },
  {
    key: "product",
    label: "Store Supplies",
    value: "2%",
    icon: Gift,
    border: "border-emerald-200",
    bg: "bg-emerald-50/40",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    oneLiner: "Earn 2% on art materials, canvas, paints & store merchandise",
  },
  {
    key: "space",
    label: "Space Booking",
    value: "10%",
    icon: Calendar,
    border: "border-orange-200",
    bg: "bg-orange-50/40",
    iconBg: "bg-orange-100",
    iconText: "text-orange-600",
    oneLiner: "Earn 10% on workshop desks, private studios & event space bookings",
  },
  {
    key: "service",
    label: "Services",
    value: "5%",
    icon: Activity,
    border: "border-blue-200",
    bg: "bg-blue-50/40",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    oneLiner: "Earn 5% on custom art commissions & creative facilitation services",
  },
  {
    key: "food",
    label: "Food Orders",
    value: "5%",
    icon: UtensilsCrossed,
    border: "border-rose-200",
    bg: "bg-rose-50/40",
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    oneLiner: "Earn 5% on cafe dining, snacks, beverages & food orders",
  },
];

interface VideoItem {
  id: string;
  title: string;
  duration: string;
  tag: string;
  description: string;
  image: string;
  videoSrc?: string;
}

const HAP_VIDEOS: VideoItem[] = [
  {
    id: "hap-v1",
    title: "Invite Friends. Earn Unlimited!",
    duration: "1:45 min",
    tag: "QUICKSTART",
    description: "Learn how to copy your link, share on WhatsApp, and earn instant rewards.",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "hap-v2",
    title: "Monetize What You Already Have",
    duration: "2:10 min",
    tag: "STRATEGY",
    description: "Tips on how creators, designers, and students share Woo Woo experiences.",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "hap-v3",
    title: "Real-time Tracking & Weekly Payouts",
    duration: "1:30 min",
    tag: "PAYOUTS",
    description: "How commissions accumulate in your wallet and transfer every Monday.",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
  },
];

interface FaqItem {
  question: string;
  answer: string;
}

const HAP_FAQS: FaqItem[] = [
  {
    question: "What is the House Affiliate Program (HAP)?",
    answer:
      "HAP is Woo Woo Art House's official affiliate partnership program. It allows creators, artists, art students, and community champions to earn unlimited commissions by recommending our art spaces, events, store supplies, food, and memberships.",
  },
  {
    question: "Is there any joining fee or upfront investment?",
    answer:
      "Zero investment! Joining HAP is 100% free forever. There are no registration charges, subscription costs, or hidden deductions.",
  },
  {
    question: "How do I share and track my referrals?",
    answer:
      "Once approved, you receive an exclusive referral link and unique invite code. When friends or followers click your link or register with your code, all their purchases and bookings are automatically credited to your affiliate wallet in real time.",
  },
  {
    question: "How much commission can I earn?",
    answer:
      "You earn up to 20% on space bookings and memberships, 5% on cafe food and art services, 2% on store supplies, plus an instant ₹10 signup bonus for every friend who creates an account. There is no upper limit on your earnings!",
  },
  {
    question: "When and how do I receive my commission payouts?",
    answer:
      "Affiliate payouts are processed on a weekly basis every Monday. Once your approved earnings reach the minimum withdrawal threshold of ₹2,000, funds are transferred directly into your bank account or via UPI.",
  },
  {
    question: "Do I need a large social media following to join?",
    answer:
      "Not at all! Anyone with a genuine network—whether you are an art student sharing with classmates, a creator, a tutor, or an enthusiast—can join and monetize their connections.",
  },
];

export function HapPublicView({
  asPage = false,
  isJoined = false,
  hapApplication,
  onOpenDashboard,
  illustrationComponent,
}: HapPublicViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<HapSubTab>("about");
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const commissionScrollRef = useRef<HTMLDivElement>(null);

  const scrollCommissions = (direction: "left" | "right") => {
    if (commissionScrollRef.current) {
      const offset = direction === "left" ? -260 : 260;
      commissionScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* 0. Member banner if already joined */}
      {isJoined && (
        <div
          className={`mx-4 sm:mx-5 rounded-2xl border border-purple-200 bg-purple-50/70 p-3 flex items-center justify-between gap-3 ${
            asPage ? "md:mx-6" : ""
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7C3AED] text-white shrink-0">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-black text-slate-900 leading-tight truncate">
                You are an approved HAP Affiliate
              </p>
              <p className="text-[10px] font-semibold text-slate-500 truncate">
                Track clicks, commissions &amp; weekly payouts
              </p>
            </div>
          </div>
          {onOpenDashboard && (
            <button
              type="button"
              onClick={onOpenDashboard}
              className="py-1.5 px-3 rounded-xl bg-[#7C3AED] text-white text-[11px] font-extrabold hover:bg-[#6D28D9] transition shrink-0 cursor-pointer shadow-xs"
            >
              Open Dashboard
            </button>
          )}
        </div>
      )}

      {/* 1. Status Notice if under review or rejected */}
      {hapApplication?.status === "under_review" || hapApplication?.status === "rejected" ? (
        <div
          className={`mx-4 sm:mx-5 rounded-2xl border px-3.5 py-3 text-left ${
            hapApplication.status === "rejected"
              ? "border-rose-200 bg-rose-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <span className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-700">
            {hapApplication.status === "rejected" ? "Rejected" : "Waiting for approval"}
          </span>
          <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-700">
            {hapApplication.status === "rejected"
              ? hapApplication.rejectionReason?.trim() ||
                "No reason was provided. You can reach out to our team."
              : "Your HAP application is currently under review. Payouts and full dashboard activate upon approval."}
          </p>
        </div>
      ) : null}

      {/* 2. Top 3 Highlight Cards (Zero Investment, 20% Commission, Weekly Payout) */}
      <div className={`grid grid-cols-3 gap-2 sm:gap-3 px-4 sm:px-5 ${asPage ? "md:gap-4 md:px-6" : ""}`}>
        {/* Card 1: Zero Investment */}
        <div className="flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-center min-w-0 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED] mb-2 shrink-0">
            <IndianRupee className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.5} />
          </div>
          <div className="w-full text-center text-[10.5px] sm:text-[13px] font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight">
            Zero Investment
          </div>
          <div className="mt-1 text-[7.5px] sm:text-[9px] font-bold text-slate-500 leading-tight">
            Start free with no joining fee
          </div>
        </div>

        {/* Card 2: 20% Commission (upto) */}
        <div className="flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] text-center min-w-0 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A] mb-2 shrink-0">
            <TrendingUp className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.5} />
          </div>
          <div className="w-full text-center text-[10px] sm:text-[12.5px] font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight">
            20% Commission
          </div>
          <div className="mt-1 text-[7.5px] sm:text-[9px] font-bold text-slate-500 leading-tight">
            Earn up to 20% on bookings
          </div>
        </div>

        {/* Card 3: Weekly Payout */}
        <div className="flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] text-center min-w-0 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB] mb-2 shrink-0">
            <Calendar className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.5} />
          </div>
          <div className="w-full text-center text-[10.5px] sm:text-[13px] font-black text-slate-900 leading-tight whitespace-nowrap tracking-tight">
            Weekly Payout
          </div>
          <div className="mt-1 text-[7.5px] sm:text-[9px] font-bold text-slate-500 leading-tight">
            Get paid directly every single week
          </div>
        </div>
      </div>

      {/* 3. Internal Tabs: About | Commissions cards | FAQs */}
      <div className={`px-4 sm:px-5 ${asPage ? "md:px-6" : ""}`}>
        <div className="flex items-center p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab("about")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-center text-[11.5px] sm:text-[13px] font-extrabold transition-all cursor-pointer ${
              activeSubTab === "about"
                ? "bg-[#7C3AED] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            About
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("commissions")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-center text-[11.5px] sm:text-[13px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "commissions"
                ? "bg-[#7C3AED] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            Commissions cards
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("faqs")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-center text-[11.5px] sm:text-[13px] font-extrabold transition-all cursor-pointer ${
              activeSubTab === "faqs"
                ? "bg-[#7C3AED] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            FAQs
          </button>
        </div>
      </div>

      {/* 4. Tab Content Rendering */}
      {/* ================= TAB 1: ABOUT ================= */}
      {activeSubTab === "about" && (
        <div className="space-y-4">
          {/* Main Program Card as requested */}
          <div
            className={`mx-4 sm:mx-5 p-4 sm:p-5 rounded-[24px] border bg-[#FAFBFD] relative overflow-hidden text-left shadow-2xs border-slate-100 ${
              asPage ? "md:mx-6 md:p-6" : ""
            }`}
          >
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center text-[12px] font-black h-6 w-6 rounded-lg leading-none bg-[#7C3AED] text-white">
                    02
                  </span>
                  <h4 className="text-[16px] sm:text-[18px] font-black text-slate-900 leading-none">
                    House Affiliate Program
                  </h4>
                </div>
                <p className="mt-3.5 text-[12px] sm:text-[13px] font-bold text-slate-600 leading-relaxed max-w-[85%]">
                  Invite, engage &amp; earn! Promote WOO WOO Art House and earn unlimited commission on every activity.
                </p>
              </div>

              {illustrationComponent ? illustrationComponent() : null}
            </div>

            {/* Features Strip: Zero Investment | Earn Unlimited | Monetize Network */}
            <div className="border-t border-slate-100 pt-3.5 flex justify-between items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
                <div className="h-7 w-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                  <IndianRupee className="h-3.5 w-3.5" strokeWidth={2.4} />
                </div>
                <span className="text-[10px] sm:text-[12px] font-black text-slate-800 leading-tight">
                  Zero Investment
                </span>
              </div>

              <div className="h-5 w-[1px] bg-slate-200 shrink-0" />

              <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
                <div className="h-7 w-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                  <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />
                </div>
                <span className="text-[10px] sm:text-[12px] font-black text-slate-800 leading-tight">
                  Earn Unlimited
                </span>
              </div>

              <div className="h-5 w-[1px] bg-slate-200 shrink-0" />

              <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
                <div className="h-7 w-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                  <Users className="h-3.5 w-3.5" strokeWidth={2.4} />
                </div>
                <span className="text-[10px] sm:text-[12px] font-black text-slate-800 leading-tight">
                  Monetize Network
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: COMMISSIONS CARDS ================= */}
      {activeSubTab === "commissions" && (
        <section className={`px-4 sm:px-5 ${asPage ? "md:px-6" : ""}`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h4 className="text-[14px] sm:text-[16px] font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Commission Rules (Segment Wise)</span>
                <HelpCircle className="h-4 w-4 text-slate-400" />
              </h4>
              <p className="text-[11px] sm:text-[12px] font-medium text-slate-500">
                Set commission percentage or fixed amount for each segment. Swipe horizontally to view all.
              </p>
            </div>

            {/* Scroll navigation arrows for desktop / convenience */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => scrollCommissions("left")}
                aria-label="Scroll left"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCommissions("right")}
                aria-label="Scroll right"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Horizontally Scrollable Commission Cards */}
          <div
            ref={commissionScrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-none pb-3 pt-1 px-0.5 snap-x snap-mandatory"
          >
            {COMMISSION_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className={`w-[210px] sm:w-[230px] shrink-0 snap-start rounded-2xl border ${card.border} ${card.bg} p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow`}
                >
                  {/* Top: Icon + Label */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center ${card.iconText} shrink-0`}
                      >
                        <Icon size={18} strokeWidth={2.4} />
                      </div>
                      <h5 className="font-extrabold text-[13.5px] text-slate-900 leading-tight">
                        {card.label}
                      </h5>
                    </div>

                    {/* Big Value Number */}
                    <div className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none my-2.5">
                      {card.value}
                    </div>
                  </div>

                  {/* Bottom: One-liner text instead of Active & Edit Rule */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                    <p className="text-[10.5px] sm:text-[11px] font-semibold text-slate-600 leading-relaxed">
                      {card.oneLiner}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Transparent Commission Policy Highlights */}
          <div className="mt-3.5 rounded-2xl border border-slate-100 bg-[#FAFBFD] p-3.5 sm:p-4 text-left">
            <h5 className="text-[12.5px] font-black text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#7C3AED]" />
              <span>Affiliate Payout &amp; Commission Guidelines</span>
            </h5>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium text-slate-600">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Weekly Payouts:</strong> Released every Monday for balances reaching ₹2,000 threshold.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Direct Transfer:</strong> Instant transfers via verified UPI or NEFT/IMPS Bank account.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Real-Time Attribution:</strong> Real-time tracking of visits, signups &amp; purchases.
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= TAB 3: FAQS ================= */}
      {activeSubTab === "faqs" && (
        <section className={`px-4 sm:px-5 ${asPage ? "md:px-6" : ""}`}>
          <div className="mb-3">
            <h4 className="text-[14px] sm:text-[16px] font-black text-slate-900 tracking-tight">
              Frequently Asked Questions (FAQs)
            </h4>
            <p className="text-[11px] sm:text-[12px] font-medium text-slate-500">
              Everything you need to know about joining and earning with HAP
            </p>
          </div>

          <div className="space-y-2">
            {HAP_FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-3 p-3.5 sm:p-4 text-left transition hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="text-[12.5px] sm:text-[13.5px] font-extrabold text-slate-900">
                      {faq.question}
                    </span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      {isOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="border-t border-slate-100 px-3.5 pb-3.5 pt-2 sm:px-4 sm:pb-4 text-[11.5px] sm:text-[12.5px] font-medium text-slate-600 leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. How It Works (Steps UI in cards form: 1. Promote and refer, 2. Earn, 3. Get paid) */}
      <section className={`px-4 sm:px-5 ${asPage ? "md:px-6" : ""}`}>
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <h4 className="text-[13.5px] sm:text-[15px] font-black text-slate-900 tracking-tight">
              How It Works
            </h4>
            <p className="text-[10.5px] sm:text-[11.5px] font-medium text-slate-500">
              Earn unlimited income in 3 simple steps
            </p>
          </div>
          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-extrabold text-[#7C3AED] border border-purple-200/70">
            Simple 3-Step Process
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Step 1: Promote and Refer */}
          <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-[#FAF5FF] via-white to-violet-50/30 p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7C3AED] text-[10px] font-black text-white">
                01
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-[#7C3AED]">
                <Share2 className="h-4 w-4" strokeWidth={2.3} />
              </div>
            </div>
            <h5 className="text-[13px] font-black text-slate-900">
              1. Promote and Refer
            </h5>
            <p className="mt-1 text-[11px] font-medium text-slate-600 leading-snug">
              Share your unique link or invite code with friends, creators, and your community.
            </p>
          </div>

          {/* Step 2: Earn */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-[#F0FDF4] via-white to-emerald-50/30 p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#16A34A] text-[10px] font-black text-white">
                02
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-[#16A34A]">
                <TrendingUp className="h-4 w-4" strokeWidth={2.3} />
              </div>
            </div>
            <h5 className="text-[13px] font-black text-slate-900">
              2. Earn
            </h5>
            <p className="mt-1 text-[11px] font-medium text-slate-600 leading-snug">
              Earn instant commissions on every booking, art supply purchase, food order, and membership.
            </p>
          </div>

          {/* Step 3: Get Paid */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-[#EFF6FF] via-white to-blue-50/30 p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#2563EB] text-[10px] font-black text-white">
                03
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[#2563EB]">
                <Wallet className="h-4 w-4" strokeWidth={2.3} />
              </div>
            </div>
            <h5 className="text-[13px] font-black text-slate-900">
              3. Get Paid
            </h5>
            <p className="mt-1 text-[11px] font-medium text-slate-600 leading-snug">
              Receive automated weekly payouts directly transferred to your bank account or UPI ID.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Videos & Walkthroughs Section */}
      <section className={`px-4 sm:px-5 ${asPage ? "md:px-6" : ""}`}>
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <h4 className="text-[13.5px] sm:text-[15px] font-black text-slate-900 tracking-tight">
              Videos &amp; Walkthroughs
            </h4>
            <p className="text-[10.5px] sm:text-[11.5px] font-medium text-slate-500">
              Watch quick tutorials on maximizing your affiliate income
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200/70">
            <Play className="h-2.5 w-2.5 fill-amber-600 text-amber-600" />
            <span>Watch &amp; Learn</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {HAP_VIDEOS.map((video) => (
            <div
              key={video.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedVideo(video)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedVideo(video);
              }}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-md transition-all cursor-pointer text-left flex flex-col"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
                <img
                  src={video.image}
                  alt={video.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors" />

                {/* Tag Badge */}
                <div className="absolute left-2.5 top-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[8px] font-black text-white tracking-wider backdrop-blur-xs">
                  {video.tag}
                </div>

                {/* Duration Badge */}
                <div className="absolute right-2.5 top-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[8px] font-bold text-white tracking-wider backdrop-blur-xs">
                  {video.duration}
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#7C3AED] shadow-md backdrop-blur-xs group-hover:scale-110 group-active:scale-95 transition-transform">
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Video Meta */}
              <div className="p-3">
                <h5 className="text-[12.5px] font-black text-slate-900 group-hover:text-[#7C3AED] transition-colors line-clamp-1">
                  {video.title}
                </h5>
                <p className="mt-1 text-[10.5px] font-medium text-slate-500 line-clamp-2 leading-snug">
                  {video.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Video Modal Player */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl bg-white overflow-hidden shadow-2xl text-left border border-slate-100"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="min-w-0 pr-3">
                  <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[9px] font-extrabold text-[#7C3AED]">
                    {selectedVideo.tag} · {selectedVideo.duration}
                  </span>
                  <h4 className="mt-1 truncate text-sm sm:text-base font-black text-slate-900">
                    {selectedVideo.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVideo(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Video Player Area */}
              <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                <img
                  src={selectedVideo.image}
                  alt={selectedVideo.title}
                  className="h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-lg animate-pulse">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Playing Video Preview</p>
                      <p className="text-[10px] text-white/70">
                        Woo Woo Art House Affiliate Community Series
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Description */}
              <div className="p-4 bg-slate-50">
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  {selectedVideo.description}
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    Join HAP to unlock exclusive affiliate webinars
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedVideo(null)}
                    className="py-1 px-3 rounded-lg bg-[#7C3AED] text-white font-extrabold text-xs"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
