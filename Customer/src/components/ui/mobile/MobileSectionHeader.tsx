import React from 'react';

export interface MobileSectionHeaderProps {
  title: string;
  count?: number | string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const MobileSectionHeader: React.FC<MobileSectionHeaderProps> = ({
  title,
  count,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-2 mb-2.5 sm:mb-3 ${className}`}>
      <div className="flex items-center gap-2">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
          {title}
        </h2>
        {count !== undefined && (
          <span className="rounded-full bg-[#F5F0FF] border border-purple-200/60 px-2 py-0.5 text-[11px] font-black text-[#673DE6]">
            {count}
          </span>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-xs font-bold text-[#673DE6] hover:text-[#5830d4] transition cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
