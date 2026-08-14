import {useEffect, useMemo, useState} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Crown,
  DollarSign,
  Gift,
  GraduationCap,
  Headphones,
  Home,
  Info,
  Lock,
  MoreVertical,
  ShieldCheck,
  ShoppingBag,
  Soup,
  Star,
  Tag,
  Target,
  TrendingUp,
  User,
  Wrench,
  X,
} from 'lucide-react';
import purpleStarPedestal from '../../assets/purple_star_pedestal.jpg';
import {toast} from 'sonner';
import {Button} from '../../components/ui/Button';
import {
  FALLBACK_MEMBERSHIP_PLANS,
  getMembershipPlan,
  mapApiPlanToMembershipPlan,
  type MembershipPlan,
  type MembershipPlanId,
} from '../../data/membershipPlans';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';
import {useAuthStore} from '../../store/authStore';
import {useIsDesktop} from '../../hooks/useIsDesktop';
import {redirectToPayu} from '../../utils/payuCheckout';
import type { ActivityInsights } from '../../types/auth';

function PlanIcon({
  iconKey,
  className,
}: {
  iconKey?: MembershipPlan['iconKey'];
  className?: string;
}) {
  if (iconKey === 'star') return <Star className={className} strokeWidth={2} />;
  if (iconKey === 'graduation') return <GraduationCap className={className} strokeWidth={2} />;
  if (iconKey === 'crown') return <Crown className={className} strokeWidth={2} />;
  return <User className={className} strokeWidth={2} />;
}

function DiscountIcon({type}: {type: 'store' | 'space'}) {
  if (type === 'store') return <ShoppingBag className="h-3 w-3 shrink-0" />;
  return <Home className="h-3 w-3 shrink-0" />;
}

function MembershipCard({
  plan,
  selected,
  onSelect,
}: {
  plan: MembershipPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[18px] border-2 bg-white p-3.5 text-left shadow-sm transition ${
        selected ? plan.theme.borderSelected : plan.theme.border
      }`}
    >
      {/* Top Header Row: Icon, Title, Badge, and Radio selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[8px] ${plan.theme.iconBg} ${plan.theme.iconText}`}
          >
            <PlanIcon iconKey={plan.iconKey} className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className={`text-[14px] font-bold ${plan.theme.title}`}>{plan.title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan.theme.badgeBg} ${plan.theme.badgeText}`}
            >
              {plan.badge}
            </span>
          </div>
        </div>

        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? plan.theme.radio : 'border-slate-300 text-transparent'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${selected ? 'bg-current' : ''}`} />
        </span>
      </div>

      {/* Bottom Section: Bulletins list starting just below the icon + Price on the right */}
      <div className="mt-2.5 flex justify-between items-start gap-4">
        <ul className="min-w-0 flex-1">
          {plan.features.map(feature => (
            <li
              key={feature.label}
              className="flex items-start gap-1.5 py-1.5 text-[11px] text-[#374151]"
            >
              <Check
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${plan.theme.check}`}
                strokeWidth={2.5}
              />
              <span className="leading-snug">
                {feature.label}
                {feature.was ? (
                  <span className="ml-1 text-[10px] text-[#9CA3AF] line-through">
                    ₹{feature.was}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <div className="shrink-0 pt-1 text-right">
          <p className="text-[16px] font-bold leading-none text-[#111111]">₹ {plan.price}</p>
        </div>
      </div>

      <div className="mt-3 flex w-full flex-row items-stretch gap-2">
        <div className="min-w-0 flex-1 rounded-[12px] bg-[#F8FAFC] p-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Discounts (Assured)
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {plan.discounts.map(d => (
              <span
                key={d.label}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-white px-1.5 py-1 text-[10px] font-medium text-[#374151] shadow-sm"
              >
                <DiscountIcon type={d.icon} />
                {d.label}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-[12px] bg-[#F8FAFC] p-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Cashback (Assured)
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-white px-1.5 py-1 text-[10px] font-medium text-[#374151] shadow-sm">
              <span className="text-[11px] font-bold text-[#2563EB]">₹</span>
              {plan.cashback}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function CheckoutSheet({
  plan,
  open,
  onClose,
  onPay,
  loading,
}: {
  plan: MembershipPlan;
  open: boolean;
  onClose: () => void;
  onPay: (couponCode?: string, payableAmount?: number) => void;
  loading: boolean;
}) {
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<{
    code: string;
    title: string;
    discountAmount: number;
    payableAmount: number;
  } | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCoupon('');
    setApplied(null);
    setValidating(false);
  }, [open, plan.id]);

  if (!open) return null;

  const discount = applied?.discountAmount ?? 0;
  const total = applied?.payableAmount ?? plan.price;

  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) {
      toast.error('Enter a coupon code');
      return;
    }
    setValidating(true);
    try {
      const {data} = await authApi.validateCoupon({
        code,
        membershipType: plan.id,
      });
      if (!data.data) {
        toast.error(data.message || 'Invalid coupon');
        setApplied(null);
        return;
      }
      setApplied({
        code: data.data.code,
        title: data.data.title,
        discountAmount: data.data.discountAmount,
        payableAmount: data.data.payableAmount,
      });
      setCoupon(data.data.code);
      toast.success(data.message || 'Coupon applied');
    } catch (error) {
      setApplied(null);
      toast.error(getErrorMessage(error, 'Invalid coupon'));
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close checkout"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
        <div className="relative shrink-0 px-5 pb-1 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#D1D5DB]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5 pt-2">
          <h2 className="text-[20px] font-bold text-[#111111]">Checkout</h2>

          <div className={`mt-4 flex items-center gap-3 rounded-[16px] border p-3 ${plan.theme.border}`}>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${plan.theme.iconBg} ${plan.theme.iconText}`}
            >
              <PlanIcon iconKey={plan.iconKey} className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[14px] font-bold ${plan.theme.title}`}>{plan.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan.theme.badgeBg} ${plan.theme.badgeText}`}
                >
                  {plan.badge}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-[#6B7280]">{plan.description}</p>
            </div>
            <p className="text-[14px] font-bold text-[#111111]">₹{plan.price}</p>
          </div>

          <div className="mt-5 space-y-2.5 text-[13px]">
            <div className="flex justify-between text-[#4B5563]">
              <span>Subtotal</span>
              <span>₹ {plan.price}</span>
            </div>
            <div className="flex justify-between text-[#4B5563]">
              <span className="inline-flex items-center gap-1">
                Platform Fee <Info className="h-3.5 w-3.5 text-[#9CA3AF]" />
              </span>
              <span>₹ 0</span>
            </div>
            {applied ? (
              <div className="flex justify-between text-[#16A34A]">
                <span>Coupon ({applied.code})</span>
                <span>- ₹ {discount}</span>
              </div>
            ) : null}
            <div className="border-t border-dashed border-[#E5E7EB] pt-2.5">
              <div className="flex justify-between font-semibold">
                <span>Total Amount</span>
                <span className="text-[#2563EB]">₹ {total}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-2.5">
            <Tag className="h-4 w-4 text-[#9CA3AF]" />
            <input
              value={coupon}
              onChange={e => {
                setCoupon(e.target.value);
                setApplied(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void applyCoupon();
                }
              }}
              placeholder="Enter coupon code"
              className="w-full border-0 bg-transparent text-[13px] outline-none placeholder:text-[#9CA3AF]"
            />
            <button
              type="button"
              disabled={validating}
              onClick={() => void applyCoupon()}
              className="shrink-0 text-[12px] font-semibold text-[#6B7280] disabled:opacity-50"
            >
              {validating ? '...' : 'Apply'}
            </button>
          </div>
          {applied?.title ? (
            <p className="mt-1.5 text-[11px] text-[#16A34A]">{applied.title} applied</p>
          ) : null}

          <div className="mt-3 flex max-h-11 items-center gap-2 rounded-[10px] bg-[#EFF6FF] px-2.5 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" strokeWidth={2} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[11px] font-semibold text-[#111111]">Secure & Safe Payment</p>
              <p className="truncate text-[9px] text-[#6B7280]">
                Your payment details are encrypted and 100% secure.
              </p>
            </div>
            <span className="shrink-0 text-[9px] font-semibold text-[#15803D]">
              Trusted by 10K+
            </span>
          </div>

          <Button
            type="button"
            loading={loading}
            onClick={() => onPay(applied?.code, total)}
            className="relative mt-4 w-full rounded-[14px] bg-[#111111] py-4 text-[14px] font-semibold hover:bg-black"
          >
            <Lock className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <span>Pay ₹ {total}</span>
            <ArrowRight className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function InsightsTab({
  customer,
}: {
  customer: any;
}) {
  const navigate = useNavigate();
  const isMember = customer?.membershipType && customer.membershipType !== 'none';
  const memberPlan = isMember
    ? String(customer.membershipType).toUpperCase()
    : 'SPECIAL';

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
          toast.error(getErrorMessage(error, 'Failed to load insights'));
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
        return `Member since ${date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        })}`;
      } catch {
        // ignore
      }
    }
    return 'Member since Jan 2024';
  }, [customer?.createdAt]);

  const activitiesStats = useMemo(() => {
    const stats = insights?.activities;
    return [
      {
        id: 'shopping',
        title: 'Shopping',
        subtitle: 'Orders & Purchases',
        count: stats?.shopping.count ?? 0,
        benefit: stats?.shopping.benefit ?? 0,
        icon: ShoppingBag,
        color: '#EA580C',
        bg: 'bg-[#FFF7ED]',
      },
      {
        id: 'services',
        title: 'Services',
        subtitle: 'Custom Framings & Scans',
        count: stats?.services.count ?? 0,
        benefit: stats?.services.benefit ?? 0,
        icon: Wrench,
        color: '#9333EA',
        bg: 'bg-[#FAF5FF]',
      },
      {
        id: 'space',
        title: 'Space Bookings',
        subtitle: 'Studio & Room Rentals',
        count: stats?.space.count ?? 0,
        benefit: stats?.space.benefit ?? 0,
        icon: Calendar,
        color: '#16A34A',
        bg: 'bg-[#EAFDF4]',
      },
      {
        id: 'food',
        title: 'Food & Cafe',
        subtitle: 'Cafe Orders & Combos',
        count: stats?.food.count ?? 0,
        benefit: stats?.food.benefit ?? 0,
        icon: Soup,
        color: '#EF4444',
        bg: 'bg-[#FEF2F2]',
      },
    ];
  }, [insights]);

  const impact = insights?.impact;

  return (
    <div className="space-y-6 text-left">
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#F5F3FF] to-[#EDE9FE] border border-[#DDD6FE] p-5 flex items-center justify-between shadow-sm">
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-10 bg-[radial-gradient(#8B5CF6_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex-1">
          <p className="text-[12px] font-bold text-[#7C3AED] opacity-90">
            Your Current Plan
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <h2 className="text-[24px] font-extrabold text-[#5B21B6] tracking-tight">
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

        <div className="relative z-10 flex h-15 w-18 shrink-0 items-center justify-center rounded-2xl bg-white/40 backdrop-blur-sm p-1.5 shadow-inner">
          <img
            src={purpleStarPedestal}
            className="h-full w-full object-contain mix-blend-multiply transition hover:scale-105 duration-300"
            alt="Star Pedestal"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold text-[#111111]">Your Impact</h3>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="border border-black/[0.03] bg-white rounded-[20px] p-4.5 flex flex-col justify-between h-[118px] shadow-[0_2px_8px_rgba(15,23,42,0.01)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAFDF4] text-[#10B981]">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="mt-2">
              <p className="text-[14px] font-extrabold text-[#111111] leading-none">
                {loadingInsights
                  ? '—'
                  : `₹${(impact?.totalBenefited ?? 0).toLocaleString('en-IN')}`}
              </p>
              <p className="text-[9px] font-bold text-[#10B981] leading-tight mt-1">
                Benefited
              </p>
            </div>
          </div>

          <div className="border border-black/[0.03] bg-white rounded-[20px] p-4.5 flex flex-col justify-between h-[118px] shadow-[0_2px_8px_rgba(15,23,42,0.01)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
              <Target className="h-4 w-4" />
            </div>
            <div className="mt-2">
              <p className="text-[14px] font-extrabold text-[#111111] leading-none">
                {loadingInsights
                  ? '—'
                  : `₹${(impact?.totalCashback ?? 0).toLocaleString('en-IN')}`}
              </p>
              <p className="text-[9px] font-bold text-[#2563EB] leading-tight mt-1">
                Cashbacks
              </p>
            </div>
          </div>

          <div className="border border-black/[0.03] bg-white rounded-[20px] p-4.5 flex flex-col justify-between h-[118px] shadow-[0_2px_8px_rgba(15,23,42,0.01)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF7ED] text-[#EA580C]">
              <Tag className="h-4 w-4" />
            </div>
            <div className="mt-2">
              <p className="text-[14px] font-extrabold text-[#111111] leading-none">
                {loadingInsights
                  ? '—'
                  : `₹${(impact?.totalDiscount ?? 0).toLocaleString('en-IN')}`}
              </p>
              <p className="text-[9px] font-bold text-[#EA580C] leading-tight mt-1">
                Discounts
              </p>
            </div>
          </div>

          <div className="border border-black/[0.03] bg-white rounded-[20px] p-4.5 flex flex-col justify-between h-[118px] shadow-[0_2px_8px_rgba(15,23,42,0.01)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FAF5FF] text-[#9333EA]">
              <Gift className="h-4 w-4" />
            </div>
            <div className="mt-2">
              <p className="text-[14px] font-extrabold text-[#111111] leading-none">
                {loadingInsights ? '—' : impact?.rewardsCount ?? 0}
              </p>
              <p className="text-[9px] font-bold text-[#9333EA] leading-tight mt-1">
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
            onClick={() => navigate('/activities')}
          >
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-[24px] border border-black/[0.03] px-4 py-3 divide-y divide-black/[0.03] shadow-sm">
          {activitiesStats.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${item.bg}`}
                    style={{color: item.color}}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[12px] font-extrabold text-[#111111]">
                      {item.title}
                    </p>
                    <p className="text-[10px] font-semibold text-[#9CA3AF] mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-[12px] font-extrabold text-[#111111]">
                    {loadingInsights ? '—' : item.count}
                  </span>
                  <span className="text-[9px] font-extrabold text-[#10B981] flex items-center gap-0.5 min-w-[70px] justify-end">
                    {loadingInsights
                      ? '—'
                      : `+₹${item.benefit.toLocaleString('en-IN')}`}
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
  const customer = useAuthStore(s => s.customer);
  const setCustomer = useAuthStore(s => s.setCustomer);
  const isDesktop = useIsDesktop();
  const [plans, setPlans] = useState<MembershipPlan[]>(FALLBACK_MEMBERSHIP_PLANS);
  const [selected, setSelected] = useState<MembershipPlanId>('general');
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const isOnboarding = location.pathname.startsWith('/onboarding');

  const [activeTab, setActiveTab] = useState<'plans' | 'insights'>(() => {
    if (isOnboarding) return 'plans';
    return customer?.membershipType && customer.membershipType !== 'none' ? 'insights' : 'plans';
  });

  useEffect(() => {
    let active = true;
    void authApi
      .getMembershipPlans()
      .then(({data}) => {
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
    membershipType: MembershipPlanId | 'none',
    couponCode?: string,
  ) => {
    setLoading(true);
    try {
      if (membershipType === 'none') {
        const {data} = await authApi.updateProfile({
          membershipType: 'none',
          onboardingCompleted: true,
        });
        if (data.data) setCustomer(data.data);
        await Swal.fire({
          icon: 'success',
          title: 'Welcome!',
          timer: 1600,
          showConfirmButton: false,
        });
        navigate('/home', {replace: true});
        return;
      }

      const {data} = await authApi.initiatePayuPayment({
        membershipType,
        ...(couponCode ? {couponCode} : {}),
      });

      const payload = data.data;
      if (!payload) {
        throw new Error(data.message || 'Could not start payment');
      }

      // Fully discounted — already activated server-side
      if (payload.mode === 'free' && payload.activated) {
        if (payload.customer) setCustomer(payload.customer);
        await Swal.fire({
          icon: 'success',
          title: 'Membership activated',
          text: data.message || 'No payment due',
          timer: 2000,
          showConfirmButton: false,
        });
        navigate('/home', {replace: true});
        return;
      }

      if (payload.mode === 'payu' && payload.paymentUrl && payload.params) {
        redirectToPayu(payload.paymentUrl, payload.params);
        return;
      }

      throw new Error('Unexpected payment response');
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Something went wrong',
        text: getErrorMessage(error, 'Could not complete onboarding'),
      });
    } finally {
      setLoading(false);
    }
  };

  const onSkip = async () => {
    const result = await Swal.fire({
      title: 'Skip membership?',
      text: 'You can upgrade anytime from Home.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, skip',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#111111',
      cancelButtonColor: '#9CA3AF',
    });
    if (result.isConfirmed) await finishOnboarding('none');
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
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Pay ₹ ${amount}`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#111111',
      cancelButtonColor: '#9CA3AF',
    });
    if (!result.isConfirmed) return;
    setCheckoutOpen(false);
    await finishOnboarding(selected, couponCode);
  };

  return (
    <div className="min-h-dvh bg-[#F7F8FA]">
      <div className={`mx-auto ${isDesktop ? 'max-w-3xl px-8 py-8' : `max-w-lg px-5 pt-5 ${activeTab === 'plans' ? 'pb-28' : 'pb-5'}`}`}>
        <div className="relative mb-6 flex items-center justify-between">
          {!isOnboarding ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/home')}
                  className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-5 w-5 text-[#111111]" strokeWidth={2.5} />
                </button>
                <h1 className="text-[18px] font-extrabold text-[#111111]">
                  Membership
                </h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  Swal.fire({
                    title: 'About WooWoo Membership',
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
                    confirmButtonText: 'Got it',
                    confirmButtonColor: '#111111',
                  });
                }}
                className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
                aria-label="Info"
              >
                <Info className="h-5 w-5 text-[#111111]" strokeWidth={2.2} />
              </button>
            </>
          ) : (
            <>
              <h1 className="text-[22px] font-bold tracking-tight text-[#111111]">Memberships</h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSkip}
                  disabled={loading}
                  className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-[#3B82F6]"
                >
                  Skip
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(v => !v)}
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
                          toast.message('FAQs coming soon');
                        }}
                      >
                        <CircleHelp className="h-4 w-4" /> FAQs
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-[#374151] hover:bg-slate-50"
                        onClick={() => {
                          setMenuOpen(false);
                          toast.message('Help coming soon');
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

        {!isOnboarding && (
          <div className="mb-6 flex rounded-full border border-black/[0.04] bg-white p-1 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[14px] font-extrabold transition-all duration-200 cursor-pointer ${
                activeTab === 'plans'
                  ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#FDBA74]/40 shadow-sm'
                  : 'text-[#6B7280] hover:text-[#374151]'
              }`}
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.2} />
              Plans
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('insights')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[14px] font-extrabold transition-all duration-200 cursor-pointer ${
                activeTab === 'insights'
                  ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#FDBA74]/40 shadow-sm'
                  : 'text-[#6B7280] hover:text-[#374151]'
              }`}
            >
              <TrendingUp className="h-[18px] w-[18px]" strokeWidth={2.2} />
              Insights
            </button>
          </div>
        )}

        {activeTab === 'plans' ? (
          <>
            <div className={`space-y-3 ${isDesktop ? 'grid grid-cols-2 gap-3 space-y-0' : ''}`}>
              {loadingPlans ? (
                <div className="rounded-[18px] border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  Loading membership plans...
                </div>
              ) : (
                plans.map(plan => (
                  <MembershipCard
                    key={plan.id}
                    plan={plan}
                    selected={selected === plan.id}
                    onSelect={() => setSelected(plan.id)}
                  />
                ))
              )}
            </div>

            <div
              className={`${
                isDesktop
                  ? 'mt-8'
                  : 'fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E7EB] bg-white/95 px-5 py-4 backdrop-blur'
              }`}
            >
              <div className={isDesktop ? '' : 'mx-auto max-w-lg'}>
                <Button
                  type="button"
                  loading={loading}
                  onClick={onContinue}
                  className="relative w-full rounded-[14px] bg-[#111111] py-4 text-[14px] font-semibold hover:bg-black"
                >
                  <span>Continue · ₹ {selectedPlan.price}</span>
                  <ArrowRight className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <InsightsTab
            customer={customer}
          />
        )}
      </div>

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
