import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {useNavigate} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {Calendar, ChevronLeft, Gift, LogOut, Mail, User, X} from 'lucide-react';
import {toast} from 'sonner';
import Swal from 'sweetalert2';
import {Button} from '../../components/ui/Button';
import {Input} from '../../components/ui/Input';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';
import {useAuthStore} from '../../store/authStore';
import {useIsDesktop} from '../../hooks/useIsDesktop';

const schema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Enter a valid email').or(z.literal('')).optional(),
  dob: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
});

type FormValues = z.infer<typeof schema>;

const genders = [
  {
    value: 'male' as const,
    label: 'Male',
    icon: (
      <svg viewBox="0 0 32 32" className="mb-1.5 h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z" />
        <path d="M9 27c0-3.87 3.13-7 7-7s7 3.13 7 7" />
        <path d="M11 12a1.5 1.5 0 0 0-1.5 1.5M21 12a1.5 1.5 0 0 1 1.5 1.5" />
        <path d="M11 7.5c1-1 2.5-1.5 5-1.5s4 .5 5 1.5" />
      </svg>
    ),
  },
  {
    value: 'female' as const,
    label: 'Female',
    icon: (
      <svg viewBox="0 0 32 32" className="mb-1.5 h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z" />
        <path d="M9 27c0-3.87 3.13-7 7-7s7 3.13 7 7" />
        <path d="M11 7c-2 2-3 5-3 8v3a2 2 0 0 0 2 2h0" />
        <path d="M21 7c2 2 3 5 3 8v3a2 2 0 0 1-2 2h0" />
      </svg>
    ),
  },
  {
    value: 'other' as const,
    label: 'Others',
    icon: (
      <svg viewBox="0 0 32 32" className="mb-1.5 h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z" />
        <path d="M9 27c0-3.87 3.13-7 7-7s7 3.13 7 7" />
        <path d="M11 9c0-1.5 1.5-3 5-3s5 1.5 5 3c0 .5-.5 1-1 1-1.5 0-2.5-1-4-1s-2.5 1-4 1c-.5 0-1-.5-1-1z" />
      </svg>
    ),
  },
];

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
};

const fieldClass =
  'rounded-[12px] border-[#E5E7EB] py-3.5 shadow-none focus-within:border-[#93C5FD] focus-within:ring-0 focus-within:shadow-[0_0_0_3px_rgba(147,197,253,0.25)]';

export default function ProfilePage({
  asModal = false,
  onClose,
}: {
  asModal?: boolean;
  onClose?: () => void;
} = {}) {
  const navigate = useNavigate();
  const {customer, setCustomer, logout} = useAuthStore();
  const [loading, setLoading] = useState(false);
  const isDesktop = useIsDesktop();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: customer?.name || '',
      email: customer?.email || '',
      dob: toDateInput(customer?.dob),
      gender: (customer?.gender as FormValues['gender']) || '',
    },
  });

  const gender = form.watch('gender');

  useEffect(() => {
    if (!customer || form.formState.isDirty) return;
    form.reset({
      name: customer.name || '',
      email: customer.email || '',
      dob: toDateInput(customer.dob),
      gender: (customer.gender as FormValues['gender']) || '',
    });
  }, [customer, form]);

  useEffect(() => {
    let cancelled = false;
    void authApi
      .me()
      .then(({data}) => {
        if (!cancelled && data.data) setCustomer(data.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setCustomer]);

  const onSave = form.handleSubmit(async values => {
    setLoading(true);
    try {
      const {data} = await authApi.updateProfile({
        name: values.name,
        email: values.email || undefined,
        dob: values.dob || undefined,
        gender: values.gender || undefined,
      });
      if (data.data) setCustomer(data.data);
      toast.success(data.message || 'Profile updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update profile'));
    } finally {
      setLoading(false);
    }
  });

  const onLogout = async () => {
    const result = await Swal.fire({
      title: 'Log out?',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#9CA3AF',
    });
    if (!result.isConfirmed) return;

    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    logout();
    navigate('/login', {replace: true});
  };

  const initial = (customer?.name || 'C').charAt(0).toUpperCase();

  const actionButtons = (
    <div className="sticky bottom-0 z-20 shrink-0 border-t border-slate-100 bg-white/95 px-5 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <Button
        type="submit"
        loading={loading}
        className="rounded-[14px] bg-[#111111] py-[15px] text-[15px] font-semibold hover:bg-black"
      >
        Update Profile
      </Button>
    </div>
  );

const formatJoinedDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const membershipType = String(customer?.membershipType || '').trim();
  const membershipLabel =
    membershipType && membershipType.toLowerCase() !== 'none'
      ? `${membershipType.charAt(0).toUpperCase()}${membershipType.slice(1)}`
      : '';
  const membershipLine = membershipLabel
    ? customer?.membershipEndDate
      ? `${membershipLabel} (${formatJoinedDate(customer.membershipEndDate)})`
      : membershipLabel
    : '';

  const profileIdentity = (
    <div className="mb-6 flex items-center gap-3.5">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-[22px] font-bold text-[#1D4ED8]">
        {customer?.profileImage ? (
          <img src={customer.profileImage} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-[#111111]">{customer?.name || 'My profile'}</h1>
        {customer?.createdAt ? (
          <p className="mt-0.5 text-sm text-[#6B7280]">Joined {formatJoinedDate(customer.createdAt)}</p>
        ) : null}
        {membershipLine ? (
          <p className={`mt-0.5 text-sm font-semibold ${customer?.membershipExpired ? 'text-rose-600' : 'text-[#1D4ED8]'}`}>
            {membershipLine}
          </p>
        ) : null}
      </div>
    </div>
  );

const profileFields = (
    <>
      <div className={`grid gap-3 ${isDesktop && !asModal ? 'grid-cols-2' : 'grid-cols-1'}`}>
      <label className="block min-w-0 space-y-2">
        <span className="text-[14px] font-semibold text-[#111111]">
          Full name <span className="text-[#EF4444]">*</span>
        </span>
        <div className={`flex items-center gap-3 border bg-white px-4 ${fieldClass}`}>
          <User className="h-[18px] w-[18px] shrink-0 text-[#9CA3AF]" strokeWidth={1.75} />
          <input
            placeholder="Full name"
            className="w-full min-w-0 border-0 bg-transparent text-[15px] outline-none placeholder:text-[#9CA3AF]"
            {...form.register('name')}
          />
        </div>
        {form.formState.errors.name ? (
          <span className="text-xs text-red-500">{form.formState.errors.name.message}</span>
        ) : null}
      </label>

      <Input
        label="Email"
        leftIcon={<Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        placeholder="Email"
        className={fieldClass}
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      </div>

      <label className="block space-y-2">
        <span className="text-[14px] font-semibold text-[#111111]">Birthday</span>
        <div className={`flex items-center gap-3 border bg-white px-4 ${fieldClass}`}>
          <input
            type="date"
            className="w-full border-0 bg-transparent text-[15px] text-[#111111] outline-none"
            {...form.register('dob')}
          />
          <Calendar className="h-[18px] w-[18px] shrink-0 text-[#9CA3AF]" strokeWidth={1.75} />
        </div>
      </label>

      <div className="flex items-center gap-2.5 rounded-[12px] bg-[#EFF6FF] px-3.5 py-3 text-[13px] leading-snug text-[#1E3A8A]">
        <Gift className="h-4 w-4 shrink-0 text-[#3B82F6]" />
        <span>
          Add your birthday to unlock{' '}
          <span className="font-semibold text-[#2563EB]">special offers!</span>
        </span>
      </div>

      

      <div>
        <p className="mb-2.5 text-[14px] font-semibold text-[#111111]">Gender</p>
        <div className="grid grid-cols-3 gap-2.5">
          {genders.map(item => (
            <button
              key={item.value}
              type="button"
              onClick={() => form.setValue('gender', item.value, {shouldDirty: true})}
              className={`flex flex-col items-center justify-center rounded-[14px] border px-2 py-4 transition ${
                gender === item.value
                  ? 'border-[#3B82F6] bg-[#EFF6FF] text-[#1D4ED8]'
                  : 'border-[#E5E7EB] bg-white text-[#111111]'
              }`}
            >
              {item.icon}
              <span className="text-[13px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );

  if (asModal) {
    return createPortal(
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
        onClick={onClose}
      >
        <form
          onSubmit={onSave}
          onClick={event => event.stopPropagation()}
          className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111111]">My profile</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500"
                aria-label="Close profile"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {profileIdentity}
            <div className="space-y-4">{profileFields}</div>
          </div>
          {actionButtons}
        </form>
      </div>,
      document.body,
    );
  }

  if (!isDesktop) {
    return (
      <form onSubmit={onSave} className="flex min-h-dvh flex-col bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-[#111111]" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-red-100 bg-white text-[#EF4444] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 hover:bg-red-50 hover:border-red-200 cursor-pointer"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          {profileIdentity}
          <div className="space-y-4">{profileFields}</div>
        </div>
        {actionButtons}
      </form>
    );
  }

  return (
    <div className="brush-bg min-h-screen px-4 py-8 sm:px-8">
      <form onSubmit={onSave} className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col">
        <div className="auth-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/80">
          <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5 text-[#111111]" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-red-100 bg-white text-[#EF4444] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 hover:bg-red-50 hover:border-red-200 cursor-pointer"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            {profileIdentity}
            <div className="space-y-4">{profileFields}</div>
          </div>
          {actionButtons}
        </div>
      </form>
    </div>
  );
}
