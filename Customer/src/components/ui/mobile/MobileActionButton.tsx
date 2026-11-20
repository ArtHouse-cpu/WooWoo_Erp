import React from 'react';
import { Loader2 } from 'lucide-react';

export interface MobileActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantStyles = {
  primary:
    'bg-[#673DE6] hover:bg-[#5830d4] text-white shadow-md shadow-purple-500/25 border-transparent active:scale-[0.99]',
  secondary:
    'bg-[#F5F0FF] hover:bg-[#EDE9FE] text-[#673DE6] border border-purple-200/80 active:scale-[0.99]',
  outline:
    'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs active:scale-[0.99]',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent active:scale-[0.99]',
  danger:
    'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/25 border-transparent active:scale-[0.99]',
};

const sizeStyles = {
  sm: 'h-9 px-3.5 text-xs rounded-xl font-bold gap-1.5',
  md: 'h-11 px-4 text-xs sm:text-sm rounded-xl sm:rounded-2xl font-black gap-2',
  lg: 'h-12 sm:h-13 px-5 text-sm sm:text-base rounded-2xl font-black gap-2.5',
};

export const MobileActionButton: React.FC<MobileActionButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  isLoading = false,
  icon,
  iconPosition = 'right',
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition border font-display cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
        fullWidth ? 'w-full' : 'w-auto'
      } ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin shrink-0" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
