import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  stickyFooter?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  stickyFooter,
  maxWidth = 'md',
  className = '',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[125] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full ${maxWidthMap[maxWidth]} rounded-t-[28px] sm:rounded-3xl bg-white shadow-2xl flex flex-col max-h-[96dvh] overflow-hidden text-left animate-in slide-in-from-bottom duration-200 ${className}`}
      >
        {/* Top Handle on Mobile */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-4 pt-2.5 pb-2 sm:px-5 sm:pt-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon}
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {children}
        </div>

        {/* Sticky Footer */}
        {stickyFooter && (
          <div className="sticky bottom-0 left-0 right-0 border-t border-slate-100 bg-white p-3.5 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
            {stickyFooter}
          </div>
        )}
      </div>
    </div>
  );
};
