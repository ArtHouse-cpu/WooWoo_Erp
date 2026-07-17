import {ArrowRight, ChevronRight, Crown, Flame, Headphones, MapPin, Share2} from 'lucide-react';
import {Link} from 'react-router-dom';
import {motion} from 'framer-motion';
import {
  actionItems,
  exploreItems,
  serviceItems,
  topArtists,
  upcomingEvents,
} from '../../data/dashboard';
import {cardClass, SectionHeading} from './SectionHeading';

export function ExploreGrid() {
  return (
    <section>
      <SectionHeading title="Explore Art House" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {exploreItems.map((item, i) => (
          <motion.button
            key={item.id}
            type="button"
            initial={{opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: i * 0.05}}
            whileHover={{y: -4}}
            className={`${cardClass} overflow-hidden text-left`}
          >
            <div
              className={`flex h-[88px] items-center justify-center bg-gradient-to-br md:h-[110px] ${item.gradient}`}
            >
              <item.icon className={`h-8 w-8 ${item.iconColor}`} strokeWidth={1.7} />
            </div>
            <div className="p-3">
              <p className="text-[14px] font-bold text-[#111111]">{item.title}</p>
              <p className="text-[12px] text-[#6B7280]">{item.subtitle}</p>
            </div>
          </motion.button>
        ))}
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
      className="flex flex-col gap-3 rounded-[24px] bg-gradient-to-r from-[#F3E8FF] via-[#FCE7F3] to-[#FFEDD5] p-4 shadow-[0_8px_30px_rgba(139,92,246,0.12)] sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-[#7C3AED] shadow-sm">
        <Crown className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-[#111111]">Upgrade Membership</p>
        <p className="text-[12px] text-[#6B7280]">
          Unlock more exclusive offers & benefits.
        </p>
      </div>
      <Link
        to="/membership"
        className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-[#F97316]/40 bg-white px-4 py-2.5 text-[13px] font-semibold text-[#EA580C] shadow-sm"
      >
        Upgrade Now <ArrowRight className="h-3.5 w-3.5" />
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

  return (
    <div className="grid grid-cols-3 gap-3">
      {actionItems.map(item => {
        const Icon = icons[item.icon];
        const className = `${cardClass} px-2 py-4 text-center`;

        if (item.to) {
          return (
            <motion.div key={item.id} whileHover={{y: -3}}>
              <Link to={item.to} className={`${className} block`}>
                <Icon className={`mx-auto h-5 w-5 ${item.color}`} strokeWidth={1.75} />
                <p className="mt-2 text-[13px] font-semibold text-[#111111]">{item.title}</p>
                <p className="text-[11px] text-[#6B7280]">{item.subtitle}</p>
              </Link>
            </motion.div>
          );
        }

        return (
          <motion.button
            key={item.id}
            type="button"
            whileHover={{y: -3}}
            className={className}
          >
            <Icon className={`mx-auto h-5 w-5 ${item.color}`} strokeWidth={1.75} />
            <p className="mt-2 text-[13px] font-semibold text-[#111111]">{item.title}</p>
            <p className="text-[11px] text-[#6B7280]">{item.subtitle}</p>
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
