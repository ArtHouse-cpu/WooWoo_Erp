import React from 'react';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface MobileNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  to: string;
  badge?: number | string;
}

export interface MobileNavigationProps {
  items: MobileNavItem[];
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items,
  className = '',
}) => {
  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-purple-100/80 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg xl:hidden ${className}`}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition duration-150 ${
                  isActive
                    ? 'text-[#673DE6] font-bold'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      isActive
                        ? 'bg-[#F5F0FF] text-[#673DE6]'
                        : 'bg-transparent text-slate-500'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight">
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span className="absolute top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#673DE6] px-1 text-[9px] font-black text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
