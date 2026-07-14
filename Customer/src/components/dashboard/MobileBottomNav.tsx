import {Link, useLocation} from 'react-router-dom';
import {Compass, Home, MessageCircle, Plus, User} from 'lucide-react';

const tabs = [
  {id: 'home', label: 'Home', icon: Home, to: '/home'},
  {id: 'explore', label: 'Explore', icon: Compass},
  {id: 'create', label: 'Create', icon: Plus, create: true},
  {id: 'messages', label: 'Messages', icon: MessageCircle},
  {id: 'profile', label: 'Profile', icon: User, to: '/profile'},
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.05] bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur xl:hidden">
      <ul className="mx-auto flex max-w-lg items-end justify-between">
        {tabs.map(tab => {
          const active = tab.to ? location.pathname === tab.to : false;
          const Icon = tab.icon;

          if (tab.create) {
            return (
              <li key={tab.id} className="-mt-5">
                <button
                  type="button"
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#F97316] to-[#EC4899] text-white shadow-[0_10px_24px_rgba(236,72,153,0.35)]"
                  aria-label="Create"
                >
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                </button>
              </li>
            );
          }

          const className = `flex min-w-[56px] flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium ${
            active ? 'text-[#2563EB]' : 'text-[#9CA3AF]'
          }`;

          if (tab.to) {
            return (
              <li key={tab.id}>
                <Link to={tab.to} className={className}>
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  {tab.label}
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.id}>
              <button type="button" className={className}>
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
