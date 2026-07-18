import {useNavigate} from 'react-router-dom';
import {Bell, ChevronDown, Menu, MessageCircle} from 'lucide-react';
import {motion} from 'framer-motion';
import {BrandMark} from '../auth/AuthShell';
import {SearchBar} from './SearchBar';
import {useAuthStore} from '../../store/authStore';

type Props = {
  onMenuClick: () => void;
  showBrand?: boolean;
};

export function TopNavbar({onMenuClick, showBrand = false}: Props) {
  const navigate = useNavigate();
  const customer = useAuthStore(s => s.customer);
  const initial = (customer?.name || 'C').charAt(0).toUpperCase();

  return (
    <motion.header
      initial={{opacity: 0, y: -10}}
      animate={{opacity: 1, y: 0}}
      className="flex h-[72px] items-center gap-3"
    >
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-black/[0.05] bg-white text-[#111111] shadow-[0_8px_24px_rgba(15,23,42,0.05)] xl:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {showBrand ? (
        <div className="min-w-0 flex-1 xl:hidden">
          <div className="mx-auto flex max-w-[200px] justify-center">
            <BrandMark compact showTagline={false} />
          </div>
        </div>
      ) : (
        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <SearchBar />
        </div>
      )}

      {!showBrand ? <div className="flex-1 md:hidden" /> : null}

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-black/[0.05] bg-white text-[#4B5563] shadow-sm lg:flex"
          aria-label="Messages"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-black/[0.05] bg-white text-[#4B5563] shadow-sm"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[10px] font-bold text-white">
            3
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex items-center gap-1.5 rounded-full border border-black/[0.05] bg-white py-1 pl-1 pr-2 shadow-sm"
          aria-label="Open profile"
        >
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-sm font-bold text-[#1D4ED8]">
            {customer?.profileImage ? (
              <img src={customer.profileImage} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </span>
          <ChevronDown className="hidden h-4 w-4 text-[#9CA3AF] sm:block" />
        </button>
      </div>
    </motion.header>
  );
}

export function MobileHeader({onMenuClick}: {onMenuClick: () => void}) {
  const navigate = useNavigate();
  return (
    <header className="mb-4 flex items-center justify-between gap-3 xl:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-black/[0.04] bg-white text-[#111111] shadow-[0_4px_12px_rgba(15,23,42,0.05)] transition hover:scale-95"
        aria-label="Open menu"
      >
        <Menu className="h-[20px] w-[20px]" strokeWidth={2} />
      </button>
      <div className="flex min-w-0 flex-1 justify-center">
        <BrandMark compact showTagline={false} />
      </div>
      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="relative flex h-11 w-11 items-center justify-center rounded-[14px] border border-black/[0.04] bg-white text-[#111111] shadow-[0_4px_12px_rgba(15,23,42,0.05)] transition hover:scale-95"
        aria-label="Notifications"
      >
        <Bell className="h-[20px] w-[20px]" strokeWidth={2} />
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#EF4444] px-1 text-[9px] font-extrabold text-white">
          3
        </span>
      </button>
    </header>
  );
}
