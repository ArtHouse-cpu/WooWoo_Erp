import {useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {DashboardSidebar} from '../../components/dashboard/DashboardSidebar';
import {MobileHeader} from '../../components/dashboard/TopNavbar';
import {
  ActionCards,
  ExploreGrid,
  MembershipBanner,
} from '../../components/dashboard/DashboardSections';
import {SuppliesBottomSheet} from '../../components/dashboard/SuppliesBottomSheet';
import {ServicesBottomSheet} from '../../components/dashboard/ServicesBottomSheet';
import {EventsBottomSheet} from '../../components/dashboard/EventsBottomSheet';
import {SpaceBottomSheet} from '../../components/dashboard/SpaceBottomSheet';
import {WoofooBottomSheet} from '../../components/dashboard/WoofooBottomSheet';
import {HelpSupportBottomSheet} from '../../components/dashboard/HelpSupportBottomSheet';
import {VisitBottomSheet} from '../../components/dashboard/VisitBottomSheet';
import {ShareBottomSheet} from '../../components/dashboard/ShareBottomSheet';
import {NotificationsBottomSheet} from '../../components/dashboard/NotificationsBottomSheet';
import {ProgramsBottomSheet} from '../../components/dashboard/ProgramsBottomSheet';

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [suppliesOpen, setSuppliesOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [woofooOpen, setWoofooOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.restoreCoworkingModal) {
      setSpaceOpen(true);
      return;
    }
    try {
      const stored = sessionStorage.getItem('coworking_modal_restore');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.spaceData && (parsed.returnUrl === '/' || parsed.returnUrl === '/home' || parsed.returnUrl?.startsWith('/?'))) {
          setSpaceOpen(true);
        }
      }
    } catch {}
  }, [location]);

  const handleActionClick = (id: string) => {
    if (id === 'help') {
      setHelpOpen(true);
    } else if (id === 'visit') {
      setVisitOpen(true);
    } else if (id === 'share') {
      setShareOpen(true);
    }
  };

  const handleExploreClick = (id: string) => {
    if (id === 'store' || id === 'supplies') {
      setSuppliesOpen(true);
    } else if (id === 'services') {
      setServicesOpen(true);
    } else if (id === 'events') {
      setEventsOpen(true);
    } else if (id === 'space') {
      setSpaceOpen(true);
    } else if (id === 'cafe') {
      setWoofooOpen(true);
    } else if (id === 'programs') {
      setProgramsOpen(true);
    }
  };
 


  return (
    <div className="min-h-dvh bg-[#FAFBFD]">
      <DashboardSidebar
        mode="drawer"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onProgramsClick={() => setProgramsOpen(true)}
      />

      <div className="mx-auto max-w-[1440px] p-4 md:p-6">
        {/* Desktop / tablet shell */}
        <div className="hidden gap-6 xl:flex">
          <DashboardSidebar
            mode="fixed"
            onProgramsClick={() => setProgramsOpen(true)}
          />

          <div className="min-w-0 flex-1 space-y-6">
            <ExploreGrid onItemClick={handleExploreClick} />
            <MembershipBanner />
            <ActionCards onActionClick={handleActionClick} />
          </div>
        </div>

        {/* Mobile / tablet (< xl) */}
        <div className="xl:hidden">
          <MobileHeader
            onMenuClick={() => setSidebarOpen(true)}
            onNotificationClick={() => setNotificationsOpen(true)}
          />

          <div className="space-y-5 pb-20">
            <ExploreGrid onItemClick={handleExploreClick} />
            <MembershipBanner />
          </div>

          {/* Sticky Mobile Bottom Navigation Bar (Help | Visit | Share) */}
          <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 bg-gradient-to-t from-[#FAFBFD] via-[#FAFBFD]/90 to-transparent pointer-events-none">
            <div className="mx-auto max-w-md pointer-events-auto">
              <ActionCards onActionClick={handleActionClick} isSticky />
            </div>
          </div>
        </div>
      </div>

      <SuppliesBottomSheet isOpen={suppliesOpen} onClose={() => setSuppliesOpen(false)} />
      <ServicesBottomSheet isOpen={servicesOpen} onClose={() => setServicesOpen(false)} />
      <EventsBottomSheet isOpen={eventsOpen} onClose={() => setEventsOpen(false)} />
      <SpaceBottomSheet isOpen={spaceOpen} onClose={() => setSpaceOpen(false)} />
      <WoofooBottomSheet isOpen={woofooOpen} onClose={() => setWoofooOpen(false)} />
      <ProgramsBottomSheet isOpen={programsOpen} onClose={() => setProgramsOpen(false)} />
      <HelpSupportBottomSheet isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <VisitBottomSheet isOpen={visitOpen} onClose={() => setVisitOpen(false)} />
      <ShareBottomSheet isOpen={shareOpen} onClose={() => setShareOpen(false)} />
      <NotificationsBottomSheet isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  );
}
