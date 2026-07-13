import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowRight, Mail} from 'lucide-react';
import {toast} from 'sonner';
import {AuthShell} from '../../components/auth/AuthShell';
import {LegalNote} from '../../components/auth/AuthExtras';
import {Button} from '../../components/ui/Button';
import {Input} from '../../components/ui/Input';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';

const schema = z.object({
  identifier: z.string().trim().min(3, 'Email or mobile is required'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {identifier: ''},
  });

  const onSubmit = form.handleSubmit(async values => {
    setLoading(true);
    try {
      const {data} = await authApi.forgotPassword(values);
      toast.success(data.message || 'OTP sent');
      const debugOtp = (data.data as {debugOtp?: string} | undefined)?.debugOtp;
      navigate('/verify-otp', {
        state: {
          identifier: values.identifier.trim(),
          mobile: /^\d{10}$/.test(values.identifier.replace(/\D/g, '').slice(-10))
            ? values.identifier.replace(/\D/g, '').slice(-10)
            : undefined,
          purpose: 'forgot-password',
          debugOtp,
        },
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not start password reset'));
    } finally {
      setLoading(false);
    }
  });

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter your email or mobile to receive an OTP"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="Email or mobile number"
          error={form.formState.errors.identifier?.message}
          {...form.register('identifier')}
        />
        <Button type="submit" loading={loading}>
          Send OTP <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-brand-blue">
          Back to login
        </Link>
      </p>
      <LegalNote />
    </AuthShell>
  );
}
