import React from 'react';

export interface MobilePageContainerProps {
  children: React.ReactNode;
  className?: string;
  withBottomPadding?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  safeAreaTop?: boolean;
}

const maxWidthMap = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export const MobilePageContainer: React.FC<MobilePageContainerProps> = ({
  children,
  className = '',
  withBottomPadding = true,
  maxWidth = '7xl',
  safeAreaTop = false,
}) => {
  return (
    <div
      className={`min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-white text-slate-900 ${
        safeAreaTop ? 'pt-[max(0.75rem,env(safe-area-inset-top))]' : ''
      } ${
        withBottomPadding
          ? 'pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'
          : 'pb-[env(safe-area-inset-bottom,0px)]'
      }`}
    >
      <div
        className={`mx-auto w-full px-3 sm:px-4 md:px-6 ${maxWidthMap[maxWidth]} ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
