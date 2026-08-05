import { Bell, User, Shuffle, ChevronDown, Menu, FilePlus2, Crown } from "lucide-react";
import logo from "../assets/images/logo/woo_woo_art_house_logo.png";
import { useState } from "react";

import { usePermission } from "@/hooks/usePermission";
import { UserModal } from "./UserModal";
import { CompanySelectorModal } from "./CompanySelectorModal";
import { useAppSelector } from "@/store/hooks";
import CreateSubscriptionScreen from "@/features/sales/pages/CreateSubscriptionScreen";
import CreatePosScreen from "@/features/sales/pages/CreatePosScreen";
type HeaderProps = {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
};

export default function Header({
  onMenuClick,
  showMenuButton = false,
}: HeaderProps) {

    const [isPosOpen, setIsPosOpen] = useState(false);
  const { canPath } = usePermission();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const { companyName, m_staff_branch, companies, activeCompanyId } =
    useAppSelector((state) => state.user);

     const [openCreateSubscriptionModal, setOpenCreateSubscriptionModal] =
       useState(false);

                                                                                                                                                                                              

  const hasQuickBillAccess = canPath("/create-invoice") || canPath("/create-pos") || canPath("/pos");

  const activeCompany = (companies || []).find((c) => c.id === activeCompanyId);
  const activeLogo = activeCompany?.logo || logo;

  const handleOpenUser = () => {
    setIsUserModalOpen(true);
  };

  return (
    <header className="flex w-full items-center justify-between border-b border-gray-200 bg-white px-3 py-2.5 sm:px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3 md:gap-4">
        {showMenuButton ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition hover:bg-gray-50 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        ) : null}

        <img
          src={activeLogo}
          alt="logo"
          className="h-9 w-9 shrink-0 rounded-full border border-gray-100 object-cover shadow-sm sm:h-10 sm:w-10"
        />

        <div
          className="group flex min-w-0 cursor-pointer flex-col leading-tight"
          onClick={() => setIsCompanyModalOpen(true)}
        >
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <h1 className="truncate font-bold text-sm text-gray-900 transition-colors group-hover:text-blue-600 md:text-[15px]">
              {companyName || "WOO WOO Art House"}
            </h1>
            <ChevronDown
              size={14}
              className="shrink-0 text-gray-400 transition-colors group-hover:text-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Shuffle size={12} className="hidden text-gray-400 sm:block" />
            <span className="truncate text-[11px] font-medium tracking-tight uppercase sm:text-[12px]">
              Change Company
            </span>
            {m_staff_branch ? (
              <span className="ml-1 hidden font-normal text-gray-400 sm:inline">
                ({m_staff_branch})
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {/* 
      <div className="hidden lg:flex items-center w-1/2">
        <div className="flex items-center w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-600">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search for products, brands and more"
            className="w-full bg-transparent outline-none px-2 text-sm"
          />
          <span className="text-xs text-gray-500 whitespace-nowrap">
            ctrl + k
          </span>
        </div>
      </div> */}

      <div className="flex items-center gap-4 md:gap-5">
               {hasQuickBillAccess && (
          <button
            type="button"
            onClick={() => setIsPosOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 p-2 text-[#2F6FED] transition hover:bg-blue-100 sm:px-3 sm:py-1.5 text-xs font-semibold md:px-4 md:py-2 md:text-sm"
            aria-label="POS Bill"
            title="POS Bill"
          >
            <FilePlus2 size={16} />
            <span className="hidden sm:inline">POS BILL</span>
          </button>
        )}
        <button
            type="button"
            onClick={() => setOpenCreateSubscriptionModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 p-2 text-[#2F6FED] transition hover:bg-blue-100 sm:px-3 sm:py-1.5 text-xs font-semibold md:px-4 md:py-2 md:text-sm"
            aria-label="Membership"
            title="Membership"
          >
            <Crown size={16} />
            
            <span className="hidden sm:inline"> Activate Membership</span>
          </button>

          {openCreateSubscriptionModal ? (
                  <CreateSubscriptionScreen
                    initialMode="create"
                    onClose={() => setOpenCreateSubscriptionModal(false)}
                    onSave={() => setOpenCreateSubscriptionModal(false)}
                  />
                ) : null}
        {[Bell, User].map((Icon, i) => (
          <Icon
            key={i}
            size={20}
            className="text-gray-700 hover:text-black cursor-pointer transition"
            onClick={Icon === User ? handleOpenUser : undefined}
          />
        ))}
        <UserModal
          open={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
        />
        <CompanySelectorModal
          open={isCompanyModalOpen}
          onClose={() => setIsCompanyModalOpen(false)}
        />
          {/* Render POS Billing Modal conditionally */}
        <CreatePosScreen
          open={isPosOpen}
          onClose={() => setIsPosOpen(false)}
        />
      

      </div>
    </header>
  );
}
