import React from 'react';

export interface MobileCardProps {
  children: React.ReactNode;
  variant?: 'white' | 'lavender' | 'subtle' | 'outline';
  className?: string;
  onClick?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'compact' | 'standard' | 'large';
}

const variantStyles = {
  white: 'bg-white border border-purple-100/80 shadow-2xs',
  lavender: 'bg-[#FAF7FF] border border-purple-200/75 shadow-2xs',
  subtle: 'bg-[#F8FAFC] border border-slate-200/80 shadow-2xs',
  outline: 'bg-transparent border border-purple-200/90',
};

const paddingStyles = {
  none: 'p-0',
  compact: 'p-2.5 sm:p-3',
  standard: 'p-3.5 sm:p-4',
  large: 'p-4 sm:p-5',
};

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  variant = 'white',
  className = '',
  onClick,
  header,
  footer,
  padding = 'standard',
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl transition duration-150 ${variantStyles[variant]} ${
        onClick ? 'cursor-pointer hover:border-purple-300 hover:shadow-xs active:scale-[0.99]' : ''
      } ${className}`}
    >
      {header && (
        <div className="border-b border-purple-50/80 px-3.5 py-2.5 sm:px-4 sm:py-3">
          {header}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
      {footer && (
        <div className="border-t border-purple-50/80 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-slate-50/50 rounded-b-2xl">
          {footer}
        </div>
      )}
    </div>
  );
};
