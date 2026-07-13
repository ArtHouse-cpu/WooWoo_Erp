import {useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowRight, Calendar, Gift, Mail, User} from 'lucide-react';
import {toast} from 'sonner';
import {AuthBottomSheet} from '../../components/auth/AuthBottomSheet';
import {Button} from '../../components/ui/Button';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';
import {useAuthStore} from '../../store/authStore';

const schema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  email: z
    .string()
    .trim()
    .optional()
    .refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email'),
  dob: z.string().optional(),
  gender: z.enum(['male', 'female', 'other'], {
    message: 'Please select your gender',
  }),
});

type FormValues = z.infer<typeof schema>;

const genders = [
  {
    value: 'male' as const,
    label: 'Male',
    icon: (
      <svg
        viewBox="0 0 48 48"
        className="mb-2 h-11 w-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="24" cy="16" r="7" />
        <path d="M12 40c0-6.6 5.4-12 12-12s12 5.4 12 12" />
        <path d="M17 14c.8 1.2 1.2 2.2 1.2 3.2" />
        <path d="M31 14c-.8 1.2-1.2 2.2-1.2 3.2" />
        <path d="M16 10c1.6-1.6 4-2.5 8-2.5s6.4.9 8 2.5" />
      </svg>
    ),
  },
  {
    value: 'female' as const,
    label: 'Female',
    icon: (
      <svg
        viewBox="0 0 48 48"
        className="mb-2 h-11 w-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="24" cy="16" r="7" />
        <path d="M12 40c0-6.6 5.4-12 12-12s12 5.4 12 12" />
        <path d="M15 11c-2.5 2.8-3.5 6-3.5 9.5V28" />
        <path d="M33 11c2.5 2.8 3.5 6 3.5 9.5V28" />
      </svg>
    ),
  },
  {
    value: 'other' as const,
    label: 'Others',
    icon: (
      <svg
        viewBox="0 0 48 48"
        className="mb-2 h-11 w-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="24" cy="16" r="7" />
        <path d="M12 40c0-6.6 5.4-12 12-12s12 5.4 12 12" />
        <path d="M16 12c0-2 2.2-4 8-4s8 2 8 4c0 .8-.6 1.4-1.4 1.4-2 0-3.4-1.4-5.6-1.4s-3.6 1.4-5.6 1.4c-.8 0-1.4-.6-1.4-1.4z" />
      </svg>
    ),
  },
];

const fieldClass =
  'rounded-[12px] border-[#E5E7EB] py-3.5 shadow-none focus-within:border-[#93C5FD] focus-within:ring-0 focus-within:shadow-[0_0_0_3px_rgba(147,197,253,0.25)]';

function formatDobDisplay(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d} / ${m} / ${y}`;
}

/**
 * First-time onboarding Create Account (after OTP).
 * No logout. Continues to Membership.
 */
export default function CreateAccountOnboardingPage() {
  const navigate = useNavigate();
  const {customer, setCustomer} = useAuthStore();
  const [loading, setLoading] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: customer?.name && !/^Customer\s+\d+$/i.test(customer.name) ? customer.name : '',
      email: customer?.email || '',
      dob: '',
      gender: undefined,
    },
  });

  const gender = form.watch('gender');
  const dob = form.watch('dob') || '';

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker();
    else {
      el.focus();
      el.click();
    }
  };

  const onSubmit = form.handleSubmit(async values => {
    setLoading(true);
    try {
      const {data} = await authApi.updateProfile({
        name: values.name,
        email: values.email || undefined,
        dob: values.dob || undefined,
        gender: values.gender,
        profileSetupCompleted: true,
        onboardingCompleted: false,
      });
      if (data.data) setCustomer(data.data);
      toast.success('Profile saved');
      navigate('/onboarding/membership', {replace: true});
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save profile'));
    } finally {
      setLoading(false);
    }
  });

  return (
    <AuthBottomSheet hideClose maxHeightClass="max-h-[92dvh]">
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 pb-4 pt-3">
          <h2 className="text-[26px] font-bold tracking-tight text-[#111111]">Create Account</h2>
          <p className="mt-1.5 text-[15px] text-[#6B7280]">Let&apos;s set up your profile 👋</p>

          <div className="mt-7 space-y-5">
            <label className="block space-y-2">
              <span className="text-[14px] font-semibold text-[#111111]">
                Full name <span className="text-[#EF4444]">*</span>
              </span>
              <div className={`flex items-center gap-3 border bg-white px-4 ${fieldClass}`}>
                <User className="h-[18px] w-[18px] text-[#9CA3AF]" strokeWidth={1.75} />
                <input
                  placeholder="Enter your full name"
                  className="w-full border-0 bg-transparent text-[15px] outline-none placeholder:text-[#9CA3AF]"
                  {...form.register('name')}
                />
              </div>
              {form.formState.errors.name ? (
                <span className="text-xs text-red-500">{form.formState.errors.name.message}</span>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-[14px] font-semibold text-[#111111]">Email</span>
              <div className={`flex items-center gap-3 border bg-white px-4 ${fieldClass}`}>
                <Mail className="h-[18px] w-[18px] text-[#9CA3AF]" strokeWidth={1.75} />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full border-0 bg-transparent text-[15px] outline-none placeholder:text-[#9CA3AF]"
                  {...form.register('email')}
                />
              </div>
              {form.formState.errors.email ? (
                <span className="text-xs text-red-500">{form.formState.errors.email.message}</span>
              ) : null}
            </label>

            <div className="space-y-2">
              <span className="text-[14px] font-semibold text-[#111111]">Birthday</span>
              <button
                type="button"
                onClick={openDatePicker}
                className={`flex w-full items-center gap-3 border bg-white px-4 text-left ${fieldClass}`}
              >
                <span className={`flex-1 text-[15px] ${dob ? 'text-[#111111]' : 'text-[#9CA3AF]'}`}>
                  {dob ? formatDobDisplay(dob) : 'DD / MM / YYYY'}
                </span>
                <Calendar className="h-[18px] w-[18px] shrink-0 text-[#111111]" strokeWidth={1.75} />
              </button>
              <input
                ref={dateInputRef}
                type="date"
                className="sr-only"
                value={dob}
                onChange={e => form.setValue('dob', e.target.value, {shouldDirty: true})}
                tabIndex={-1}
                aria-hidden
              />
            </div>

            <div className="flex items-center gap-3 rounded-[12px] bg-[#EEF2FF] px-4 py-3.5 text-[13px] leading-snug text-[#1E3A8A]">
              <Gift className="h-[18px] w-[18px] shrink-0 text-[#3B82F6]" strokeWidth={1.75} />
              <span>
                Add your birthday to unlock{' '}
                <span className="font-semibold text-[#2563EB]">special offers!</span>
              </span>
            </div>

            <div className="pt-1">
              <p className="mb-3 text-[14px] font-semibold text-[#111111]">
                Gender <span className="text-[#EF4444]">*</span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                {genders.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      form.setValue('gender', item.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    className={`flex flex-col items-center rounded-[16px] border px-2 py-4 transition ${
                      gender === item.value
                        ? 'border-[#3B82F6] bg-[#EFF6FF] text-[#1D4ED8]'
                        : 'border-[#E5E7EB] bg-white text-[#111111]'
                    }`}
                  >
                    {item.icon}
                    <span className="text-[14px] font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
              {form.formState.errors.gender ? (
                <span className="mt-2 block text-xs text-red-500">
                  {form.formState.errors.gender.message}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <Button
            type="submit"
            loading={loading}
            className="relative w-full rounded-[14px] bg-[#111111] py-4 text-[15px] font-semibold hover:bg-black"
          >
            <span>Continue</span>
            <ArrowRight
              className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2"
              strokeWidth={2.25}
            />
          </Button>
        </div>
      </form>
    </AuthBottomSheet>
  );
}
