import React from 'react';

export interface MobileFilterOption {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export interface MobileFilterBarProps {
  options: MobileFilterOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const MobileFilterBar: React.FC<MobileFilterBarProps> = ({
  options,
  activeId,
  onChange,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${className}`}
    >
      {options.map(option => {
        const isActive = activeId === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              isActive
                ? 'bg-[#673DE6] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {Icon && <Icon size={13} className={isActive ? 'text-white' : 'text-slate-500'} />}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
