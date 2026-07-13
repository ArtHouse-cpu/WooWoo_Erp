import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  ArrowRight,
  Check,
  CircleHelp,
  Crown,
  GraduationCap,
  Headphones,
  Home,
  Info,
  Lock,
  MoreVertical,
  ShieldCheck,
  ShoppingBag,
  Star,
  Tag,
  User,
  X,
} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '../../components/ui/Button';
import {
  getMembershipPlan,
  MEMBERSHIP_PLANS,
  type MembershipPlan,
  type MembershipPlanId,
} from '../../data/membershipPlans';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';
import {useAuthStore} from '../../store/authStore';
import {useIsDesktop} from '../../hooks/useIsDesktop';

function PlanIcon({id, className}: {id: MembershipPlanId; className?: string}) {
  if (id === 'general') return <User className={className} strokeWidth={2} />;
  if (id === 'special') return <Star className={className} strokeWidth={2} />;
  if (id === 'junior') return <GraduationCap className={className} strokeWidth={2} />;
  return <Crown className={className} strokeWidth={2} />;
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
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${plan.theme.iconBg} ${plan.theme.iconText}`}
        >
          <PlanIcon id={plan.id} className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className={`text-[14px] font-bold ${plan.theme.title}`}>{plan.title}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan.theme.badgeBg} ${plan.theme.badgeText}`}
              >
                {plan.badge}
              </span>
            </div>
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                selected ? plan.theme.radio : 'border-slate-300 text-transparent'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${selected ? 'bg-current' : ''}`} />
            </span>
          </div>

          <div className="mt-2 flex gap-2">
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
        </div>
      </div>

      <div className="mt-3 flex w-full flex-row items-stretch gap-2">
        <div className="min-w-0 flex-1 rounded-[12px] bg-[#F8FAFC] p-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Discounts (Assured)
          </p>
          <div className="mt-1.5 flex flex-nowrap items-center gap-1.5">
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
          <div className="mt-1.5">
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
  planId,
  open,
  onClose,
  onPay,
  loading,
}: {
  planId: MembershipPlanId;
  open: boolean;
  onClose: () => void;
  onPay: (coupon?: string) => void;
  loading: boolean;
}) {
  const plan = getMembershipPlan(planId);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState(false);

  if (!open) return null;

  const discount = applied ? Math.round(plan.price * 0.1) : 0;
  const total = Math.max(0, plan.price - discount);

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
              <PlanIcon id={plan.id} className="h-4 w-4" />
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
                <span>Coupon (10%)</span>
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
                setApplied(false);
              }}
              placeholder="Enter coupon code"
              className="w-full border-0 bg-transparent text-[13px] outline-none placeholder:text-[#9CA3AF]"
            />
            <button
              type="button"
              onClick={() => {
                if (!coupon.trim()) {
                  toast.error('Enter a coupon code');
                  return;
                }
                setApplied(true);
                toast.success('Coupon applied');
              }}
              className="shrink-0 text-[12px] font-semibold text-[#6B7280]"
            >
              Apply
            </button>
          </div>

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
            onClick={() => onPay(applied ? coupon : undefined)}
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

export default function MembershipOnboardingPage() {
  const navigate = useNavigate();
  const setCustomer = useAuthStore(s => s.setCustomer);
  const isDesktop = useIsDesktop();
  const [selected, setSelected] = useState<MembershipPlanId>('general');
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedPlan = useMemo(() => getMembershipPlan(selected), [selected]);

  const finishOnboarding = async (membershipType: MembershipPlanId | 'none') => {
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
      } else {
        const {data} = await authApi.activateMembership({membershipType});
        if (data.data) setCustomer(data.data);
        await Swal.fire({
          icon: 'success',
          title: 'Membership activated',
          text: data.message || 'Confirmation sent on WhatsApp',
          timer: 2000,
          showConfirmButton: false,
        });
      }
      navigate('/home', {replace: true});
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

  const onPay = async () => {
    const plan = getMembershipPlan(selected);
    const result = await Swal.fire({
      title: `Pay ₹ ${plan.price}?`,
      text: `Confirm purchase of ${plan.title} membership.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Pay ₹ ${plan.price}`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#111111',
      cancelButtonColor: '#9CA3AF',
    });
    if (!result.isConfirmed) return;
    setCheckoutOpen(false);
    await finishOnboarding(selected);
  };

  return (
    <div className="min-h-dvh bg-[#F7F8FA]">
      <div className={`mx-auto ${isDesktop ? 'max-w-3xl px-8 py-8' : 'max-w-lg px-5 pb-28 pt-5'}`}>
        <div className="relative mb-4 flex items-center justify-between">
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
        </div>

        <div className={`space-y-3 ${isDesktop ? 'grid grid-cols-2 gap-3 space-y-0' : ''}`}>
          {MEMBERSHIP_PLANS.map(plan => (
            <MembershipCard
              key={plan.id}
              plan={plan}
              selected={selected === plan.id}
              onSelect={() => setSelected(plan.id)}
            />
          ))}
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
      </div>

      <CheckoutSheet
        planId={selected}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onPay={onPay}
        loading={loading}
      />
    </div>
  );
}
