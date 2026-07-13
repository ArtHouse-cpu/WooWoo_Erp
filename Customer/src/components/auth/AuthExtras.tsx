import {Lock} from 'lucide-react';
import {Link} from 'react-router-dom';

export function LegalNote({className = ''}: {className?: string}) {
  return (
    <p className={`text-center text-[12px] leading-5 text-[#9CA3AF] ${className}`}>
      By continuing, you agree to our{' '}
      <Link to="/terms" className="font-medium text-[#3B82F6] underline-offset-2 hover:underline">
        Terms & Privacy Policy
      </Link>
      .
    </p>
  );
}

export function OtpHint() {
  return (
    <div className="mt-3.5 flex items-center gap-2 text-[13px] text-[#8FA8C8]">
      <Lock className="h-3.5 w-3.5 shrink-0 text-[#6BA3F7]" strokeWidth={2} />
      <span>We&apos;ll send you an OTP to verify</span>
    </div>
  );
}
