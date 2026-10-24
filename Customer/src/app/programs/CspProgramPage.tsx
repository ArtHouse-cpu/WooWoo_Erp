import {Link} from 'react-router-dom';
import {useCspApplication} from '../../hooks/useCspApplication';

export default function CspProgramPage() {
  const {application, loaded} = useCspApplication();

  if (!loaded) {
    return (
      <div className="p-6 text-sm text-slate-500">Loading your CSP program…</div>
    );
  }

  if (application?.status === 'rejected') {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">CSP Program</h1>
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Your application was rejected.
          {application.rejectionReason
            ? ` Reason: ${application.rejectionReason}`
            : ''}
        </p>
        <Link to="/programs" className="mt-4 inline-block text-sm font-semibold text-[#EA580C]">
          Back to programs
        </Link>
      </div>
    );
  }

  if (application?.status !== 'approved') {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">CSP Program</h1>
        <p className="mt-3 text-sm text-slate-600">
          {application?.status === 'under_review'
            ? 'Your application is under review. The program appears in the sidebar after it is approved.'
            : 'Apply from Programs. The CSP Program appears in the sidebar only after approval.'}
        </p>
        <Link to="/programs" className="mt-4 inline-block text-sm font-semibold text-[#EA580C]">
          Go to programs
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfe] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-black text-slate-900">CSP Program</h1>
        <p className="text-sm text-slate-500">Creative Seller Partner</p>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Approved
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{application.brandName}</h2>
          <a
            href={`https://${application.prositeUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-[#EA580C]"
          >
            {application.prositeUrl}
          </a>
          {application.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {application.categories.map(category => (
                <span
                  key={category}
                  className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
