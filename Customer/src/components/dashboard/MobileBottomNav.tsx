import {Link, useLocation} from 'react-router-dom';
import {Gift, Home, User, Users, Wallet} from 'lucide-react';

const tabs = [
  {id: 'home', label: 'Home', icon: Home, to: '/home'},
  {id: 'referrals', label: 'Referrals', icon: Users},
  {id: 'wallet', label: 'Wallet', icon: Wallet, to: '/wallet'},
  {id: 'rewards', label: 'Rewards', icon: Gift},
  {id: 'profile', label: 'Profile', icon: User, to: '/profile'},
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.05] bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur xl:hidden">
      <ul className="mx-auto flex max-w-lg items-center justify-between">
        {tabs.map(tab => {
          const active = tab.to ? location.pathname === tab.to : false;
          const Icon = tab.icon;

          const className = `flex min-w-[60px] flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-extrabold transition-all duration-150 ${
            active ? 'text-[#EA580C]' : 'text-[#9CA3AF]'
          }`;

          if (tab.to) {
            return (
              <li key={tab.id}>
                <Link to={tab.to} className={className}>
                  <Icon className="h-[20px] w-[20px]" strokeWidth={active ? 2.5 : 1.75} />
                  {tab.label}
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.id}>
              <button type="button" className={className}>
                <Icon className="h-[20px] w-[20px]" strokeWidth={1.75} />
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
