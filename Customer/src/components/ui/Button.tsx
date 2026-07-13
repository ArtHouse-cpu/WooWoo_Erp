import {forwardRef} from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({loading, className = '', children, disabled, variant = 'primary', ...props}, ref) => {
    const base =
      variant === 'primary'
        ? 'bg-ink text-white hover:bg-black'
        : variant === 'danger'
          ? 'border border-[#FECACA] bg-white text-[#DC2626] hover:bg-[#FEF2F2]'
          : 'bg-transparent text-brand-blue hover:bg-blue-50';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${base} ${className}`}
        {...props}
      >
        {loading ? (
          <span
            className={`h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${
              variant === 'danger' ? 'border-[#DC2626]/30 border-t-[#DC2626]' : 'border-white/30 border-t-white'
            }`}
          />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
