import {Link} from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export type LegalDocKey = 'privacy' | 'terms' | 'membership';

const DOCS: Record<
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
};

type LegalDocumentPageProps = {
  doc: LegalDocKey;
  markdown: string;
};

export function LegalDocumentPage({doc, markdown}: LegalDocumentPageProps) {
  const meta = DOCS[doc];

  return (
    <div className="min-h-dvh bg-[#F4F7FB] text-[#111827]">
      <div className="relative overflow-hidden border-b border-[#E2E8F0] bg-[#0B1F33] text-white">
        <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-[#3B82F6]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 pb-8 pt-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/login" className="text-[12px] font-medium text-white/70 hover:text-white">
              ← Back
            </Link>
            <nav className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
              {(Object.keys(DOCS) as LegalDocKey[]).map(key => {
                const item = DOCS[key];
                const active = key === doc;
                return (
                  <Link
                    key={key}
                    to={item.path}
                    className={`rounded-full px-3 py-1.5 transition ${
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
          </div>
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
          <div className="flex flex-wrap gap-3">
            {(Object.keys(DOCS) as LegalDocKey[])
              .filter(key => key !== doc)
              .map(key => (
                <Link key={key} to={DOCS[key].path} className="font-medium text-[#2563EB] hover:underline">
                  {DOCS[key].title}
                </Link>
              ))}
          </div>
        </div>
      </article>
    </div>
  );
}
