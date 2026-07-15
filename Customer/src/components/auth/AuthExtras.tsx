import {Link} from 'react-router-dom';

const WhatsAppIcon = ({className = ''}: {className?: string}) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.004 0c-6.627 0-12 5.373-12 12 0 2.115.549 4.102 1.51 5.834L0 24l6.335-1.464c1.656.921 3.56 1.464 5.669 1.464 6.627 0 12-5.373 12-12s-5.373-12-12-12zm6.75 16.035c-.244.686-1.22 1.256-1.787 1.348-.567.094-1.127.359-3.666-.639-3.245-1.275-5.334-4.57-5.496-4.786-.162-.217-1.3-1.725-1.3-3.292 0-1.567.818-2.337 1.109-2.643.29-.306.634-.383.847-.383.213 0 .426.002.612.01.196.008.46-.073.72.549.26.623.89 2.169.966 2.322.077.153.128.331.026.536-.102.205-.153.332-.306.509-.153.178-.323.398-.46.549-.153.153-.314.321-.136.628.178.307.79 1.298 1.696 2.107.907.809 1.666 1.059 1.972 1.213.307.153.486.128.665-.077.179-.205.766-.893.97-1.199.205-.306.41-.255.69-.153.28.102 1.776.837 2.083.99.307.153.51.23.587.357.077.127.077.738-.167 1.424z" />
  </svg>
);

export function LegalNote({className = ''}: {className?: string}) {
  return (
    <p className={`text-center text-[12px] leading-5 text-[#9CA3AF] ${className}`}>
      You agree to our{' '}
      <Link to="/terms" className="font-medium text-[#3B82F6] underline-offset-2 hover:underline">
        terms
      </Link>{' '}
      and{' '}
      <Link to="/legal" className="font-medium text-[#3B82F6] underline-offset-2 hover:underline">
        policies
      </Link>
      .
    </p>
  );
}

export function OtpHint() {
  return (
    <div className="mt-1 flex items-center gap-2 pl-2 text-[13px] text-[#8FA8C8]">
      <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-[#25D366] relative top-[1px]" />
      <span>We&apos;ll send you an OTP to verify</span>
    </div>
  );
}