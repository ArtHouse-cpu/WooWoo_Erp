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
  const customer = useAuthStore(s => s.customer);
  const firstName = (customer?.name || 'Member').split(' ')[0];
  const wallet = Number(customer?.walletBalance ?? 0);

  return (
    <motion.section
      initial={{opacity: 0, y: 16}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45}}
      className="rounded-[18px] border border-black/[0.05] bg-white py-2.5 px-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.025)] sm:py-3 sm:px-4"
    >
      <div className="grid grid-cols-2 items-center gap-2.5 divide-x divide-slate-100">
        {/* Left Side: Greeting & Membership Badge */}
        <div className="flex flex-col justify-center space-y-0.5 pr-1.5">
          <h1 className="text-[15px] font-extrabold tracking-tight text-[#111111] sm:text-[19px] leading-tight">
            Hi, {firstName} 👋
          </h1>
          <div className="w-fit">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[9px] sm:text-[9.5px] font-bold text-[#2563EB]">
              <span className="text-[9.5px] leading-none">★</span>
              {membershipLabel(customer?.membershipType)}
            </span>
          </div>
        </div>

        {/* Right Side: Wallet details */}
        <div className="relative pl-3 sm:pl-4 flex items-center justify-between">
          <div>
            <p className="text-[9.5px] font-semibold text-[#9CA3AF] tracking-wide">Wallet Balance</p>
            <p className="text-[18px] font-black tracking-tight text-[#111111] tabular-nums sm:text-[21px] leading-tight mt-0.5">
              <span className="text-[16px] font-bold sm:text-[18px] mr-0.5">₹</span>
              {wallet.toLocaleString('en-IN', {minimumFractionDigits: 0})}
            </p>
          </div>

          <div className="flex flex-col items-end justify-between space-y-1.5 text-right">
            <div className="text-[#9CA3AF] hover:text-[#4B5563] transition-colors">
              <Wallet className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={1.5} />
            </div>
            <Link
              to="/wallet"
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#EA580C] transition hover:text-[#C2410C]"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </Link>
          </div>
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
