import {useState, useEffect} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {ChevronRight, Crown, LogOut, User, X} from 'lucide-react';
import {motion} from 'framer-motion';
import {BrandMark} from '../auth/AuthShell';
import {dashboardNav} from '../../data/dashboard';
import {useAuthStore} from '../../store/authStore';
import {authApi} from '../../services/auth.service';

type Props = {
  mode?: 'fixed' | 'drawer';
  open?: boolean;
  onClose?: () => void;
  onProgramsClick?: () => void;
};

export function DashboardSidebar({mode = 'fixed', open = true, onClose, onProgramsClick}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const customer = useAuthStore(s => s.customer);
  const logout = useAuthStore(s => s.logout);
  const isPremium = String(customer?.membershipType || '').trim().toLowerCase() === 'premium';
  const storeBalance = Number(customer?.walletBalance ?? customer?.walletAmount ?? 0);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    logout();
    onClose?.();
    navigate('/login', {replace: true});
  };

  useEffect(() => {
    let active = true;
    authApi
      .getWalletDashboard()
      .then(res => {
        const bal = res.data?.data?.balances?.totalAvailable;
        if (active && typeof bal === 'number' && !Number.isNaN(bal)) {
          setLiveBalance(bal);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [customer?._id, customer?.walletBalance, customer?.walletAmount]);

  const walletBalance = liveBalance ?? storeBalance;
  const isDrawer = mode === 'drawer';

  const sections = ['Main'] as const;

  const panel = (
    <div className="flex h-full w-[280px] flex-col bg-white">
      <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-5">
        <BrandMark compact showTagline={false} />
        {isDrawer ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563]"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map(section => {
          const items = dashboardNav.filter(i => i.section === section);
          if (!items.length) return null;
          return (
            <div key={section} className="mb-4">
              {section !== 'Main' ? (
                <>
                  <div className="my-3 mx-2 border-t border-slate-100" />
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    {section}
                  </p>
                </>
              ) : null}
              <ul className="space-y-1">
                {items.map(item => {
                  const active = item.to
                    ? location.pathname === item.to ||
                      (item.id === 'bookings' && (location.pathname === '/booking' || location.pathname === '/bookings')) ||
                      (item.id === 'home' && (location.pathname === '/home' || location.pathname === '/')) ||
                      (item.id === 'programs' && (location.pathname === '/programs' || location.pathname === '/program' || location.pathname === '/ourprograms' || location.pathname.startsWith('/program/')))
                    : false;
                  const Icon = item.icon;
                  const className = `flex h-12 w-full items-center gap-3 rounded-[14px] px-3 text-[14px] font-medium transition ${
                    active
                      ? 'bg-[#F5F0FF] text-[#673DE6] font-semibold'
                      : 'text-[#374151] hover:bg-[#F3F4F6]'
                  }`;

                  if (item.id === 'programs' && onProgramsClick) {
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onClose?.();
                            onProgramsClick();
                          }}
                          className={className}
                        >
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                          {item.label}
                        </button>
                      </li>
                    );
                  }

                  if (item.id === 'wallet' && item.to) {
                    return (
                      <li key={item.id}>
                        <Link
                          to={item.to}
                          onClick={onClose}
                          className={`group flex h-12 w-full items-center justify-between rounded-[14px] px-3 text-[14px] font-medium transition ${
                            active
                              ? 'bg-[#F5F0FF] text-[#673DE6] font-semibold'
                              : 'text-[#374151] hover:bg-[#F3F4F6]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span
                              className={`text-[13px] font-bold tabular-nums ${
                                active ? 'text-[#673DE6]' : 'text-[#111111]'
                              }`}
                            >
                              ₹{walletBalance.toLocaleString('en-IN', {minimumFractionDigits: 0})}
                            </span>
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
                                active
                                  ? 'bg-[#673DE6] text-white shadow-xs'
                                  : 'bg-slate-100 text-[#6B7280] group-hover:bg-[#673DE6] group-hover:text-white'
                              }`}
                            >
                              <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  }

                  if (item.to) {
                    return (
                      <li key={item.id}>
                        <Link to={item.to} onClick={onClose} className={className}>
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <button type="button" onClick={onClose} className={className}>
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="space-y-2.5 px-4 pb-4">
        {/* My Profile Button shifted above Membership card */}
        <Link
          to="/profile"
          onClick={onClose}
          className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-[13px] font-semibold transition ${
            location.pathname === '/profile'
              ? 'border-[#C4B5FD] bg-[#F5F0FF] text-[#673DE6]'
              : 'border-slate-200 bg-white text-[#374151] hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Profile
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 transition-colors ${
              location.pathname === '/profile' ? 'text-[#673DE6]' : 'text-[#9CA3AF]'
            }`}
          />
        </Link>

        {/* Upgrade Membership Card (hidden if already premium) */}
        {!isPremium && (
          <div className="rounded-[20px] bg-gradient-to-br from-[#8B5CF6] via-[#6366F1] to-[#2563EB] p-4 text-white shadow-lg">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Crown className="h-4 w-4" />
            </div>
            <p className="text-[14px] font-bold">Upgrade Membership</p>
            <p className="mt-1 text-[11px] leading-snug text-white/85">
              Unlock exclusive benefits &amp; grow your art journey
            </p>
            <Link
              to="/membership"
              onClick={onClose}
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-white py-2.5 text-[13px] font-semibold text-[#4F46E5] hover:bg-white/95 transition"
            >
              Upgrade Now
            </Link>
          </div>
        )}

        {/* Logout Button below Upgrade Membership card */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-2.5 px-3.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  if (!isDrawer) {
    return (
      <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] shrink-0 overflow-hidden rounded-[24px] border border-black/[0.05] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] xl:block">
        {panel}
      </aside>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 xl:hidden ${open ? '' : 'pointer-events-none'}`}>
      <button
        type="button"
        aria-label="Close overlay"
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <motion.aside
        initial={false}
        animate={{x: open ? 0 : '-105%'}}
        transition={{type: 'spring', stiffness: 320, damping: 32}}
        className="absolute inset-y-0 left-0 overflow-hidden rounded-r-[24px] shadow-2xl"
      >
        {panel}
      </motion.aside>
    </div>
  );
}
