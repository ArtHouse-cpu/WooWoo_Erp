import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface MobileStatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  subValue?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const MobileStatCard: React.FC<MobileStatCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor = 'text-[#673DE6]',
  iconBg = 'bg-[#F5F0FF] border-purple-100',
  subValue,
  trend,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-purple-100/80 bg-white p-3 sm:p-3.5 shadow-2xs transition ${
        onClick ? 'cursor-pointer hover:border-purple-300 active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        {Icon && (
          <div
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border ${iconBg} ${iconColor} shrink-0`}
          >
            <Icon size={16} strokeWidth={2.2} />
          </div>
        )}
        {trend && (
          <span
            className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full ${
              trend.isPositive !== false
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
          {value}
        </div>
        <div className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
          {label}
        </div>
        {subValue && (
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-400">
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
};
