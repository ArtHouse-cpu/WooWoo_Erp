
import {Link} from 'react-router-dom';
import logo from '../../assets/Logo.png';



export function BrandMark({
  compact = false,
  showTagline = true,
}: {
  compact?: boolean;
  showTagline?: boolean;
}) {
  return (
    <div
      className={`flex max-w-full ${
        compact ? 'items-center gap-3.5' : 'flex-col items-center text-center'
      }`}
    >
      <img
        src={logo}
        alt="Woo Woo Art House"
        className={`object-contain ${
          compact
            ? 'object-left h-[62px] w-auto max-w-[46vw]'
            : 'object-center w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[400px] h-auto'
        }`}
      />
      {showTagline ? (
        <>
          {compact ? (
            <div className="h-12 w-px shrink-0 bg-[#D1D5DB]" />
          ) : null}
          <div
            className={`min-w-0 ${
              compact ? 'text-left' : 'flex flex-col items-center w-fit mt-0'
            }`}
          >
            {!compact && <div className="w-full h-[1.5px] bg-black mb-0" />}
            <p
              className={`font-bold tracking-tight text-[#1F2937] ${
                compact
                  ? 'whitespace-nowrap text-[13px] leading-snug'
                  : 'text-2xl sm:text-[1.75rem] lg:text-[2.25rem] leading-tight mt-0'
              }`}
            >
              House of Creatives!
            </p>
           {compact ? (
  <p className="mt-0.5 text-[11px] text-[#6B7280]/50">
    Since 2021
  </p>
) : (
<>
  <p className="mt-2 text-8xl sm:text-[1.75rem] lg:text-[8rem] font-black leading-tight text-[#6B7280]/5 [-webkit-text-stroke:3px_rgba(107,114,128,0.05)] ">
    SINCE
  </p>

  <p className="mt-[-40px] text-8xl sm:text-[1.75rem] lg:text-[8rem] scale-x-110 origin-left font-black leading-tight text-[#6B7280]/5 [-webkit-text-stroke:3px_rgba(107,114,128,0.05)] ">
  2 0 2 1
</p>
</>
)}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function BrandPanel() {
  return (
    <aside className="brush-bg relative hidden min-h-screen flex-col justify-between px-10 py-8 lg:flex xl:px-16">
     

      <div className="mx-auto max-w-md space-y-10 mt-12 lg:mt-20">
        <BrandMark />
     
      </div>

      <p className="text-xs text-slate-500">© 2026 WOOWOO ART HOUSE. All rights reserved.</p>
    </aside>
  );
}

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;

  variant?: 'welcome' | 'default';
  footer?: React.ReactNode;
};

export function AuthShell({
  children,
  title,
  subtitle,

  variant = 'default',
  footer,
}: AuthShellProps) {
  const isWelcome = variant === 'welcome';

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <BrandPanel />

      <section
        className={`relative flex min-h-screen flex-col px-5 pb-8 pt-6 sm:px-8 ${
          isWelcome ? 'brush-bg lg:bg-surface' : 'bg-white lg:bg-surface'
        }`}
      >
        <div className="mb-6 hidden items-center justify-end lg:flex">
          <Link
            to="/signup"
            className="inline-flex items-center rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            Join Now +
          </Link>
        </div>

        <header className="mb-10 lg:hidden">
          <BrandMark compact />
        </header>

        <div className="flex flex-1 flex-col lg:items-center lg:justify-center">
          <div
            className={`mx-auto flex w-full max-w-md flex-1 flex-col lg:flex-none ${
              isWelcome
                ? 'lg:auth-card lg:rounded-[28px] lg:border lg:border-white/80 lg:p-8'
                : 'auth-card rounded-[28px] border border-white/80 p-6 sm:p-8 lg:flex-none'
            }`}
          >
            <h1 className="text-center text-[2rem] font-bold tracking-tight text-ink lg:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-center text-[15px] text-muted lg:text-sm">{subtitle}</p>

            <div className="mt-8 flex flex-1 flex-col lg:mt-7 lg:flex-none">{children}</div>
            {footer ? <div className="mt-6 lg:mt-5">{footer}</div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
