import {ShieldCheck} from 'lucide-react';
import {Link} from 'react-router-dom';
import logo from '../../assets/Logo.png';

const features = [
  {label: 'Creative Community', color: 'bg-blue-500'},
  {label: 'Inspire Each Other', color: 'bg-orange-400'},
  {label: 'Collaborate Freely', color: 'bg-emerald-500'},
  {label: 'Grow Together', color: 'bg-violet-500'},
];

export function BrandMark({
  compact = false,
  showTagline = true,
}: {
  compact?: boolean;
  showTagline?: boolean;
}) {
  return (
    <div className="flex max-w-full items-center gap-3.5">
      <img
        src={logo}
        alt="Woo Woo Art House"
        className={`w-auto max-w-[46vw] object-contain object-left ${
          compact ? 'h-[62px]' : 'h-[4.5rem] sm:h-20'
        }`}
      />
      {showTagline ? (
        <>
          <div className="h-12 w-px shrink-0 bg-[#D1D5DB]" />
          <div className="min-w-0 text-left">
            <p className="whitespace-nowrap text-[13px] font-semibold leading-snug text-[#1F2937]">
              House of Creatives!
            </p>
            <p className="mt-0.5 text-[11px] text-[#9CA3AF]">Since 2021</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function BrandPanel() {
  return (
    <aside className="brush-bg relative hidden min-h-screen flex-col justify-between px-10 py-8 lg:flex xl:px-16">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white">
          a⁺
        </span>
        Atives
      </div>

      <div className="mx-auto max-w-md space-y-10">
        <BrandMark />
        <div className="grid grid-cols-2 gap-4">
          {features.map(item => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur"
            >
              <div className={`mb-3 h-9 w-9 rounded-xl ${item.color} opacity-90`} />
              <p className="text-sm font-medium text-slate-700">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">Crafted for creatives · Woo Woo Art House</p>
    </aside>
  );
}

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showShield?: boolean;
  variant?: 'welcome' | 'default';
  footer?: React.ReactNode;
};

export function AuthShell({
  children,
  title,
  subtitle,
  showShield = true,
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
            {showShield ? (
              <div className="mx-auto mb-5 hidden h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-brand-blue lg:flex">
                <ShieldCheck className="h-7 w-7" />
              </div>
            ) : null}

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
