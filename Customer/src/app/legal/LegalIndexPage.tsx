import {Link} from 'react-router-dom';
import {LEGAL_DOCS, type LegalDocKey} from '../../components/legal/LegalDocumentPage';

export default function LegalIndexPage() {
  return (
    <div className="min-h-dvh bg-[#F4F7FB]">
      <div className="border-b border-[#E2E8F0] bg-[#0B1F33] text-white">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
          <Link to="/login" className="text-[12px] font-medium text-white/70 hover:text-white">
            ← Back
          </Link>
          <p className="mt-6 font-[Georgia,ui-serif,serif] text-[30px] tracking-tight">
            WOOWOO ART HOUSE
          </p>
          <h1 className="mt-2 text-[18px] font-semibold text-[#93C5FD]">Legal & Policies</h1>
          <p className="mt-2 text-[13px] text-white/70">
            A venture of JHA SONS AND ARRAY LLP · Updated on 14th July 2026
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <ul className="space-y-3">
          {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map(key => {
            const item = LEGAL_DOCS[key];
            return (
              <li key={key}>
                <Link
                  to={item.path}
                  className="flex items-center justify-between rounded-[16px] border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm transition hover:border-[#BFDBFE]"
                >
                  <span className="text-[14px] font-semibold text-[#0B1F33]">{item.title}</span>
                  <span className="text-[12px] font-medium text-[#2563EB]">Open →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
