import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import {DashboardSidebar} from '../../components/dashboard/DashboardSidebar';
import {MobileBottomNav} from '../../components/dashboard/MobileBottomNav';
import {TopNavbar, MobileHeader} from '../../components/dashboard/TopNavbar';
import {HeroBanner, ProfileAsideCard} from '../../components/dashboard/HeroBanner';
import {
  ActionCards,
  ExploreGrid,
  MembershipBanner,
  ServiceCards,
  TopArtists,
  UpcomingEvents,
} from '../../components/dashboard/DashboardSections';
import {SearchBar} from '../../components/dashboard/SearchBar';

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#FAFBFD]">
      <DashboardSidebar
        mode="drawer"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="mx-auto max-w-[1440px] p-4 md:p-6">
        {/* Desktop / tablet shell */}
        <div className="hidden gap-6 xl:flex">
          <DashboardSidebar mode="fixed" />

          <div className="min-w-0 flex-1 space-y-6">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            <HeroBanner />
            <ExploreGrid />
            <ServiceCards />
            <MembershipBanner />
            <ActionCards />
            <div className="pb-2 text-center">
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#2563EB]"
              >
                My Profile <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside className="sticky top-6 flex w-[340px] shrink-0 flex-col gap-5 self-start">
            <ProfileAsideCard />
            <UpcomingEvents />
            <TopArtists />
          </aside>
        </div>

        {/* Mobile / tablet (< xl) */}
        <div className="xl:hidden">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="mb-4 md:block lg:hidden">
            <SearchBar />
          </div>

          <div className="space-y-5 pb-28">
            <HeroBanner />
            <ExploreGrid />
            <ServiceCards />
            <MembershipBanner />
            <ActionCards />
            <UpcomingEvents />
            <TopArtists />
            <div className="pt-1 text-center">
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2563EB]"
              >
                My Profile <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
