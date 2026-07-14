import {Link, useLocation, useNavigate} from 'react-router-dom';
import {Crown, LogOut, X} from 'lucide-react';
import {motion} from 'framer-motion';
import {BrandMark} from '../auth/AuthShell';
import {dashboardNav} from '../../data/dashboard';
import {useAuthStore} from '../../store/authStore';
import {authApi} from '../../services/auth.service';

type Props = {
  mode?: 'fixed' | 'drawer';
  open?: boolean;
  onClose?: () => void;
};

export function DashboardSidebar({mode = 'fixed', open = true, onClose}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore(s => s.logout);
  const isDrawer = mode === 'drawer';

  const sections = ['Main', 'Explore', 'Services', 'Community'] as const;

  const onLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    logout();
    onClose?.();
    navigate('/login', {replace: true});
  };

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
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  {section}
                </p>
              ) : null}
              <ul className="space-y-1">
                {items.map(item => {
                  const active = item.to ? location.pathname === item.to : false;
                  const Icon = item.icon;
                  const className = `flex h-12 w-full items-center gap-3 rounded-[14px] px-3 text-[14px] font-medium transition ${
                    active
                      ? 'bg-[#EEF4FF] text-[#2563EB]'
                      : 'text-[#374151] hover:bg-[#F3F4F6]'
                  }`;

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

      <div className="space-y-3 px-4 pb-5">
        <div className="rounded-[20px] bg-gradient-to-br from-[#8B5CF6] via-[#6366F1] to-[#2563EB] p-4 text-white shadow-lg">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <Crown className="h-4 w-4" />
          </div>
          <p className="text-[14px] font-bold">Upgrade Membership</p>
          <p className="mt-1 text-[11px] leading-snug text-white/85">
            Unlock exclusive benefits & grow your art journey
          </p>
          <Link
            to="/membership"
            onClick={onClose}
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-white py-2.5 text-[13px] font-semibold text-[#4F46E5]"
          >
            Upgrade Now
          </Link>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FECACA] py-2.5 text-[13px] font-semibold text-[#DC2626]"
        >
          <LogOut className="h-4 w-4" /> Logout
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
