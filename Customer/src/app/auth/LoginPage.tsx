import {useEffect, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowRight, Eye, EyeOff, Phone, Lock} from 'lucide-react';
import {toast} from 'sonner';
import {BrandMark, BrandPanel} from '../../components/auth/AuthShell';
import {LegalNote, OtpHint} from '../../components/auth/AuthExtras';
import {Button} from '../../components/ui/Button';
import {Input} from '../../components/ui/Input';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';
import {useAuthStore} from '../../store/authStore';
import {useIsDesktop} from '../../hooks/useIsDesktop';
import {getPostAuthPath} from '../../utils/onboarding';
import {captureInviteRefFromSearch} from '../../utils/inviteRef';

const otpSchema = z.object({
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
});

const passwordSchema = z.object({
  identifier: z.string().trim().min(3, 'Email or mobile is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type OtpForm = z.infer<typeof otpSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore(s => s.setSession);
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    captureInviteRefFromSearch(searchParams.toString() ? `?${searchParams.toString()}` : '');
  }, [searchParams]);

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: {mobile: ''},
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {identifier: '', password: '', rememberMe: true},
  });

  const onOtpContinue = otpForm.handleSubmit(async values => {
    setLoading(true);
    try {
      const mobile = values.mobile.replace(/\D/g, '').slice(-10);
      const {data} = await authApi.requestOtp({mobile});
      toast.success(data.message || 'OTP sent');
      navigate('/verify-otp', {
        state: {
          mobile,
          purpose: 'login',
          debugOtp: (data.data as {debugOtp?: string} | undefined)?.debugOtp,
        },
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not send OTP'));
    } finally {
      setLoading(false);
    }
  });

  const onPasswordLogin = passwordForm.handleSubmit(async values => {
    setLoading(true);
    try {
      const {data} = await authApi.login(values);
      if (!data.token || !data.data) throw new Error(data.message);
      setSession({customer: data.data, token: data.token});
      toast.success(data.message || 'Login Successful');
      navigate(getPostAuthPath(data.data), {replace: true});
    } catch (error) {
      toast.error(getErrorMessage(error, 'Login failed'));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      <BrandPanel />

      {/* Mobile — exact reference placement */}
      {!isDesktop ? (
      <section className="brush-bg relative min-h-dvh overflow-hidden">
        {/* Logo — upper area, centered */}
        <header className="absolute left-1/2 top-[max(3.25rem,8%)] w-full -translate-x-1/2 px-6">
          <div className="mx-auto flex max-w-[360px] justify-center">
            <BrandMark compact />
          </div>
        </header>

        {mode === 'otp' ? (
          <form onSubmit={onOtpContinue} className="absolute inset-0">
            {/* Welcome + input — mid screen (~36%) */}
            <div className="absolute left-1/2 top-[36%] w-full max-w-[360px] -translate-x-1/2 px-6">
              <h1 className="text-center text-[32px] font-bold leading-none tracking-tight text-[#111111]">
                Welcome
              </h1>
              <p className="mt-3 text-center text-[15px] leading-snug text-[#8B8B8B]">
                Enter phone number to continue
              </p>

              <div className="mt-7">
                <Input
                  leftIcon={<Phone className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                  placeholder="Enter your mobile number"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  className="rounded-[14px] border-[#DCE3EE] py-4 shadow-[0_0_0_3px_rgba(107,163,247,0.14)] focus-within:border-[#6BA3F7] focus-within:shadow-[0_0_0_4px_rgba(107,163,247,0.25)] focus-within:ring-0"
                  error={otpForm.formState.errors.mobile?.message}
                  {...otpForm.register('mobile', {
                    onChange: e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      otpForm.setValue('mobile', val, {shouldValidate: true});
                    },
                  })}
                />
                <OtpHint />
              </div>
            </div>

            {/* Continue + terms — lower area (~5.5% from bottom) */}
            <div className="absolute bottom-[max(1.75rem,5.5%)] left-1/2 w-full max-w-[360px] -translate-x-1/2 space-y-4 px-6">
              <Button
                type="submit"
                loading={loading}
                className="rounded-[14px] bg-[#111111] py-[15px] text-[15px] font-semibold hover:bg-black"
              >
                Continue <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </Button>
              
              <LegalNote />
            </div>
          </form>
        ) : (
          <form onSubmit={onPasswordLogin} className="absolute inset-0">
            <div className="absolute left-1/2 top-[32%] w-full max-w-[360px] -translate-x-1/2 px-6">
              <h1 className="text-center text-[32px] font-bold text-[#111111]">Welcome</h1>
              <p className="mt-3 text-center text-[15px] text-[#8B8B8B]">Login with password</p>
              <div className="mt-7 space-y-4">
                <Input
                  leftIcon={<Phone className="h-4 w-4" />}
                  placeholder="Email or mobile number"
                  error={passwordForm.formState.errors.identifier?.message}
                  {...passwordForm.register('identifier')}
                />
                <Input
                  leftIcon={<Lock className="h-4 w-4" />}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  error={passwordForm.formState.errors.password?.message}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="text-slate-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  {...passwordForm.register('password')}
                />
                <div className="flex justify-between text-sm">
                  <Link to="/forgot-password" className="font-medium text-brand-blue">
                    Forgot Password?
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMode('otp')}
                    className="font-medium text-brand-blue"
                  >
                    Use OTP
                  </button>
                </div>
              </div>
            </div>
            <div className="absolute bottom-[max(1.75rem,5.5%)] left-1/2 w-full max-w-[360px] -translate-x-1/2 space-y-5 px-6">
              <Button
                type="submit"
                loading={loading}
                className="rounded-[14px] bg-[#111111] py-[15px] text-[15px] font-semibold hover:bg-black"
              >
                Login <ArrowRight className="h-4 w-4" />
              </Button>
              <LegalNote />
            </div>
          </form>
        )}
      </section>
      ) : (
      /* Desktop card */
      <section className="relative flex min-h-screen flex-col bg-surface px-8 py-6">
        

        <div className="flex flex-1 items-center justify-center">
          <div className="auth-card w-full max-w-md rounded-[28px] border border-white/80 p-8">
            <h1 className="text-center text-3xl font-bold tracking-tight text-ink">Welcome</h1>
            <p className="mt-2 text-center text-sm text-muted">
              {mode === 'otp'
                ? 'Enter phone number to continue'
                : 'Login with email or mobile & password'}
            </p>

            <div className="mb-5 mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode('otp')}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  mode === 'otp' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'
                }`}
              >
                Continue with OTP
              </button>
              <button
                type="button"
                onClick={() => setMode('password')}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  mode === 'password' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'
                }`}
              >
                Continue with Password
              </button>
            </div>

            {mode === 'otp' ? (
              <form onSubmit={onOtpContinue} className="flex flex-col gap-2.5">
                <Input
                  leftIcon={<Phone className="h-4 w-4" />}
                  placeholder="Enter your mobile number"
                  inputMode="numeric"
                  maxLength={10}
                  error={otpForm.formState.errors.mobile?.message}
                  {...otpForm.register('mobile', {
                    onChange: e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      otpForm.setValue('mobile', val, {shouldValidate: true});
                    },
                  })}
                />
                <OtpHint />
                <Button type="submit" loading={loading} className="rounded-2xl py-4 mt-8">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>

              </form>
            ) : (
              <form onSubmit={onPasswordLogin} className="flex flex-col gap-3">
                <Input
                  leftIcon={<Phone className="h-4 w-4" />}
                  placeholder="Email or mobile number"
                  error={passwordForm.formState.errors.identifier?.message}
                  {...passwordForm.register('identifier')}
                />
                <Input
                  leftIcon={<Lock className="h-4 w-4" />}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  error={passwordForm.formState.errors.password?.message}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="text-slate-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  {...passwordForm.register('password')}
                />
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input type="checkbox" {...passwordForm.register('rememberMe')} />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="font-medium text-brand-blue">
                    Forgot Password?
                  </Link>
                </div>
                <Button type="submit" loading={loading} className="rounded-2xl py-4">
                  Login <ArrowRight className="h-4 w-4" />
                </Button>

              </form>
            )}
            <LegalNote className="mt-4" />
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
