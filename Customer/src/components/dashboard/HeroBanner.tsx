import {Link, useNavigate} from 'react-router-dom';
import {Star, Wallet, ArrowRight} from 'lucide-react';
import {motion} from 'framer-motion';
import {cardClass} from './SectionHeading';
import {useAuthStore} from '../../store/authStore';

function membershipLabel(type?: string) {
  if (!type || type === 'none') return 'Member';
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} Member`;
}

export function HeroBanner() {
  const navigate = useNavigate();
  const customer = useAuthStore(s => s.customer);
  const firstName = (customer?.name || 'Ankur').split(' ')[0];
  const wallet = customer?.walletBalance ?? customer?.walletAmount ?? 71;

  return (
    <motion.section
      initial={{opacity: 0, y: 16}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45}}
      className="rounded-[24px] border border-black/[0.05] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:p-6"
    >
      <div className="grid grid-cols-2 items-center gap-4 divide-x divide-slate-100">
        {/* Left Side: Greeting & Membership Badge */}
        <div className="flex flex-col justify-center space-y-2.5 pr-2">
          <h1 className="text-[20px] font-extrabold tracking-tight text-[#111111] sm:text-[24px]">
            Hi, {firstName} 👋
          </h1>
          <div className="w-fit">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF4FF] px-2.5 py-0.5 text-[11px] font-bold text-[#2563EB]">
              <span className="text-[12px] leading-none">★</span>
              {membershipLabel(customer?.membershipType || 'premium')}
            </span>
          </div>
        </div>

        {/* Right Side: Wallet details */}
        <div className="relative pl-5 flex flex-col justify-between h-full min-h-[76px]">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-[#9CA3AF] tracking-wide">Wallet Balance</p>
              <p className="text-[24px] font-black tracking-tight text-[#111111] tabular-nums sm:text-[28px]">
                ₹{wallet.toLocaleString('en-IN', {minimumFractionDigits: 0})}
              </p>
            </div>
            <div className="text-[#9CA3AF] hover:text-[#4B5563] transition-colors mt-0.5">
              <Wallet className="h-[22px] w-[22px]" strokeWidth={1.5} />
            </div>
          </div>
          <Link
            to="/wallet"
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-extrabold text-[#EA580C] transition hover:text-[#C2410C]"
          >
            View Wallet <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
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
