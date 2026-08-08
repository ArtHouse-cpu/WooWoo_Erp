import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "./Header";
import LeftSideBar from "./LeftSideBar";

export default function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      // Desktop sidebar from lg (1024px); keep drawer on phone + tablet
      if (window.innerWidth >= 1024) setMobileNavOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-dvh w-full max-w-[100vw] flex-col overflow-hidden bg-[#F7F8FA]">
      <div className="safe-top fixed inset-x-0 top-0 z-50 bg-white shadow-sm">
        <Header
          onMenuClick={() => setMobileNavOpen(true)}
          showMenuButton
        />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        {/* Desktop sidebar — large screens only */}
        <aside className="hidden h-full shrink-0 lg:block">
          <LeftSideBar />
        </aside>

        {/* Phone + tablet drawer */}
        <div
          className={`fixed inset-0 z-[60] lg:hidden ${
            mobileNavOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <button
            type="button"
            aria-label="Close navigation"
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              mobileNavOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            className={`absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] max-w-full transform flex-col bg-white shadow-xl transition-transform duration-300 safe-top ${
              mobileNavOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <LeftSideBar
              mobile
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </div>

        <main className="safe-pb min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-6 pt-3 sm:px-4 md:px-5 lg:pt-4">
          <div className="mx-auto w-full max-w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
