import {useEffect, useState} from 'react';
import {
  ArrowRight,
  Check,
  Crown,
  Gem,
  GraduationCap,
  Info,
  Lock,
  ShieldCheck,
  Star,
  Tag,
  User,
  X,
} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '../../components/ui/Button';
import type {MembershipPlan} from '../../data/membershipPlans';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';

const CATEGORY_STYLES: Record<
  string,
  {card: string; icon: string; accent: string; letter: string}
> = {
  food: {
    card: 'bg-[#FFF9F5]',
    icon: 'bg-[#FFF0E8] text-[#F97316]',
    accent: 'text-[#F97316]',
    letter: 'F',
  },
  space: {
    card: 'bg-[#F6FBF8]',
    icon: 'bg-[#E8F5EC] text-[#16A34A]',
    accent: 'text-[#16A34A]',
    letter: 'S',
  },
  products: {
    card: 'bg-[#FAF8FF]',
    icon: 'bg-[#F0E9FF] text-[#8B5CF6]',
    accent: 'text-[#8B5CF6]',
    letter: 'P',
  },
  services: {
    card: 'bg-[#F7F9FF]',
    icon: 'bg-[#E9EEFF] text-[#4F6FF5]',
    accent: 'text-[#4F6FF5]',
    letter: 'S',
  },
};

const PROGRAM_COLORS: Record<string, string> = {
  CSP: 'text-[#7C3AED]',
  HAP: 'text-[#2563EB]',
  CVP: 'text-[#F97316]',
};

export function PlanIcon({
  iconKey,
  className,
}: {
  iconKey?: MembershipPlan['iconKey'];
  className?: string;
}) {
  if (iconKey === 'star') return <Star className={className} strokeWidth={2} />;
  if (iconKey === 'graduation') return <GraduationCap className={className} strokeWidth={2} />;
  if (iconKey === 'crown') return <Crown className={className} strokeWidth={2} />;
  if (iconKey === 'diamond') return <Gem className={className} strokeWidth={2} />;
  return <User className={className} strokeWidth={2} />;
}

export function formatUptoPercent(raw: string | number | undefined) {
  const text = String(raw ?? '');
  const match = text.match(/(\d+(?:\.\d+)?)/);
  const value = match ? match[1] : '0';
  return `Upto ${value}%`;
}

export function maxDiscountUpto(plan: MembershipPlan) {
  const percents = [
    ...(plan.categories || []).map(c => c.discountPercent),
    ...(plan.discounts || []).map(d => {
      const match = String(d.label).match(/(\d+(?:\.\d+)?)/);
      return match ? Number(match[1]) : NaN;
    }),
  ].filter(n => Number.isFinite(n));
  if (percents.length === 0) return 'Upto 0%';
  return `Upto ${Math.max(...percents)}%`;
}

function formatInr(value: number) {
  return Number(value || 0).toLocaleString('en-IN');
}

export function BenefitsSheet({
  plan,
  open,
  onClose,
  onContinue,
}: {
  plan: MembershipPlan;
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}) {
  if (!open) return null;

  const categories = plan.categories || [];
  const programs = plan.programs || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close benefits"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:mx-4 sm:max-h-[90dvh] sm:max-w-3xl sm:rounded-[28px]">
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-[#D1D5DB] sm:hidden" />
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-3 sm:px-5">
          <div className="mt-1 flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] sm:h-10 sm:w-10 ${plan.theme.iconBg} ${plan.theme.iconText}`}
              >
                <PlanIcon iconKey={plan.iconKey} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <h2
                    className={`truncate text-[16px] font-extrabold sm:text-[18px] ${plan.theme.title}`}
                  >
                    {plan.title}
                  </h2>
                  <span className="shrink-0 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#334155]">
                    {plan.badge}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-[#6B7280]">
                  {plan.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 font-bold">Discount & Cashback</div>
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {categories.map(category => {
              const style = CATEGORY_STYLES[category.key] || CATEGORY_STYLES.products;
              return (
                <div
                  key={category.key}
                  className={`rounded-[14px] border border-[#E8EEF5] p-3 ${style.card}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-[14px] font-bold ${style.icon}`}
                    >
                      {style.letter}
                    </div>
                    <p className="truncate text-[11px] font-semibold text-[#1E293B]">
                      {category.label}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] text-[#64748B]">Discount</p>
                      <p className={`mt-1 text-[13px] font-bold ${style.accent}`}>
                        {formatUptoPercent(category.discountPercent)}
                      </p>
                    </div>
                    <div className="h-7 w-px bg-[#E2E8F0]" />
                    <div className="min-w-0 flex-1 pl-3">
                      <p className="text-[8px] text-[#64748B]">Cashback</p>
                      <p className={`mt-1 text-[13px] font-bold ${style.accent}`}>
                        {formatUptoPercent(category.cashbackPercent)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-1.5">
              <h3 className="text-[13px] font-bold text-[#0F172A]">Programs Eligibility</h3>
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#94A3B8] text-[9px] font-bold text-[#64748B]">
                i
              </div>
            </div>

            <div className="overflow-hidden rounded-[12px] border border-[#E8EEF5] bg-white">
              <div className="grid grid-cols-3">
                {programs.map((program, index) => (
                  <div
                    key={program.key}
                    className={`flex flex-col items-center justify-center px-2 py-3 ${
                      index < programs.length - 1 ? 'border-r border-[#E8EEF5]' : ''
                    }`}
                  >
                    <p
                      className={`text-[13px] font-bold ${
                        PROGRAM_COLORS[program.key] || 'text-[#0F172A]'
                      }`}
                    >
                      {program.label}
                    </p>
                    <p className="mt-1 text-center text-[9px] font-medium text-[#475569]">
                      {program.subtitle}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      {program.eligible ? (
                        <>
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#16A34A] text-[10px] font-bold text-[#16A34A]">
                            ✓
                          </span>
                          <span className="text-[11px] font-semibold text-[#16A34A]">Yes</span>
                        </>
                      ) : (
                        <>
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#94A3B8] text-[10px] text-[#64748B]">
                            ×
                          </span>
                          <span className="text-[11px] font-semibold text-[#64748B]">No</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 rounded-[8px] bg-[#F4F6FF] px-3 py-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#E8EDFF] text-[#4F6FF5]">
                    <Tag className="h-3 w-3" />
                  </div>
                  <p className="text-[10px] leading-4 text-[#475569]">
                    <span className="font-bold text-[#4169E1]">Discount:</span> Applicable on
                    all bills with minimum shopping of ₹1 & above.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#E8EDFF] text-[#4F6FF5]">
                    <ShieldCheck className="h-3 w-3" />
                  </div>
                  <p className="text-[10px] leading-4 text-[#475569]">
                    <span className="font-bold text-[#4169E1]">Creative Seller Product:</span>{' '}
                    CSP items not eligible for discount & cashbacks.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#E8EDFF] text-[#4F6FF5]">
                    <Lock className="h-3 w-3" />
                  </div>
                  <p className="text-[10px] leading-4 text-[#475569]">
                    <span className="font-bold text-[#4169E1]">Cashback:</span> Credited to
                    wallet and redeemable on all future bills.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-[13px] font-bold text-[#0F172A]">Pricing & Tenure</h3>
            <div className="overflow-hidden rounded-[12px] border border-[#E8EEF5] bg-white">
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF3FF] text-[#4169E1]">
                    <Info className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-[#64748B]">Tenure</p>
                    <p className="text-[11px] font-bold text-[#0F172A]">{plan.tenure}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-[#64748B]">
                    Gross Amount (Original)
                  </p>
                  <p className="text-[11px] font-bold text-[#0F172A]">
                    ₹{formatInr(plan.grossAmount || plan.price)}
                  </p>
                </div>

                {plan.discountAmount > 0 ? (
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#64748B]">Discount</p>
                    <p className="text-[11px] font-bold text-[#319B67]">
                      - ₹{formatInr(plan.discountAmount)}
                    </p>
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="text-[12px] font-extrabold text-[#0F172A]">Final Payable</p>
                    {plan.discountAmount > 0 ? (
                      <span className="rounded-full bg-[#EAF7EF] px-2 py-0.5 text-[8px] font-bold text-[#319B67]">
                        You Save ₹{formatInr(plan.discountAmount)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[16px] font-extrabold text-[#0F172A]">
                    ₹{formatInr(plan.price)}
                  </p>
                </div>

                {plan.walletCashbackAmount > 0 ? (
                  <div className="mt-2 flex items-center justify-between rounded-[10px] bg-[#F1FAF5] px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-[#319B67]">
                        Cashback on Membership Purchase
                      </p>
                      <p className="text-[8px] text-[#64748B]">
                        Fixed amount credited to wallet instantly
                      </p>
                    </div>
                    <p className="shrink-0 text-[12px] font-extrabold text-[#319B67]">
                      ₹{formatInr(plan.walletCashbackAmount)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {plan.features.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {plan.features.map(feature => (
                <li
                  key={feature.label}
                  className="flex items-start gap-2 text-[13px] text-[#374151]"
                >
                  <Check
                    className={`mt-0.5 h-4 w-4 shrink-0 ${plan.theme.check}`}
                    strokeWidth={2.5}
                  />
                  <span>
                    {feature.label}
                    {feature.was ? (
                      <span className="ml-1 text-[11px] text-[#9CA3AF] line-through">
                        ₹{feature.was}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <a
            href="/membershipterms"
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center justify-between rounded-[9px] bg-[#F3F6FF] px-3 py-2.5"
          >
            <p className="text-[9px] font-medium text-[#64748B]">
              By continuing, you agree to our{' '}
              <span className="font-bold text-[#4169E1]">Terms & Conditions.</span>
            </p>
            <span className="text-[20px] leading-none text-[#64748B]">›</span>
          </a>
        </div>

        <div className="shrink-0 border-t border-[#E8EEF5] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-4">
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-[7px] bg-[#1448F5] py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#0F3FD6]"
          >
            Continue to Purchase
          </button>
        </div>
      </div>
    </div>
  );
}

export function CheckoutSheet({
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
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:mx-4 sm:rounded-[28px]">
        <div className="relative shrink-0 px-4 pb-1 pt-3 sm:px-5">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#D1D5DB]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] sm:right-4"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-5">
          <h2 className="text-[18px] font-bold text-[#111111] sm:text-[20px]">Checkout</h2>

          <div
            className={`mt-4 flex min-w-0 items-center gap-2.5 rounded-[16px] border p-2.5 sm:gap-3 sm:p-3 ${plan.theme.border}`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] sm:h-10 sm:w-10 ${plan.theme.iconBg} ${plan.theme.iconText}`}
            >
              <PlanIcon iconKey={plan.iconKey} className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                <span className={`truncate text-[13px] font-bold sm:text-[14px] ${plan.theme.title}`}>
                  {plan.title}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan.theme.badgeBg} ${plan.theme.badgeText}`}
                >
                  {plan.badge}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-[#6B7280]">{plan.description}</p>
            </div>
            <p className="shrink-0 text-[13px] font-bold text-[#111111] sm:text-[14px]">
              ₹{plan.price}
            </p>
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

          <div className="mt-4 flex min-w-0 items-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-2.5">
            <Tag className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
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
              className="min-w-0 w-full border-0 bg-transparent text-[16px] outline-none placeholder:text-[#9CA3AF] sm:text-[13px]"
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

          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#EFF6FF] px-2.5 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" strokeWidth={2} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[11px] font-semibold text-[#111111]">Secure & Safe Payment</p>
              <p className="truncate text-[9px] text-[#6B7280]">
                Your payment details are encrypted and 100% secure.
              </p>
            </div>
            <span className="hidden shrink-0 text-[9px] font-semibold text-[#15803D] sm:inline">
              Trusted by 10K+
            </span>
          </div>

          <Button
            type="button"
            loading={loading}
            onClick={() => onPay(applied?.code, total)}
            className="relative mt-4 w-full rounded-[14px] bg-[#111111] px-11 py-3.5 text-[14px] font-semibold hover:bg-black sm:px-12 sm:py-4"
          >
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 sm:left-5" />
            <span>Pay ₹ {total}</span>
            <ArrowRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 sm:right-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
