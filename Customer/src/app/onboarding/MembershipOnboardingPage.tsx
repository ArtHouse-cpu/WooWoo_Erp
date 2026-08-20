import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  DollarSign,
  FileText,
  Gift,
  Headphones,
  IndianRupee,
  Info,
  MoreVertical,
  Percent,
  ShoppingBag,
  Soup,
  Star,
  Tag,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";
import purpleStarPedestal from "../../assets/purple_star_pedestal.jpg";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import {
  FALLBACK_MEMBERSHIP_PLANS,
  getMembershipPlan,
  mapApiPlanToMembershipPlan,
  type MembershipPlan,
  type MembershipPlanId,
} from "../../data/membershipPlans";
import { authApi } from "../../services/auth.service";
import { getErrorMessage } from "../../services/axios";
import { useAuthStore } from "../../store/authStore";
import { loadRazorpayScript, openRazorpayCheckout } from "../../utils/razorpayCheckout";
import {
  BenefitsSheet,
  CheckoutSheet,
  formatUptoPercent,
  maxDiscountUpto,
  PlanIcon,
} from "./MembershipModal";
import type { ActivityInsights } from "../../types/auth";

function MembershipCard({
  plan,
  selected,
  onSelect,
  onSeeBenefits,
}: {
  plan: MembershipPlan;
  selected: boolean;
  onSelect: () => void;
  onSeeBenefits: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`flex h-full min-w-0 cursor-pointer flex-col rounded-[18px] border-2 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md lg:min-h-[280px] lg:rounded-[22px] lg:p-6 ${
        selected ? plan.theme.borderSelected : "border-[#E8EEF5]"
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2 lg:gap-2.5">
          <PlanIcon
            iconKey={plan.iconKey}
            className={`mt-0.5 h-4 w-4 shrink-0 lg:h-5 lg:w-5 ${plan.theme.iconText}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <h3
                className={`truncate text-[14px] font-extrabold leading-tight lg:text-[18px] ${plan.theme.title}`}
              >
                {plan.title}
              </h3>
              <span className="shrink-0 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#334155] lg:text-[10px]">
                {plan.badge}
              </span>
            </div>
          </div>
        </div>
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 lg:h-6 lg:w-6 ${
            selected ? plan.theme.radio : "border-slate-300 text-transparent"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full lg:h-2.5 lg:w-2.5 ${selected ? "bg-current" : ""}`}
          />
        </span>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-2 divide-x divide-[#E8EEF5] border-t border-[#E8EEF5] pt-3 lg:mt-5 lg:pt-5">
        <div className="min-w-0 pr-3">
          <div className="flex items-center gap-1">
            <Percent
              className={`h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4 ${plan.theme.iconText}`}
              strokeWidth={2.4}
            />
            <p className="truncate text-[10px] font-semibold text-[#64748B] lg:text-[12px]">
              Discounts
            </p>
          </div>
          <p className="mt-1 truncate text-[14px] font-extrabold text-[#0F172A] lg:text-[18px]">
            {maxDiscountUpto(plan)}
          </p>
        </div>
        <div className="min-w-0 pl-3">
          <div className="flex items-center gap-1">
            <IndianRupee
              className={`h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4 ${plan.theme.iconText}`}
              strokeWidth={2.4}
            />
            <p className="truncate text-[10px] font-semibold text-[#64748B] lg:text-[12px]">
              Cashback
            </p>
          </div>
          <p className="mt-1 truncate text-[14px] font-extrabold text-[#0F172A] lg:text-[18px]">
            {formatUptoPercent(plan.cashback)}
          </p>
        </div>
      </div>

      <div className="mt-3 min-w-0 lg:mt-5">
        <p className="text-[10px] font-semibold text-[#64748B] lg:text-[12px]">
          Programs
        </p>
        <div className="mt-1.5 flex min-w-0 flex-wrap gap-1.5 lg:mt-2 lg:gap-2">
          {(plan.programs || []).map(tag => (
            <span
              key={tag.key}
              className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold lg:px-2.5 lg:py-1 lg:text-[11px] ${
                tag.eligible
                  ? `${plan.theme.badgeBg} ${plan.theme.badgeText}`
                  : 'bg-[#F1F5F9] text-[#94A3B8] line-through'
              }`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto flex min-w-0 items-center justify-between gap-1 pt-3 lg:pt-5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSeeBenefits();
          }}
          className="inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold text-[#64748B] lg:text-[13px]"
        >
          <FileText
            className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4"
            strokeWidth={2}
          />
          <span className="truncate">See all benefits</span>
        </button>
        <button
          type="button"
          aria-label={`View ${plan.title} benefits`}
          onClick={(event) => {
            event.stopPropagation();
            onSeeBenefits();
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#64748B] lg:h-10 lg:w-10"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function InsightsTab({ customer }: { customer: any }) {
  const navigate = useNavigate();
  const isMember =
    customer?.membershipType && customer.membershipType !== "none";
  const memberPlan = isMember
    ? String(customer.membershipType).toUpperCase()
    : "SPECIAL";

  const [insights, setInsights] = useState<ActivityInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoadingInsights(true);
        const res = await authApi.getActivityInsights();
        if (!cancelled) setInsights(res.data.data ?? null);
      } catch (error) {
        if (!cancelled) {
          setInsights(null);
          toast.error(getErrorMessage(error, "Failed to load insights"));
        }
      } finally {
        if (!cancelled) setLoadingInsights(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const memberSince = useMemo(() => {
    if (customer?.createdAt) {
      try {
        const date = new Date(customer.createdAt);
        return `Member since ${date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })}`;
      } catch {
        // ignore
      }
    }
    return "Member since Jan 2024";
  }, [customer?.createdAt]);

  const activitiesStats = useMemo(() => {
    const stats = insights?.activities;
    return [
      {
        id: "shopping",
        title: "Shopping",
        subtitle: "Orders & Purchases",
        count: stats?.shopping.count ?? 0,
        benefit: stats?.shopping.benefit ?? 0,
        icon: ShoppingBag,
        color: "#EA580C",
        bg: "bg-[#FFF7ED]",
      },
      {
        id: "services",
        title: "Services",
        subtitle: "Custom Framings & Scans",
        count: stats?.services.count ?? 0,
        benefit: stats?.services.benefit ?? 0,
        icon: Wrench,
        color: "#9333EA",
        bg: "bg-[#FAF5FF]",
      },
      {
        id: "space",
        title: "Space Bookings",
        subtitle: "Studio & Room Rentals",
        count: stats?.space.count ?? 0,
        benefit: stats?.space.benefit ?? 0,
        icon: Calendar,
        color: "#16A34A",
        bg: "bg-[#EAFDF4]",
      },
      {
        id: "food",
        title: "Food & Cafe",
        subtitle: "Cafe Orders & Combos",
        count: stats?.food.count ?? 0,
        benefit: stats?.food.benefit ?? 0,
        icon: Soup,
        color: "#EF4444",
        bg: "bg-[#FEF2F2]",
      },
    ];
  }, [insights]);

  const impact = insights?.impact;

  return (
    <div className="min-w-0 space-y-5 text-left sm:space-y-6">
      <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-[20px] border border-[#DDD6FE] bg-gradient-to-r from-[#F5F3FF] to-[#EDE9FE] p-4 shadow-sm sm:rounded-[24px] sm:p-5">
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-10 bg-[radial-gradient(#8B5CF6_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 min-w-0 flex-1">
          <p className="text-[11px] font-bold text-[#7C3AED] opacity-90 sm:text-[12px]">
            Your Current Plan
          </p>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[20px] font-extrabold tracking-tight text-[#5B21B6] sm:text-[24px]">
              {memberPlan}
            </h2>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B5CF6] text-white shadow-sm">
              <Star className="h-3 w-3 fill-current stroke-none" />
            </span>
          </div>
          <p className="mt-1 text-[11px] font-bold text-[#7C3AED] opacity-75">
            {memberSince}
          </p>
        </div>

        <div className="relative z-10 hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/40 p-1.5 shadow-inner backdrop-blur-sm sm:flex">
          <img
            src={purpleStarPedestal}
            className="h-full w-full object-contain mix-blend-multiply transition hover:scale-105 duration-300"
            alt="Star Pedestal"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold text-[#111111]">
            Your Impact
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="flex min-h-[104px] min-w-0 flex-col justify-between rounded-[16px] border border-black/[0.03] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.01)] sm:min-h-[118px] sm:rounded-[20px] sm:p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAFDF4] text-[#10B981]">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="mt-2 min-w-0">
              <p className="truncate text-[13px] font-extrabold leading-none text-[#111111] sm:text-[14px]">
                {loadingInsights
                  ? "—"
                  : `₹${(impact?.totalBenefited ?? 0).toLocaleString("en-IN")}`}
              </p>
              <p className="mt-1 text-[9px] font-bold leading-tight text-[#10B981]">
                Benefited
              </p>
            </div>
          </div>

          <div className="flex min-h-[104px] min-w-0 flex-col justify-between rounded-[16px] border border-black/[0.03] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.01)] sm:min-h-[118px] sm:rounded-[20px] sm:p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
              <Target className="h-4 w-4" />
            </div>
            <div className="mt-2 min-w-0">
              <p className="truncate text-[13px] font-extrabold leading-none text-[#111111] sm:text-[14px]">
                {loadingInsights
                  ? "—"
                  : `₹${(impact?.totalCashback ?? 0).toLocaleString("en-IN")}`}
              </p>
              <p className="mt-1 text-[9px] font-bold leading-tight text-[#2563EB]">
                Cashbacks
              </p>
            </div>
          </div>

          <div className="flex min-h-[104px] min-w-0 flex-col justify-between rounded-[16px] border border-black/[0.03] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.01)] sm:min-h-[118px] sm:rounded-[20px] sm:p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF7ED] text-[#EA580C]">
              <Tag className="h-4 w-4" />
            </div>
            <div className="mt-2 min-w-0">
              <p className="truncate text-[13px] font-extrabold leading-none text-[#111111] sm:text-[14px]">
                {loadingInsights
                  ? "—"
                  : `₹${(impact?.totalDiscount ?? 0).toLocaleString("en-IN")}`}
              </p>
              <p className="mt-1 text-[9px] font-bold leading-tight text-[#EA580C]">
                Discounts
              </p>
            </div>
          </div>

          <div className="flex min-h-[104px] min-w-0 flex-col justify-between rounded-[16px] border border-black/[0.03] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.01)] sm:min-h-[118px] sm:rounded-[20px] sm:p-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FAF5FF] text-[#9333EA]">
              <Gift className="h-4 w-4" />
            </div>
            <div className="mt-2 min-w-0">
              <p className="truncate text-[13px] font-extrabold leading-none text-[#111111] sm:text-[14px]">
                {loadingInsights ? "—" : (impact?.rewardsCount ?? 0)}
              </p>
              <p className="mt-1 text-[9px] font-bold leading-tight text-[#9333EA]">
                Rewards
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold text-[#111111]">
            Your Activities
          </h3>
          <button
            type="button"
            className="text-[11px] font-bold text-[#4F46E5] flex items-center gap-0.5 hover:underline cursor-pointer"
            onClick={() => navigate("/activities")}
          >
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="divide-y divide-black/[0.03] rounded-[20px] border border-black/[0.03] bg-white px-3 py-2 shadow-sm sm:rounded-[24px] sm:px-4 sm:py-3">
          {activitiesStats.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex min-w-0 items-center justify-between gap-2 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${item.bg}`}
                    style={{ color: item.color }}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-extrabold text-[#111111]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-[#9CA3AF]">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-right sm:gap-4">
                  <span className="text-[12px] font-extrabold text-[#111111]">
                    {loadingInsights ? "—" : item.count}
                  </span>
                  <span className="flex min-w-0 items-center justify-end gap-0.5 text-[9px] font-extrabold text-[#10B981] sm:min-w-[70px]">
                    {loadingInsights
                      ? "—"
                      : `+₹${item.benefit.toLocaleString("en-IN")}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MembershipOnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const customer = useAuthStore((s) => s.customer);
  const setCustomer = useAuthStore((s) => s.setCustomer);
  const [plans, setPlans] = useState<MembershipPlan[]>(
    FALLBACK_MEMBERSHIP_PLANS,
  );
  const [selected, setSelected] = useState<MembershipPlanId>("general");
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const isOnboarding = location.pathname.startsWith("/onboarding");

  const [activeTab, setActiveTab] = useState<"plans" | "insights">(() => {
    if (isOnboarding) return "plans";
    return customer?.membershipType && customer.membershipType !== "none"
      ? "insights"
      : "plans";
  });

  useEffect(() => {
    let active = true;
    void authApi
      .getMembershipPlans()
      .then(({ data }) => {
        if (!active) return;
        const apiPlans = Array.isArray(data.data)
          ? data.data.map(mapApiPlanToMembershipPlan)
          : [];
        if (apiPlans.length > 0) {
          setPlans(apiPlans);
          setSelected(apiPlans[0].id);
        }
      })
      .catch(() => {
        if (!active) return;
        setPlans(FALLBACK_MEMBERSHIP_PLANS);
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedPlan = useMemo(
    () => getMembershipPlan(selected, plans),
    [selected, plans],
  );

  const finishOnboarding = async (
    membershipType: MembershipPlanId | "none",
    couponCode?: string,
  ) => {
    setLoading(true);
    try {
      if (membershipType === "none") {
        const { data } = await authApi.updateProfile({
          membershipType: "none",
          onboardingCompleted: true,
        });
        if (data.data) setCustomer(data.data);
        await Swal.fire({
          icon: "success",
          title: "Welcome!",
          timer: 1600,
          showConfirmButton: false,
        });
        navigate("/home", { replace: true });
        return;
      }

      // Load Razorpay SDK first
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        throw new Error("Failed to load Razorpay. Check your internet connection and try again.");
      }

      const { data } = await authApi.initiateRazorpayPayment({
        membershipType,
        ...(couponCode ? { couponCode } : {}),
      });

      const payload = data.data;
      if (!payload) {
        throw new Error(data.message || "Could not start payment");
      }

      // Fully discounted — already activated server-side
      if (payload.mode === "free" && payload.activated) {
        if (payload.customer) setCustomer(payload.customer);
        await Swal.fire({
          icon: "success",
          title: "Membership activated",
          text: data.message || "No payment due",
          timer: 2000,
          showConfirmButton: false,
        });
        navigate("/home", { replace: true });
        return;
      }

      if (payload.mode === "razorpay" && payload.orderId && payload.keyId) {
        // Open Razorpay checkout widget
        await new Promise<void>((resolve, reject) => {
          openRazorpayCheckout({
            keyId: payload.keyId!,
            orderId: payload.orderId!,
            amount: payload.amount ?? (payload.amountInRupees ?? 0) * 100,
            description: `${payload.plan?.planName ?? "Membership"} Plan`,
            prefill: {
              name: payload.customer?.name,
              email: payload.customer?.email,
              contact: payload.customer?.mobile,
            },
            onSuccess: async (response) => {
              try {
                await authApi.verifyRazorpayPayment({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            onDismiss: () => reject(new Error("DISMISSED")),
            onError: (desc) => reject(new Error(desc)),
          });
        });

        await Swal.fire({
          icon: "success",
          title: "Membership activated!",
          text: "Your membership is now active.",
          timer: 2000,
          showConfirmButton: false,
        });
        navigate("/home", { replace: true });
        return;
      }

      throw new Error("Unexpected payment response");
    } catch (error) {
      // User closed the Razorpay modal — silent, no error popup
      if (error instanceof Error && error.message === "DISMISSED") return;
      await Swal.fire({
        icon: "error",
        title: "Something went wrong",
        text: getErrorMessage(error, "Could not complete onboarding"),
      });
    } finally {
      setLoading(false);
    }
  };

  const onSkip = async () => {
    const result = await Swal.fire({
      title: "Skip membership?",
      text: "You can upgrade anytime from Home.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, skip",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#111111",
      cancelButtonColor: "#9CA3AF",
    });
    if (result.isConfirmed) await finishOnboarding("none");
  };

  const onContinue = () => setCheckoutOpen(true);

  const onPay = async (couponCode?: string, payableAmount?: number) => {
    const plan = getMembershipPlan(selected, plans);
    const amount = payableAmount ?? plan.price;
    const result = await Swal.fire({
      title: `Pay ₹ ${amount}?`,
      text: couponCode
        ? `Confirm purchase of ${plan.title} with coupon ${couponCode}.`
        : `Confirm purchase of ${plan.title} membership.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Pay ₹ ${amount}`,
      cancelButtonText: "Cancel",
      confirmButtonColor: "#111111",
      cancelButtonColor: "#9CA3AF",
    });
    if (!result.isConfirmed) return;
    setCheckoutOpen(false);
    await finishOnboarding(selected, couponCode);
  };

  return (
    <div className="min-h-dvh overflow-x-clip bg-[#F7F8FA]">
      <div
        className={`mx-auto w-full max-w-lg px-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 sm:pt-5 lg:max-w-5xl lg:px-8 lg:py-8 ${
          activeTab === "plans"
            ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8"
            : "pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:pb-8"
        }`}
      >
        <div className="relative mb-3 flex items-center justify-between gap-2 sm:mb-4">
          {!isOnboarding ? (
            <>
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/home")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
                  aria-label="Go back"
                >
                  <ChevronLeft
                    className="h-5 w-5 text-[#111111]"
                    strokeWidth={2.5}
                  />
                </button>
                <h1 className="truncate text-[17px] font-extrabold text-[#111111] sm:text-[20px]">
                  Membership Plan
                </h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  Swal.fire({
                    title: "About WooWoo Membership",
                    html: `
                      <div class="text-left text-sm text-[#4B5563] space-y-2 leading-relaxed">
                        <p>WooWoo memberships support your creative journey with exceptional value:</p>
                        <ul class="list-disc pl-5 space-y-1 font-medium">
                          <li><strong>Assured Discounts:</strong> Save on art supplies in our Store and on space bookings.</li>
                          <li><strong>Cashback Rewards:</strong> Earn cashbacks credited directly to your wallet.</li>
                          <li><strong>Perks Tracking:</strong> Manage your benefits in real-time from the Insights section.</li>
                        </ul>
                      </div>
                    `,
                    confirmButtonText: "Got it",
                    confirmButtonColor: "#111111",
                  });
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
                aria-label="Info"
              >
                <Info className="h-5 w-5 text-[#111111]" strokeWidth={2.2} />
              </button>
            </>
          ) : (
            <>
              <h1 className="min-w-0 truncate text-[20px] font-bold tracking-tight text-[#111111] sm:text-[22px]">
                Membership Plan
              </h1>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={onSkip}
                  disabled={loading}
                  className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-[#3B82F6] sm:px-3"
                >
                  Skip
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2F7] text-[#4B5563]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-[#374151] hover:bg-slate-50"
                        onClick={() => {
                          setMenuOpen(false);
                          toast.message("FAQs coming soon");
                        }}
                      >
                        <CircleHelp className="h-4 w-4" /> FAQs
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-[#374151] hover:bg-slate-50"
                        onClick={() => {
                          setMenuOpen(false);
                          toast.message("Help coming soon");
                        }}
                      >
                        <Headphones className="h-4 w-4" /> Help
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>

        {activeTab === "plans" ? (
          <p className="mb-4 max-w-xl text-[12px] font-medium leading-snug text-[#6B7280] sm:mb-5 sm:text-[13px]">
            Choose the plan that's right for your creative journey.
          </p>
        ) : null}

        {!isOnboarding && (
          <div className="mb-4 flex rounded-full border border-black/[0.04] bg-white p-1 shadow-[0_2px_8px_rgba(15,23,42,0.02)] sm:mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("plans")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-extrabold transition-all duration-200 cursor-pointer sm:gap-2 sm:py-2.5 sm:text-[14px] ${
                activeTab === "plans"
                  ? "bg-[#FFF7ED] text-[#EA580C] border border-[#FDBA74]/40 shadow-sm"
                  : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              <ShoppingBag
                className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                strokeWidth={2.2}
              />
              Plans
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("insights")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-extrabold transition-all duration-200 cursor-pointer sm:gap-2 sm:py-2.5 sm:text-[14px] ${
                activeTab === "insights"
                  ? "bg-[#FFF7ED] text-[#EA580C] border border-[#FDBA74]/40 shadow-sm"
                  : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              <TrendingUp
                className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                strokeWidth={2.2}
              />
              Insights
            </button>
          </div>
        )}

        {activeTab === "plans" ? (
          <>
            <div className="rounded-[20px] border border-[#E8EEF5] bg-white p-3 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:rounded-[24px] sm:p-4 lg:p-6">
              {loadingPlans ? (
                <div className="rounded-[18px] p-6 text-center text-sm text-slate-500">
                  Loading membership plans...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-6">
                  {plans.map((plan) => (
                    <MembershipCard
                      key={plan.id}
                      plan={plan}
                      selected={selected === plan.id}
                      onSelect={() => setSelected(plan.id)}
                      onSeeBenefits={() => {
                        setSelected(plan.id);
                        setBenefitsOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E7EB] bg-white/95 px-3 py-3 backdrop-blur [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <div className="mx-auto w-full max-w-lg lg:max-w-md">
                <Button
                  type="button"
                  loading={loading}
                  onClick={onContinue}
                  className="relative w-full rounded-[14px] bg-[#111111] px-10 py-3.5 text-[14px] font-semibold hover:bg-black sm:py-4"
                >
                  <span>Continue · ₹ {selectedPlan.price}</span>
                  <ArrowRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 sm:right-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <InsightsTab customer={customer} />
        )}
      </div>

      <BenefitsSheet
        plan={selectedPlan}
        open={benefitsOpen}
        onClose={() => setBenefitsOpen(false)}
        onContinue={() => {
          setBenefitsOpen(false);
          setCheckoutOpen(true);
        }}
      />
      <CheckoutSheet
        plan={selectedPlan}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onPay={onPay}
        loading={loading}
      />
    </div>
  );
}
