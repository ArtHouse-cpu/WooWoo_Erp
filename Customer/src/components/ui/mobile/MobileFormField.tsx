import React from 'react';

export interface MobileFormFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconPrefix?: React.ReactNode;
  iconSuffix?: React.ReactNode;
}

export const MobileFormField = React.forwardRef<HTMLInputElement, MobileFormFieldProps>(
  ({ label, error, hint, iconPrefix, iconSuffix, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-slate-700 tracking-tight"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {iconPrefix && (
            <div className="absolute left-3 flex items-center text-slate-400 pointer-events-none">
              {iconPrefix}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-11 sm:h-12 rounded-xl border bg-white text-slate-900 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#673DE6]/20 focus:border-[#673DE6] ${
              iconPrefix ? 'pl-9' : 'pl-3.5'
            } ${iconSuffix ? 'pr-9' : 'pr-3.5'} ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-200 hover:border-slate-300'
            } ${className}`}
            {...props}
          />
          {iconSuffix && (
            <div className="absolute right-3 flex items-center text-slate-400">
              {iconSuffix}
            </div>
          )}
        </div>
        {error && <p className="text-[11px] font-bold text-red-500">{error}</p>}
        {hint && !error && <p className="text-[11px] text-slate-400 font-medium">{hint}</p>}
      </div>
    );
  }
);

MobileFormField.displayName = 'MobileFormField';
