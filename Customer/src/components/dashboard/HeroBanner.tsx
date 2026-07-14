import {Link, useNavigate} from 'react-router-dom';
import {Star, Wallet} from 'lucide-react';
import {motion} from 'framer-motion';
import {artistQuote} from '../../data/dashboard';
import {cardClass} from './SectionHeading';
import {useAuthStore} from '../../store/authStore';

function membershipLabel(type?: string) {
  if (!type || type === 'none') return 'Member';
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} Member`;
}

export function HeroBanner() {
  const navigate = useNavigate();
  const customer = useAuthStore(s => s.customer);
  const firstName = (customer?.name || 'Creator').split(' ')[0];
  const wallet = customer?.walletBalance ?? customer?.walletAmount ?? 0;
  const initial = (customer?.name || 'C').charAt(0).toUpperCase();

  return (
    <motion.section
      initial={{opacity: 0, y: 16}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45}}
      className={`${cardClass} relative overflow-hidden bg-gradient-to-br from-white via-[#F8FBFF] to-[#FFF7ED] p-5 md:min-h-[220px] md:p-6`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-[#FDE68A]/40 blur-3xl md:h-56 md:w-56"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-[#BFDBFE]/50 blur-3xl"
      />

      <div className="relative grid gap-5 lg:grid-cols-[1.1fr_0.9fr_0.9fr] lg:items-center">
        <div className="flex items-start gap-3.5 md:items-center">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="relative shrink-0"
            aria-label="Open profile"
          >
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#DBEAFE] to-[#C4B5FD] text-[20px] font-bold text-[#1D4ED8] shadow-md ring-2 ring-white md:h-16 md:w-16">
              {customer?.profileImage ? (
                <img src={customer.profileImage} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#22C55E]" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold tracking-tight text-[#111111] md:text-[22px]">
              Hi, {firstName} 👋
            </h1>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#EEF4FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#2563EB]">
              <Star className="h-3 w-3 fill-current" />
              {membershipLabel(customer?.membershipType)}
            </span>
            <p className="mt-3 hidden max-w-sm text-[13px] leading-relaxed text-[#6B7280] md:block">
              “{artistQuote}”
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <div className="text-right">
              <p className="text-[10px] font-medium text-[#9CA3AF]">Wallet Balance</p>
              <p className="text-[16px] font-bold tabular-nums text-[#111111]">
                ₹{wallet.toLocaleString('en-IN', {minimumFractionDigits: 0})}
              </p>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#2563EB] text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]"
              aria-label="Wallet"
            >
              <Wallet className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="hidden items-center justify-center lg:flex">
          <div className="relative flex h-36 w-full max-w-[220px] items-end justify-center rounded-[20px] bg-gradient-to-t from-[#FFEDD5]/80 to-transparent">
            <span className="select-none text-[72px] leading-none drop-shadow-sm">🎨</span>
          </div>
        </div>

        <div className="hidden rounded-[20px] border border-[#E5E7EB]/80 bg-white/80 p-4 backdrop-blur md:block">
          <p className="text-[12px] font-medium text-[#9CA3AF]">Wallet Balance</p>
          <p className="mt-1 text-[28px] font-bold tabular-nums tracking-tight text-[#111111]">
            ₹{wallet.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </p>
          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition hover:brightness-110"
          >
            <Wallet className="h-4 w-4" /> Add Money
          </button>
        </div>
      </div>
    </motion.section>
  );
}

export function ProfileAsideCard() {
  const navigate = useNavigate();
  const customer = useAuthStore(s => s.customer);
  const firstName = customer?.name || 'Creator';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div className={`${cardClass} p-5 text-center`}>
      <p className="mb-4 text-left text-[13px] font-semibold text-[#6B7280]">Your Profile</p>
      <button type="button" onClick={() => navigate('/profile')} className="mx-auto block">
        <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#DBEAFE] to-[#C4B5FD] text-2xl font-bold text-[#1D4ED8] ring-4 ring-[#EEF4FF]">
          {customer?.profileImage ? (
            <img src={customer.profileImage} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
      </button>
      <p className="mt-3 text-[16px] font-bold text-[#111111]">{firstName}</p>
      <p className="text-[13px] text-[#6B7280]">Artist</p>
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#EEF4FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#2563EB]">
        <Star className="h-3 w-3 fill-current" /> {membershipLabel(customer?.membershipType)}
      </span>
      <Link
        to="/profile"
        className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-2xl bg-[#111111] py-3 text-[13px] font-semibold text-white"
      >
        View Profile →
      </Link>
    </div>
  );
}
