import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backText?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  backText,
  actions,
  badge,
  className = '',
}) => {
  return (
    <div className={`mb-3 sm:mb-4 pt-1 sm:pt-2 ${className}`}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#673DE6] transition mb-2 cursor-pointer"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 group-hover:bg-[#F5F0FF] text-slate-600 group-hover:text-[#673DE6] transition">
            <ArrowLeft size={14} strokeWidth={2.5} />
          </div>
          {backText && <span>{backText}</span>}
        </button>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};
