import {
  ArrowRight,
  ChevronRight,
  Crown,
  Flame,
  Headphones,
  MapPin,
  Share2,
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
        <Link
          to="/explore"
          className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#EA580C] hover:text-[#C2410C] transition-colors"
        >
          View All <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="grid grid-cols-6 gap-3 lg:grid-cols-5 lg:gap-4">
        {exploreItemsDesktop.map((item, i) => {
          const colSpan = i < 3 ? 'col-span-2 lg:col-span-1' : 'col-span-3 lg:col-span-1';
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onItemClick?.(item.id)}
              initial={{opacity: 0, y: 12}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: i * 0.05}}
              whileHover={{y: -4}}
              className={`${colSpan} group relative flex flex-col overflow-hidden rounded-[20px] border border-black/[0.05] bg-white text-left shadow-[0_8px_30px_rgba(0,0,0,0.03)] h-[155px] sm:h-[185px] lg:h-[210px]`}
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
              <div className="relative flex flex-1 flex-col justify-between p-3 pt-5 sm:p-4 sm:pt-6">
                <div className="min-w-0 pr-6">
                  <p className="truncate text-[12px] font-extrabold text-[#111111] sm:text-[14px] leading-tight">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-[9.5px] font-semibold text-[#9CA3AF] sm:text-[11px]">
                    {item.subtitle}
                  </p>
                </div>

                {/* Small orange navigation arrow button */}
                <div className="absolute bottom-3 right-3 flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#EA580C] text-[#FFFFFF] shadow-sm transition-all duration-200 group-hover:bg-[#F97316] group-hover:scale-105 sm:bottom-4 sm:right-4 sm:h-7 sm:w-7">
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
      className="flex items-center justify-between gap-4 rounded-[24px] bg-gradient-to-r from-[#FAF5FF] via-[#FFF0F6] to-[#FFF7ED] border border-[#F3E8FF] p-4 shadow-[0_8px_30px_rgba(139,92,246,0.05)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white border border-[#EDE9FE] text-[#7C3AED] shadow-sm">
          <Crown className="h-[22px] w-[22px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-black text-[#111111] leading-tight">Upgrade Membership</p>
          <p className="mt-0.5 text-[11px] font-medium text-[#6B7280]">
            Unlock more exclusive offers & benefits.
          </p>
        </div>
      </div>
      <Link
        to="/membership"
        className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-[#F97316]/30 bg-white px-4 py-2 text-[12px] font-extrabold text-[#EA580C] shadow-sm transition hover:bg-[#FFF8F2]"
      >
        Upgrade Now <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </Link>
    </motion.div>
  );
}

export function ActionCards() {
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
    <div className="rounded-[24px] border border-black/[0.05] bg-white py-4 px-2 shadow-[0_8px_30px_rgba(0,0,0,0.03)] grid grid-cols-3 divide-x divide-slate-100">
      {actionItems.map(item => {
        const Icon = icons[item.icon];
        const colorClass = colors[item.id as keyof typeof colors] || item.color;
        return (
          <motion.button
            key={item.id}
            type="button"
            whileHover={{scale: 1.02}}
            className="flex flex-col items-center justify-center py-2 px-1 text-center transition cursor-pointer"
          >
            <Icon className={`h-5 w-5 ${colorClass}`} strokeWidth={2} />
            <p className="mt-2 text-[13px] font-extrabold text-[#111111] leading-none">{item.title}</p>
            <p className="mt-1 text-[10px] font-semibold text-[#9CA3AF] leading-none">{item.subtitle}</p>
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
