import {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import {BrandMark} from './AuthShell';
import {Lock, Phone} from 'lucide-react';

type AuthBottomSheetProps = {
  open?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  /** Extra classes on the white sheet panel */
  className?: string;
  maxHeightClass?: string;
  /** Hide the X button (used during required onboarding) */
  hideClose?: boolean;
};

/** Dimmed Welcome background shared by OTP + Create Account sheets */
export function WelcomeBackdrop() {
  return (
    <div className="brush-bg pointer-events-none absolute inset-0 select-none" aria-hidden>
      <div className="px-6 pt-[max(3.25rem,8%)]">
        <div className="mx-auto flex max-w-[360px] justify-center">
          <BrandMark compact />
        </div>
      </div>
      <div className="absolute left-1/2 top-[36%] w-full max-w-[360px] -translate-x-1/2 px-6">
        <h1 className="text-center text-[32px] font-bold text-[#111111]">Welcome</h1>
        <p className="mt-3 text-center text-[15px] text-[#8B8B8B]">
          Enter phone number to continue
        </p>
        <div className="mt-7 flex items-center gap-3 rounded-[14px] border border-[#DCE3EE] bg-white px-4 py-4">
          <Phone className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.75} />
          <span className="text-[15px] text-slate-400">Enter your mobile number</span>
        </div>
        <div className="mt-3.5 flex items-center gap-2 text-[13px] text-[#8FA8C8]">
          <Lock className="h-3.5 w-3.5 text-[#6BA3F7]" strokeWidth={2} />
          We&apos;ll send you an OTP to verify
        </div>
      </div>
    </div>
  );
}

/**
 * Shared bottom-sheet chrome used by OTP verify + Create Account
 * so both screens feel identical.
 */
export function AuthBottomSheet({
  open = true,
  onClose,
  children,
  className = '',
  maxHeightClass = 'max-h-[92dvh]',
  hideClose = false,
}: AuthBottomSheetProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <WelcomeBackdrop />

      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        disabled={!onClose || hideClose}
        className={`absolute inset-0 z-10 bg-black/45 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        } ${hideClose || !onClose ? 'pointer-events-none' : ''}`}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-lg flex-col transition-transform duration-300 ease-out ${maxHeightClass} ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div
          className={`flex ${maxHeightClass} flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)] ${className}`}
        >
          <div className="relative shrink-0 px-6 pb-1 pt-3">
            <div className="mx-auto h-1 w-10 rounded-full bg-[#D1D5DB]" />
            {!hideClose && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB]"
                aria-label="Close sheet"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
            ) : null}
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
}
