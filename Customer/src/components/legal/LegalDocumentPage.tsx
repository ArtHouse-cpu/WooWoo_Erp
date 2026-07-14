import {Link} from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export type LegalDocKey =
  | 'privacy'
  | 'terms'
  | 'membership'
  | 'services'
  | 'events'
  | 'cafe'
  | 'space'
  | 'community'
  | 'returns';

export const LEGAL_DOCS: Record<
  LegalDocKey,
  {path: string; title: string; short: string}
> = {
  privacy: {path: '/privacy', title: 'Privacy Policy', short: 'Privacy'},
  terms: {path: '/terms', title: 'Terms of Use', short: 'Terms'},
  membership: {
    path: '/membershipterms',
    title: 'Membership Terms',
    short: 'Membership',
  },
  services: {path: '/serviceterms', title: 'Services Terms', short: 'Services'},
  events: {path: '/eventsterms', title: 'Events Terms', short: 'Events'},
  cafe: {path: '/cafeterms', title: 'WOOFOO Café Terms', short: 'Café'},
  space: {path: '/spaceterms', title: 'Space Terms', short: 'Space'},
  community: {
    path: '/communityguidelines',
    title: 'Community Guidelines',
    short: 'Community',
  },
  returns: {
    path: '/refundterms',
    title: 'Return, Refund & Cancellation Terms',
    short: 'Returns',
  },
};

type LegalDocumentPageProps = {
  doc: LegalDocKey;
  markdown: string;
};

export function LegalDocumentPage({doc, markdown}: LegalDocumentPageProps) {
  const meta = LEGAL_DOCS[doc];

  return (
    <div className="min-h-dvh bg-[#F4F7FB] text-[#111827]">
      <div className="relative overflow-hidden border-b border-[#E2E8F0] bg-[#0B1F33] text-white">
        <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-[#3B82F6]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 pb-8 pt-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/legal" className="text-[12px] font-medium text-white/70 hover:text-white">
              ← All policies
            </Link>
            <Link to="/login" className="text-[12px] font-medium text-white/70 hover:text-white">
              back
            </Link>
          </div>
          <nav className="mt-4 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto text-[10px] font-semibold uppercase tracking-wide sm:max-h-none sm:text-[11px]">
            {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map(key => {
              const item = LEGAL_DOCS[key];
              const active = key === doc;
              return (
                <Link
                  key={key}
                  to={item.path}
                  className={`rounded-full px-2.5 py-1 transition ${
                    active
                      ? 'bg-white text-[#0B1F33]'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {item.short}
                </Link>
              );
            })}
          </nav>
          <h1 className="mt-2 text-[18px] font-semibold tracking-wide text-[#93C5FD] sm:text-[20px]">
            {meta.title}
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/70">
            A venture of JHA SONS AND ARRAY LLP · Updated on 14th July 2026
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="legal-prose rounded-[22px] border border-[#E5E7EB] bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
          <ReactMarkdown
            components={{
              h1: ({children}) => (
                <h1 className="mb-4 font-[Georgia,ui-serif,serif] text-[26px] font-semibold tracking-tight text-[#0B1F33]">
                  {children}
                </h1>
              ),
              h2: ({children}) => (
                <h2 className="mb-3 mt-8 border-t border-[#EEF2F7] pt-6 text-[15px] font-bold uppercase tracking-[0.04em] text-[#0B1F33]">
                  {children}
                </h2>
              ),
              h3: ({children}) => (
                <h3 className="mb-2 mt-5 text-[14px] font-semibold text-[#1E3A5F]">{children}</h3>
              ),
              p: ({children}) => (
                <p className="mb-3 text-[13.5px] leading-7 text-[#334155]">{children}</p>
              ),
              ul: ({children}) => (
                <ul className="mb-4 list-disc space-y-1.5 pl-5 text-[13.5px] leading-7 text-[#334155]">
                  {children}
                </ul>
              ),
              ol: ({children}) => (
                <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[13.5px] leading-7 text-[#334155]">
                  {children}
                </ol>
              ),
              li: ({children}) => <li className="pl-1">{children}</li>,
              strong: ({children}) => (
                <strong className="font-semibold text-[#0F172A]">{children}</strong>
              ),
              a: ({href, children}) => (
                <a
                  href={href}
                  className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
                >
                  {children}
                </a>
              ),
              hr: () => <hr className="my-8 border-[#E5E7EB]" />,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#64748B]">
          <p>© {new Date().getFullYear()} JHA SONS AND ARRAY LLP · WOOWOO ART HOUSE®</p>
          <Link to="/legal" className="font-medium text-[#2563EB] hover:underline">
            View all policies
          </Link>
        </div>
      </article>
    </div>
  );
}
