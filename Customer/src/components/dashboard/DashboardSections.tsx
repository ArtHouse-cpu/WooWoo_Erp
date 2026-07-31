import {
  ArrowRight,
  ChevronRight,
  Crown,
  Flame,
  Headphones,
  MapPin,
  Share2,
  ShoppingBag,
  Users,
} from 'lucide-react';
import {Link} from 'react-router-dom';
import {motion} from 'framer-motion';
import {
  actionItems,
  exploreItemsDesktop,
  serviceItems,
  topArtists,
  upcomingEvents,
} from '../../data/dashboard';
import {cardClass, SectionHeading} from './SectionHeading';

export function ExploreGrid({onItemClick}: {onItemClick?: (id: string) => void}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-extrabold tracking-tight text-[#111111] sm:text-[18px]">
          Explore Art House
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6 lg:gap-4">
        {exploreItemsDesktop.map((item, i) => {
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onItemClick?.(item.id)}
              initial={{opacity: 0, y: 12}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: i * 0.05}}
              whileHover={{y: -4}}
              className="col-span-1 group relative flex flex-col overflow-hidden rounded-[20px] border border-black/[0.05] bg-white text-left shadow-[0_8px_30px_rgba(0,0,0,0.03)] h-[170px] sm:h-[190px] lg:h-[210px]"
            >
              {/* Card Image */}
              <div className="relative h-[95px] w-full overflow-hidden bg-slate-100 sm:h-[115px] lg:h-[125px]">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Category Badge overlay */}
              <div className="absolute left-3.5 top-[95px] -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white shadow-[0_4px_10px_rgba(0,0,0,0.06)] sm:top-[115px] sm:h-9 sm:w-9 lg:top-[125px]">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full sm:h-7 sm:w-7 ${item.iconBg}`}>
                  <item.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${item.iconColor}`} strokeWidth={2.5} />
                </div>
              </div>

              {/* Content Area */}
              <div className="relative flex flex-1 flex-col justify-between p-3 pt-4 sm:p-4 sm:pt-6">
                <div className="min-w-0 pr-6 sm:pr-8">
                  <p className="truncate text-[14px] font-black text-[#111111] sm:text-[15px] leading-tight">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-[11px] font-bold text-[#4B5563] sm:text-[12px] leading-snug">
                    {item.subtitle}
                  </p>
                </div>

                {/* Small orange navigation arrow button */}
                <div className="absolute bottom-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#EA580C] text-[#FFFFFF] shadow-sm transition-all duration-200 group-hover:bg-[#F97316] group-hover:scale-105 sm:bottom-4 sm:right-4 sm:h-7 sm:w-7">
                  <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export function ServiceCards() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {serviceItems.map((item, i) => (
        <motion.button
          key={item.id}
          type="button"
          initial={{opacity: 0, y: 14}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.1 + i * 0.05}}
          whileHover={{y: -5, scale: 1.01}}
          className={`relative min-h-[160px] overflow-hidden rounded-[24px] bg-gradient-to-br p-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:min-h-[180px] ${item.gradient}`}
        >
          <span
            aria-hidden
            className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${item.blob} blur-md`}
          />
          <span className="absolute bottom-3 right-3 select-none text-[42px] opacity-90">
            {item.emoji}
          </span>
          <h3 className={`relative text-[17px] font-bold ${item.titleColor}`}>{item.title}</h3>
          <p className="relative mt-1 max-w-[85%] text-[12px] leading-snug text-[#6B7280]">
            {item.desc}
          </p>
          <span
            className={`relative mt-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md ${item.btn}`}
          >
            <ChevronRight className="h-4 w-4" />
          </span>
        </motion.button>
      ))}
    </section>
  );
}

export function MembershipBanner() {
  return (
    <motion.div
      whileHover={{y: -2}}
      className="flex items-center justify-between gap-2.5 sm:gap-4 rounded-[18px] bg-gradient-to-r from-[#FAF5FF] via-[#FFF0F6] to-[#FFF7ED] border border-[#F3E8FF] py-2.5 px-3 sm:p-3 shadow-[0_4px_20px_rgba(139,92,246,0.04)]"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-[12px] bg-white border border-[#EDE9FE] text-[#7C3AED] shadow-sm">
          <Crown className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-black text-[#111111] leading-tight sm:text-[14px]">Upgrade Membership</p>
          <p className="mt-0.5 text-[10.5px] font-semibold text-[#6B7280] leading-snug sm:text-[11px]">
           <p>
  Unlock more exclusive offers,
  <br />
  cashback & benefits.
</p>
          </p>
        </div>
      </div>
      <Link
        to="/membership"
        className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-[#F97316]/30 bg-white px-2.5 py-1 text-[10.5px] font-extrabold text-[#EA580C] shadow-sm transition hover:bg-[#FFF8F2] sm:px-3 sm:py-1.5 sm:text-[11px]"
      >
        Upgrade Now <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
      </Link>
    </motion.div>
  );
}

export function ActionCards({
  onActionClick,
  isSticky = false,
}: {
  onActionClick?: (id: string) => void;
  isSticky?: boolean;
}) {
  const icons = {
    headphones: Headphones,
    map: MapPin,
    share: Share2,
  };

  const colors = {
    help: 'text-[#7C3AED]',
    visit: 'text-[#2563EB]',
    share: 'text-[#22C55E]',
  };

  return (
    <div
      className={`rounded-[18px] border bg-white/95 backdrop-blur-md py-1.5 px-1.5 grid grid-cols-3 divide-x divide-slate-100 ${
        isSticky
          ? 'shadow-[0_-6px_20px_rgba(15,23,42,0.1)] border-black/[0.08]'
          : 'shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-black/[0.05]'
      }`}
    >
      {actionItems.map(item => {
        const Icon = icons[item.icon];
        const colorClass = colors[item.id as keyof typeof colors] || item.color;
        const className = `${cardClass} px-2 py-2 text-center`;

        if (item.to) {
          return (
            <motion.div key={item.id} whileHover={{y: -2}}>
              <Link to={item.to} className={`${className} block`}>
                <Icon className={`mx-auto h-4 w-4 ${item.color}`} strokeWidth={1.75} />
                <p className="mt-1 text-[12px] font-semibold text-[#111111]">{item.title}</p>
                <p className="text-[10px] text-[#6B7280]">{item.subtitle}</p>
              </Link>
            </motion.div>
          );
        }

        return (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => onActionClick?.(item.id)}
            whileHover={{scale: 1.02}}
            whileTap={{scale: 0.96}}
            className="flex flex-col items-center justify-center py-1 px-1 text-center transition cursor-pointer"
          >
            <Icon className={`h-4.5 w-4.5 ${colorClass}`} strokeWidth={2} />
            <p className="mt-1 text-[12px] font-extrabold text-[#111111] leading-none">{item.title}</p>
            <p className="mt-0.5 text-[9.5px] font-semibold text-[#9CA3AF] leading-none">{item.subtitle}</p>
          </motion.button>
        );
      })}
    </div>
  );
}

export function UpcomingEvents() {
  return (
    <div className={`${cardClass} p-5`}>
      <SectionHeading title="Upcoming Events" />
      <ul className="divide-y divide-[#F3F4F6]">
        {upcomingEvents.map(event => (
          <li key={event.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold ${event.tone}`}
            >
              {event.title.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#111111]">{event.title}</p>
              <p className="truncate text-[11px] text-[#6B7280]">
                {event.date} · {event.time} · {event.location}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-3 w-full rounded-2xl bg-[#EEF4FF] py-2.5 text-[13px] font-semibold text-[#2563EB]"
      >
        Explore All Events
      </button>
    </div>
  );
}

export function TopArtists() {
  return (
    <div className={`${cardClass} p-5`}>
      <SectionHeading title="Top Artists" />
      <ul className="space-y-3">
        {topArtists.map(artist => (
          <li key={artist.id} className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${artist.tone}`}
            >
              {artist.initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#111111]">{artist.name}</p>
              <p className="truncate text-[11px] text-[#6B7280]">{artist.handle}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#EA580C]">
              <Flame className="h-3.5 w-3.5" /> {artist.score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProgramsSection({
  onProgramClick,
}: {
  onProgramClick?: (tab: 'csp' | 'hap') => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-extrabold tracking-tight text-[#111111] sm:text-[18px]">
          Our Programs
        </h2>
        <p className="text-[11px] font-bold text-[#EA580C] bg-[#FFF8F2] border border-[#FFEDD5] rounded-full px-2.5 py-0.5 leading-none">
          Grow & Earn
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* CSP Card */}
        <motion.button
          type="button"
          onClick={() => onProgramClick?.('csp')}
          whileHover={{y: -4, scale: 1.01}}
          className="group flex items-start gap-4 p-5 rounded-[24px] border border-black/[0.05] bg-white text-left shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all cursor-pointer w-full"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3EB] text-[#EA580C] group-hover:scale-105 transition-transform">
            <ShoppingBag className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-black text-[#111111] leading-tight">
              Creative sailor Program
            </h3>
            <p className="mt-1 text-[11px] font-extrabold text-slate-400 leading-none">
              CSP
            </p>
            <p className="mt-2 text-[12px] font-semibold text-[#4B5563] leading-snug">
              Sell your creative products directly at WooWoo Art House with zero rent and investment.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-[12px] font-extrabold text-[#EA580C]">
              <span>Learn More</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
            </div>
          </div>
        </motion.button>

        {/* HAP Card */}
        <motion.button
          type="button"
          onClick={() => onProgramClick?.('hap')}
          whileHover={{y: -4, scale: 1.01}}
          className="group flex items-start gap-4 p-5 rounded-[24px] border border-black/[0.05] bg-white text-left shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all cursor-pointer w-full"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED] group-hover:scale-105 transition-transform">
            <Users className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-black text-[#111111] leading-tight">
              House Affiliate Program
            </h3>
            <p className="mt-1 text-[11px] font-extrabold text-slate-400 leading-none">
              HAP
            </p>
            <p className="mt-2 text-[12px] font-semibold text-[#4B5563] leading-snug">
              Promote art events, workspaces & workshops and earn 10% commission on every booking.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-[12px] font-extrabold text-[#7C3AED]">
              <span>Learn More</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
            </div>
          </div>
        </motion.button>
      </div>
    </section>
  );
}
