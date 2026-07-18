import {useState} from 'react';
import {DashboardSidebar} from '../../components/dashboard/DashboardSidebar';
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
import {SuppliesBottomSheet} from '../../components/dashboard/SuppliesBottomSheet';
import {ServicesBottomSheet} from '../../components/dashboard/ServicesBottomSheet';
import {EventsBottomSheet} from '../../components/dashboard/EventsBottomSheet';
import {SpaceBottomSheet} from '../../components/dashboard/SpaceBottomSheet';
import {WoofooBottomSheet} from '../../components/dashboard/WoofooBottomSheet';
import {HelpSupportBottomSheet} from '../../components/dashboard/HelpSupportBottomSheet';

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [suppliesOpen, setSuppliesOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [woofooOpen, setWoofooOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleActionClick = (id: string) => {
    if (id === 'help') {
      setHelpOpen(true);
    }
  };

  const handleExploreClick = (id: string) => {
    if (id === 'store') {
      setSuppliesOpen(true);
    } else if (id === 'services') {
      setServicesOpen(true);
    } else if (id === 'events') {
      setEventsOpen(true);
    } else if (id === 'space') {
      setSpaceOpen(true);
    } else if (id === 'cafe') {
      setWoofooOpen(true);
    }
  };

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
            <ExploreGrid onItemClick={handleExploreClick} />
            <MembershipBanner />
            <ActionCards onActionClick={handleActionClick} />
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

          <div className="space-y-5 pb-4">
            <HeroBanner />
            <ExploreGrid onItemClick={handleExploreClick} />
            <MembershipBanner />
            <ActionCards onActionClick={handleActionClick} />
          </div>
        </div>
      </div>

      <SuppliesBottomSheet isOpen={suppliesOpen} onClose={() => setSuppliesOpen(false)} />
      <ServicesBottomSheet isOpen={servicesOpen} onClose={() => setServicesOpen(false)} />
      <EventsBottomSheet isOpen={eventsOpen} onClose={() => setEventsOpen(false)} />
      <SpaceBottomSheet isOpen={spaceOpen} onClose={() => setSpaceOpen(false)} />
      <WoofooBottomSheet isOpen={woofooOpen} onClose={() => setWoofooOpen(false)} />
      <HelpSupportBottomSheet isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
