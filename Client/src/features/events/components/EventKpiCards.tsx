import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  FileEdit,
  Users,
  Ticket,
  BadgeIndianRupee,
  UserCheck,
} from "lucide-react";
import { formatInr } from "../utils/eventHelpers";

interface KpiItem {
  id: string;
  label: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  colorClass: string;
  badgeBg: string;
}

interface EventKpiCardsProps {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  totalRegistrations: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalCheckedIn: number;
}

export const EventKpiCards = ({
  totalEvents,
  publishedEvents,
  draftEvents,
  totalRegistrations,
  totalTicketsSold,
  totalRevenue,
  totalCheckedIn,
}: EventKpiCardsProps) => {
  const cards: KpiItem[] = [
    {
      id: "total_events",
      label: "Total Events",
      value: totalEvents,
      subtitle: `${publishedEvents} published`,
      icon: <CalendarDays size={18} className="text-blue-600" />,
      colorClass: "border-blue-100 bg-white dark:bg-slate-900",
      badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    },
    {
      id: "published_events",
      label: "Published",
      value: publishedEvents,
      subtitle: "Live & Booking",
      icon: <CheckCircle2 size={18} className="text-emerald-600" />,
      colorClass: "border-emerald-100 bg-white dark:bg-slate-900",
      badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    },
    {
      id: "draft_events",
      label: "Draft Events",
      value: draftEvents,
      subtitle: "In configuration",
      icon: <FileEdit size={18} className="text-amber-600" />,
      colorClass: "border-amber-100 bg-white dark:bg-slate-900",
      badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    },
    {
      id: "registrations",
      label: "Registrations",
      value: totalRegistrations,
      subtitle: "Customer orders",
      icon: <Users size={18} className="text-purple-600" />,
      colorClass: "border-purple-100 bg-white dark:bg-slate-900",
      badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
    },
    {
      id: "tickets_sold",
      label: "Tickets Sold",
      value: totalTicketsSold,
      subtitle: "Across all categories",
      icon: <Ticket size={18} className="text-indigo-600" />,
      colorClass: "border-indigo-100 bg-white dark:bg-slate-900",
      badgeBg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
    },
    {
      id: "revenue",
      label: "Total Revenue",
      value: formatInr(totalRevenue),
      subtitle: "Gross sales",
      icon: <BadgeIndianRupee size={18} className="text-emerald-600" />,
      colorClass: "border-emerald-200 bg-white dark:bg-slate-900",
      badgeBg: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    },
    {
      id: "checked_in",
      label: "Attendees In",
      value: totalCheckedIn,
      subtitle: `${totalTicketsSold > 0 ? Math.round((totalCheckedIn / totalTicketsSold) * 100) : 0}% turn-out`,
      icon: <UserCheck size={18} className="text-cyan-600" />,
      colorClass: "border-cyan-100 bg-white dark:bg-slate-900",
      badgeBg: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-7">
      {cards.map((c) => (
        <div
          key={c.id}
          className={`flex flex-col justify-between rounded-xl border p-3 shadow-xs transition hover:shadow-sm ${c.colorClass}`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="truncate text-xs font-semibold text-gray-500 dark:text-gray-400">
              {c.label}
            </span>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.badgeBg}`}>
              {c.icon}
            </div>
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold tracking-tight text-gray-900 dark:text-white sm:text-xl">
              {c.value}
            </p>
            {c.subtitle && (
              <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">
                {c.subtitle}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
