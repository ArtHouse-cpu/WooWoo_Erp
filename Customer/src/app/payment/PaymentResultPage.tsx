import {useEffect, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import Swal from 'sweetalert2';
import {Button} from '../../components/ui/Button';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';
import {useAuthStore} from '../../store/authStore';
import {getPostAuthPath} from '../../utils/onboarding';

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setCustomer = useAuthStore(s => s.setCustomer);
  const customer = useAuthStore(s => s.customer);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Confirming payment…');

  const status = String(params.get('status') || '').toLowerCase();
  const txnid = params.get('txnid') || '';
  const gatewayMessage = params.get('message') || '';

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (status === 'success') {
          try {
            const {data} = await authApi.me();
            if (!cancelled && data.data) setCustomer(data.data);
          } catch {
            // Session may restore via refresh cookie; ignore soft failures
          }
          if (cancelled) return;
          setMessage(gatewayMessage || 'Payment successful. Membership activated.');
          await Swal.fire({
            icon: 'success',
            title: 'Payment successful',
            text: gatewayMessage || 'Your membership is now active.',
            timer: 2200,
            showConfirmButton: false,
          });
          navigate('/home', {replace: true});
          return;
        }

        setMessage(gatewayMessage || 'Payment failed or was cancelled.');
        await Swal.fire({
          icon: 'error',
          title: 'Payment failed',
          text: gatewayMessage || 'You can try again from Membership.',
        });
      } catch (error) {
        if (!cancelled) {
          setMessage(getErrorMessage(error, 'Could not confirm payment result'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [status, gatewayMessage, navigate, setCustomer]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-[#111111]">
        {status === 'success' ? 'Payment' : 'Payment status'}
      </h1>
      <p className="mt-3 text-sm text-[#6B7280]">{loading ? 'Please wait…' : message}</p>
      {txnid ? (
        <p className="mt-2 text-xs text-[#9CA3AF]">Txn: {txnid}</p>
      ) : null}
      <div className="mt-8 flex gap-3">
        <Button type="button" onClick={() => navigate('/membership', {replace: true})}>
          Back to membership
        </Button>
        <Link
          to={customer ? getPostAuthPath(customer) : '/home'}
          className="inline-flex items-center rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151]"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
