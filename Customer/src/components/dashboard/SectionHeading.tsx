import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';

export function SectionHeading({
  title,
  actionLabel = 'View All',
  onAction,
  to,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  to?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-bold tracking-tight text-[#111111] md:text-[18px]">{title}</h2>
      {to ? (
        <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2563EB]">
          {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2563EB]"
        >
          {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export const cardClass =
  'rounded-[24px] border border-black/[0.05] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]';
