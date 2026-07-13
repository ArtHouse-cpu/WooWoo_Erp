import {Link} from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  Crown,
  Headphones,
  MapPin,
  Menu,
  Share2,
  ShoppingBag,
  Star,
  Utensils,
  Wallet,
} from 'lucide-react';
import {BrandMark} from '../../components/auth/AuthShell';
import {useAuthStore} from '../../store/authStore';
import {useIsDesktop} from '../../hooks/useIsDesktop';

const explore = [
  {title: 'Store', subtitle: 'Art supplies', tone: 'bg-[#F3E8FF] text-[#9333EA]', icon: ShoppingBag},
  {title: 'Space', subtitle: 'Book studio', tone: 'bg-[#FFEDD5] text-[#EA580C]', icon: MapPin},
  {title: 'Events', subtitle: 'Workshops', tone: 'bg-[#DCFCE7] text-[#16A34A]', icon: Star},
  {title: 'Art Café', subtitle: 'Order food', tone: 'bg-[#FEF9C3] text-[#CA8A04]', icon: Utensils},
];

const services = [
  {
    title: 'Shop Supplies',
    desc: 'Buy art, craft & stationery supplies.',
    bg: 'bg-[#EAF2FF]',
    btn: 'bg-[#3B82F6]',
  },
  {
    title: 'Book Space',
    desc: 'Book creative spaces for events, workshops & meetings.',
    bg: 'bg-[#F5E9FF]',
    btn: 'bg-[#A855F7]',
  },
  {
    title: 'Get Services',
    desc: 'Find trusted creative services for your needs.',
    bg: 'bg-[#E8F8EF]',
    btn: 'bg-[#22C55E]',
  },
  {
    title: 'Order Food',
    desc: 'Order delicious food from our in-house café.',
    bg: 'bg-[#FFF1E6]',
    btn: 'bg-[#F97316]',
  },
];

function membershipLabel(type?: string) {
  if (!type || type === 'none') return 'Member';
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} Member`;
}

export default function HomePage() {
  const customer = useAuthStore(s => s.customer);
  const isDesktop = useIsDesktop();
  const firstName = (customer?.name || 'Creator').split(' ')[0];
  const wallet = customer?.walletBalance ?? customer?.walletAmount ?? 0;
  const initial = (customer?.name || 'C').charAt(0).toUpperCase();

  return (
    <div className="min-h-dvh bg-[#F5F6F8]">
      <div className={`mx-auto ${isDesktop ? 'max-w-5xl px-8 py-8' : 'max-w-lg px-4 pb-8 pt-4'}`}>
        <header className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#111111]"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 justify-center">
            <BrandMark compact showTagline={false} />
          </div>
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#111111]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>
        </header>

        <section className="rounded-[20px] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
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
              <p className="truncate text-[16px] font-bold text-[#111111]">Hi, {firstName} 👋</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
                <Star className="h-3 w-3 fill-current" />
                {membershipLabel(customer?.membershipType)}
              </span>
            </div>

            <div className="hidden h-10 w-px bg-[#E5E7EB] sm:block" />

            <div className="text-right">
              <p className="text-[11px] text-[#9CA3AF]">Wallet Balance</p>
              <p className="text-[16px] font-bold text-[#111111]">
                ₹{wallet.toLocaleString('en-IN')}
              </p>
            </div>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#3B82F6] text-white"
              aria-label="Wallet"
            >
              <Wallet className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-[#111111]">Explore Art House</h2>
            <button type="button" className="text-[13px] font-semibold text-[#3B82F6]">
              View All &gt;
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {explore.map(item => (
              <div
                key={item.title}
                className="w-[120px] shrink-0 overflow-hidden rounded-[16px] bg-white shadow-sm"
              >
                <div className={`flex h-20 items-center justify-center ${item.tone}`}>
                  <item.icon className="h-7 w-7" />
                </div>
                <div className="p-2.5">
                  <p className="text-[13px] font-bold text-[#111111]">{item.title}</p>
                  <p className="text-[11px] text-[#9CA3AF]">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`mt-6 grid gap-3 ${isDesktop ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {services.map(item => (
            <div key={item.title} className={`relative overflow-hidden rounded-[20px] p-4 ${item.bg}`}>
              <h3 className="text-[15px] font-bold text-[#111111]">{item.title}</h3>
              <p className="mt-1 min-h-[40px] text-[12px] leading-snug text-[#6B7280]">{item.desc}</p>
              <button
                type="button"
                className={`mt-4 flex h-8 w-8 items-center justify-center rounded-full text-white ${item.btn}`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </section>

        <Link
          to="/profile"
          className="mt-6 flex items-center gap-3 rounded-[18px] bg-gradient-to-r from-[#FFF7ED] to-[#FEF3C7] p-4"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#FFEDD5] text-[#D97706]">
            <Crown className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-[#111111]">Upgrade Membership</p>
            <p className="text-[12px] text-[#6B7280]">Unlock more exclusive offers & benefits.</p>
          </div>
          <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
        </Link>

        <section className="mt-6 grid grid-cols-3 divide-x divide-[#E5E7EB] rounded-[18px] bg-white py-4 shadow-sm">
          {[
            {icon: Headphones, title: 'Help', sub: 'Get Support'},
            {icon: MapPin, title: 'Visit', sub: 'Our Location'},
            {icon: Share2, title: 'Share', sub: 'Invite & Earn'},
          ].map(item => (
            <button key={item.title} type="button" className="px-2 text-center">
              <item.icon className="mx-auto h-5 w-5 text-[#3B82F6]" />
              <p className="mt-1 text-[12px] font-semibold text-[#111111]">{item.title}</p>
              <p className="text-[10px] text-[#9CA3AF]">{item.sub}</p>
            </button>
          ))}
        </section>

        <div className="mt-6 text-center">
          <Link to="/profile" className="text-[13px] font-semibold text-[#3B82F6]">
            My Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
