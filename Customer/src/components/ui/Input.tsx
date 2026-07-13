import {forwardRef} from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({label, error, leftIcon, rightSlot, className = '', ...props}, ref) => {
    return (
      <label className="block space-y-1.5">
        {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
        <div
          className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 transition focus-within:border-brand-blue focus-within:ring-4 focus-within:ring-blue-100 ${
            error ? 'border-red-400' : 'border-slate-200'
          } ${className}`}
        >
          {leftIcon ? <span className="text-slate-400">{leftIcon}</span> : null}
          <input
            ref={ref}
            className="w-full border-0 bg-transparent text-[15px] outline-none placeholder:text-slate-400"
            {...props}
          />
          {rightSlot}
        </div>
        {error ? <span className="text-xs text-red-500">{error}</span> : null}
      </label>
    );
  },
);

Input.displayName = 'Input';
