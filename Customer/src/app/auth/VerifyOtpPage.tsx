import {useEffect, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {toast} from 'sonner';
import {AuthBottomSheet} from '../../components/auth/AuthBottomSheet';
import {LegalNote} from '../../components/auth/AuthExtras';
import {OtpInput} from '../../components/auth/OtpInput';
import {Button} from '../../components/ui/Button';
import {useResendTimer} from '../../hooks/useResendTimer';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';
import {useAuthStore} from '../../store/authStore';
import type {Customer, OtpPurpose} from '../../types/auth';
import {getPostAuthPath} from '../../utils/onboarding';
import {clearInviteRef, getInviteRef} from '../../utils/inviteRef';

interface LocationState {
  mobile?: string;
  identifier?: string;
  purpose?: OtpPurpose;
  debugOtp?: string;
}

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore(s => s.setSession);
  const state = (location.state || {}) as LocationState;
  const mobile = state.mobile || '';
  const identifier = state.identifier || mobile;
  const purpose = state.purpose || 'login';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const timer = useResendTimer(45);

  useEffect(() => {
    if (!identifier) navigate('/login', {replace: true});
  }, [identifier, navigate]);

  useEffect(() => {
    if (state.debugOtp) toast.message(`Dev OTP: ${state.debugOtp}`);
  }, [state.debugOtp]);

  const displayMobile =
    mobile.length === 10 ? `${mobile.slice(0, 5)} ${mobile.slice(5)}` : identifier;

  const changePath = purpose === 'forgot-password' ? '/forgot-password' : '/login';

  const closeSheet = () => {
    navigate(changePath);
  };

  const onVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const inviteRef = getInviteRef();
      const {data} = await authApi.verifyOtp({
        mobile: mobile || undefined,
        identifier,
        otp,
        purpose,
        ...(inviteRef ? {ref: inviteRef} : {}),
      });

      if (purpose === 'forgot-password') {
        const payload = data.data as {resetToken?: string; identifier?: string};
        toast.success(data.message || 'OTP verified');
        navigate('/reset-password', {
          state: {
            identifier: payload?.identifier || identifier,
            resetToken: payload?.resetToken,
            otp,
          },
        });
        return;
      }

      if (!data.token || !data.data) throw new Error(data.message);
      setSession({customer: data.data as Customer, token: data.token});
      sessionStorage.removeItem('customer_profile_draft');
      clearInviteRef();
      toast.success(data.message || 'OTP verified successfully');
      navigate(getPostAuthPath(data.data as Customer), {replace: true});
    } catch (error) {
      toast.error(getErrorMessage(error, 'OTP verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!timer.canResend) return;
    try {
      const {data} =
        purpose === 'forgot-password'
          ? await authApi.resendOtp({identifier, purpose})
          : await authApi.resendOtp({mobile, purpose: 'login'});
      toast.success(data.message || 'OTP resent');
      const debugOtp = (data.data as {debugOtp?: string} | undefined)?.debugOtp;
      if (debugOtp) toast.message(`Dev OTP: ${debugOtp}`);
      timer.restart(45);
      setOtp('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not resend OTP'));
    }
  };

  return (
    <AuthBottomSheet onClose={closeSheet} maxHeightClass="max-h-[85dvh]">
      <div className="overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <h2 className="text-center text-[26px] font-bold tracking-tight text-[#111111]">
          Enter OTP
        </h2>

        <p className="mt-2 text-center text-[14px] leading-relaxed text-[#6B7280]">
          We&apos;ve sent a 6-digit OTP to{' '}
          <span className="font-semibold text-[#111111]">{displayMobile}</span>{' '}
          <Link to={changePath} className="font-semibold text-[#3B82F6]">
            Change
          </Link>
        </p>

        <div className="mt-7">
          <OtpInput value={otp} onChange={setOtp} disabled={loading} />
        </div>

        <p className="mt-5 text-center text-[13px] text-[#6B7280]">
          Didn&apos;t receive the code?{' '}
          {timer.canResend ? (
            <button type="button" onClick={onResend} className="font-semibold text-[#3B82F6]">
              Resend OTP
            </button>
          ) : (
            <>
              Resend OTP in <span className="font-semibold text-[#3B82F6]">{timer.label}</span>
            </>
          )}
        </p>

        <div className="mt-7">
          <Button
            type="button"
            loading={loading}
            onClick={onVerify}
            className="rounded-[14px] bg-[#111111] py-[15px] text-[15px] font-semibold hover:bg-black"
          >
            Verify OTP
          </Button>
        </div>

        <LegalNote className="mt-5 pb-2" />
      </div>
    </AuthBottomSheet>
  );
}
