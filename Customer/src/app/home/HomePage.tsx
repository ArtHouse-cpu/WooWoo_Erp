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
            <MembershipBanner />
            <ActionCards />
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
          <div className="mb-4">
            <SearchBar className="max-w-none" />
          </div>

          <div className="space-y-5 pb-28">
            <HeroBanner />
            <ExploreGrid />
            <MembershipBanner />
            <ActionCards />
          </div>

          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
