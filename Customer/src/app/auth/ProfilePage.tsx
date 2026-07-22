import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {Calendar, Gift, Mail, Trash2, User} from 'lucide-react';
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

export default function ProfilePage() {
  const navigate = useNavigate();
  const {customer, setCustomer, logout} = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    if (!customer) return;
    form.reset({
      name: customer.name || '',
      email: customer.email || '',
      dob: toDateInput(customer.dob),
      gender: (customer.gender as FormValues['gender']) || '',
    });
  }, [customer, form]);

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

  const onDeleteProfile = async () => {
    const result = await Swal.fire({
      title: 'Delete profile?',
      text: 'This will permanently delete your account. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#9CA3AF',
    });
    if (!result.isConfirmed) return;

    setDeleting(true);
    try {
      await authApi.deleteProfile();
      logout();
      await Swal.fire({
        icon: 'success',
        title: 'Profile deleted',
        timer: 1500,
        showConfirmButton: false,
      });
      navigate('/login', {replace: true});
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Could not delete profile',
        text: getErrorMessage(error, 'Please try again'),
      });
    } finally {
      setDeleting(false);
    }
  };

  const initial = (customer?.name || 'C').charAt(0).toUpperCase();

  const actionButtons = (
    <div className="space-y-3 pt-50 sm:pt-35">
      <Button
        type="submit"
        loading={loading}
        className="rounded-[14px] bg-[#111111] py-[15px] text-[15px] font-semibold hover:bg-black"
      >
        Save Profile
      </Button>
      <Button
        type="button"
        variant="danger"
        loading={deleting}
        onClick={onDeleteProfile}
        className="rounded-[14px] py-[15px] text-[15px] font-semibold"
      >
        <Trash2 className="h-4 w-4" />
        Delete Profile
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

const profileFields = (
    <>
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

      <Input
        label="Email"
        leftIcon={<Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        placeholder="Enter your email address"
        className={fieldClass}
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />

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

  if (!isDesktop) {
    return (
      <div className="min-h-dvh bg-white px-5 pb-10 pt-6">
        <div className="mb-6 flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-[22px] font-bold text-[#1D4ED8]">
            {customer?.profileImage ? (
              <img
                src={customer.profileImage}
                alt={customer.name}
                className="h-full w-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0">
            {customer?.name ? (
              <h1 className="text-2xl font-bold text-[#111111]">{customer.name}</h1>
            ) : null}
            <p className="text-sm text-[#9CA3AF]">
              {customer?.customerId || 'Customer'} · {customer?.mobile}
            </p>
            {customer?.createdAt ? (
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-blue">
                {formatJoinedDate(customer.createdAt)}
              </p>
            ) : null}
          </div>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          {profileFields}
          {actionButtons}
        </form>
      </div>
    );
  }

  return (
    <div className="brush-bg min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <div className="auth-card rounded-[28px] border border-white/80 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-2xl font-bold text-brand-blue">
              {customer?.profileImage ? (
                <img
                  src={customer.profileImage}
                  alt={customer.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <div>
              {customer?.name ? (
                <h1 className="text-2xl font-bold text-ink">{customer.name}</h1>
              ) : null}
              <p className="text-sm text-muted">
                {customer?.customerId || 'Customer'} · {customer?.mobile}
              </p>
              {customer?.createdAt ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-blue">
                  Member since:{formatJoinedDate(customer.createdAt)}
                </p>
              ) : null}
            </div>
          </div>

          <form onSubmit={onSave} className="space-y-4">
            {profileFields}
            {actionButtons}
          </form>
        </div>
      </div>
    </div>
  );
}
