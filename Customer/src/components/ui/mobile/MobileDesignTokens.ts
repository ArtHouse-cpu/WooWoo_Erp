/**
 * Global Mobile Design System Tokens
 * Reference Benchmark: Complete Your Booking Modal (#673DE6 / Lavender & Purple)
 */

export const MOBILE_TOKENS = {
  colors: {
    primary: '#673DE6',
    primaryHover: '#5830d4',
    primaryLight: '#F5F0FF',
    primarySurface: '#FAF7FF',
    primaryBorder: '#E9D5FF',
    primaryDarkText: '#3B0764',

    background: '#FFFFFF',
    surface: '#F8FAFC',
    card: '#FFFFFF',
    cardBorder: 'rgba(233, 213, 255, 0.75)',
    divider: '#F1F5F9',

    heading: '#0F172A',
    body: '#334155',
    muted: '#64748B',
    subtle: '#94A3B8',

    success: '#10B981',
    successBg: '#ECFDF5',
    successBorder: '#A7F3D0',
    successText: '#065F46',

    warning: '#F59E0B',
    warningBg: '#FEF3C7',
    warningBorder: '#FDE68A',
    warningText: '#92400E',

    error: '#EF4444',
    errorBg: '#FEF2F2',
    errorBorder: '#FECACA',
    errorText: '#991B1B',
  },

  typography: {
    pageHeading: 'text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight',
    sectionHeading: 'text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug',
    cardTitle: 'text-sm sm:text-base font-bold text-slate-900 leading-snug',
    bodyText: 'text-xs sm:text-sm font-medium text-slate-600 leading-relaxed',
    secondaryLabel: 'text-[11px] sm:text-xs font-semibold text-slate-400',
    buttonText: 'text-xs sm:text-sm font-black',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
  },

  radii: {
    sm: 'rounded-lg', // 8px
    md: 'rounded-xl', // 12px
    lg: 'rounded-2xl', // 16px
    xl: 'rounded-3xl', // 24px
    full: 'rounded-full',
  },

  shadows: {
    subtle: 'shadow-2xs',
    card: 'shadow-xs shadow-purple-500/5',
    cardHover: 'shadow-md shadow-purple-500/10',
    button: 'shadow-md shadow-purple-500/25',
  },

  breakpoints: {
    compact: '320px',
    small: '360px',
    standard: '390px',
    largeMobile: '430px',
    tablet: '768px',
    desktop: '1024px',
  },
} as const;
