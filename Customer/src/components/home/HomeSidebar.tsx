import {useEffect} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  Headphones,
  Home,
  LogOut,
  MapPin,
  Settings,
  ShoppingBag,
  Star,
  User,
  X,
} from 'lucide-react';
import {BrandMark} from '../auth/AuthShell';
import {useAuthStore} from '../../store/authStore';
import {authApi} from '../../services/auth.service';

type HomeSidebarProps = {
  open: boolean;
  onClose: () => void;
};

const navItems = [
  {to: '/home', label: 'Home', icon: Home},
  {to: '/profile', label: 'My Profile', icon: User},
  {to: '/membership', label: 'Memberships', icon: CreditCard},
  {to: '/profile', label: 'Orders & Bookings', icon: CalendarDays, soft: true},
  {to: '/profile', label: 'Store', icon: ShoppingBag, soft: true},
  {to: '/profile', label: 'Book Space', icon: MapPin, soft: true},
];

export function HomeSidebar({open, onClose}: HomeSidebarProps) {
  const navigate = useNavigate();
  const customer = useAuthStore(s => s.customer);
  const logout = useAuthStore(s => s.logout);
  const firstName = (customer?.name || 'Creator').split(' ')[0];
  const initial = (customer?.name || 'C').charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const onLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    logout();
    onClose();
    navigate('/login', {replace: true});
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        className={`absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[#EAF2FF] via-[#F8FAFF] to-[#FFF4EC] px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <BrandMark compact showTagline={false} />
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#4B5563] shadow-sm"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/profile');
            }}
            className="flex w-full items-center gap-3 rounded-[18px] bg-white/90 p-3 text-left shadow-sm backdrop-blur"
          >
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-lg font-bold text-[#1D4ED8]">
                {customer?.profileImage ? (
                  <img
                    src={customer.profileImage}
                    alt={customer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#22C55E]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-[#111111]">{firstName}</p>
              <p className="truncate text-[12px] text-[#6B7280]">
                {customer?.customerId || 'Customer'} · View profile
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Menu
          </p>
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.label}>
                {item.soft ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-[#374151] transition hover:bg-[#F3F4F6]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#4B5563]">
                      <item.icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </button>
                ) : (
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-[14px] font-medium text-[#111111] transition hover:bg-[#EFF6FF]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                      <item.icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-[#F3F4F6] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-[#374151] hover:bg-[#F3F4F6]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#4B5563]">
                <Headphones className="h-4 w-4" />
              </span>
              Help & Support
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-[#374151] hover:bg-[#F3F4F6]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#4B5563]">
                <Settings className="h-4 w-4" />
              </span>
              Settings
            </button>
          </div>
        </nav>

        <div className="border-t border-[#F3F4F6] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[#FFF7ED] px-3 py-2.5">
            <Star className="h-4 w-4 text-[#F59E0B]" />
            <p className="text-[12px] font-medium text-[#92400E]">House of Creatives · Since 2021</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FECACA] bg-white py-3 text-[14px] font-semibold text-[#DC2626]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </div>
  );
}
