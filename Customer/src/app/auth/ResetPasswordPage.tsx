import {useEffect, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowRight, Eye, EyeOff, Lock} from 'lucide-react';
import {toast} from 'sonner';
import {AuthShell} from '../../components/auth/AuthShell';
import {LegalNote} from '../../components/auth/AuthExtras';
import {Button} from '../../components/ui/Button';
import {Input} from '../../components/ui/Input';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

interface LocationState {
  identifier?: string;
  resetToken?: string;
  otp?: string;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {newPassword: '', confirmPassword: ''},
  });

  useEffect(() => {
    if (!state.identifier || (!state.resetToken && !state.otp)) {
      navigate('/forgot-password', {replace: true});
    }
  }, [navigate, state.identifier, state.otp, state.resetToken]);

  const onSubmit = form.handleSubmit(async values => {
    if (!state.identifier) return;
    setLoading(true);
    try {
      const {data} = await authApi.resetPassword({
        identifier: state.identifier,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
        resetToken: state.resetToken,
        otp: state.resetToken ? undefined : state.otp,
      });
      toast.success(data.message || 'Password reset successful');
      navigate('/login');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not reset password'));
    } finally {
      setLoading(false);
    }
  });

  return (
    <AuthShell title="Reset Password" subtitle="Create a new password for your account">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          leftIcon={<Lock className="h-4 w-4" />}
          type={showPassword ? 'text' : 'password'}
          placeholder="New password"
          error={form.formState.errors.newPassword?.message}
          rightSlot={
            <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...form.register('newPassword')}
        />
        <Input
          leftIcon={<Lock className="h-4 w-4" />}
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm new password"
          error={form.formState.errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
        <Button type="submit" loading={loading}>
          Update Password <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        <Link to="/login" className="font-semibold text-brand-blue">
          Back to login
        </Link>
      </p>
      <LegalNote />
    </AuthShell>
  );
}
