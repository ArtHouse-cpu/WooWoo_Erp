import { Bell, User, Shuffle, ChevronDown, Menu, FilePlus2, Crown, CalendarPlus, UserPlus } from "lucide-react";
import logo from "../assets/images/logo/woo_woo_art_house_logo.png";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import { usePermission } from "@/hooks/usePermission";
import { UserModal } from "./UserModal";
import { CompanySelectorModal } from "./CompanySelectorModal";
import { useAppSelector } from "@/store/hooks";
import CreateSubscriptionScreen from "@/features/sales/pages/CreateSubscriptionScreen";
import CreatePosScreen from "@/features/sales/pages/CreatePosScreen";
import CreateLeadModal from "@/features/network/components/CreateLeadModal";
import StaffVerifyModal from "@/features/sales/components/invoice/Modal/StaffVerifyModal";
import {
  handleCreateLead,
  type LeadPayload,
  type VerifiedStaff,
} from "@/services/apiClient";
type HeaderProps = {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  /** Controlled profile modal state (lets the mobile sidebar open it too). */
  isProfileOpen?: boolean;
  onProfileOpenChange?: (open: boolean) => void;
};

export default function Header({
  onMenuClick,
  showMenuButton = false,
  isProfileOpen,
  onProfileOpenChange,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPosOpen, setIsPosOpen] = useState(false);
  const { canPath } = usePermission();
  const [localProfileOpen, setLocalProfileOpen] = useState(false);
  const isUserModalOpen = isProfileOpen ?? localProfileOpen;
  const setIsUserModalOpen = onProfileOpenChange ?? setLocalProfileOpen;
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const { companyName, m_staff_branch, companies, activeCompanyId } =
    useAppSelector((state) => state.user);

  const [openCreateSubscriptionModal, setOpenCreateSubscriptionModal] =
    useState(false);

  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isLeadPinOpen, setIsLeadPinOpen] = useState(false);
  const [pendingLeadPayload, setPendingLeadPayload] = useState<LeadPayload | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const handleOpenAddBooking = () => {
    if (location.pathname.toLowerCase().includes("spacebooking")) {
      window.dispatchEvent(new CustomEvent("open-add-space-booking"));
    } else {
      navigate("/spaceBooking?create=true");
    }
  };

  const handleLeadSubmit = (payload: LeadPayload) => {
    setPendingLeadPayload(payload);
    setIsLeadPinOpen(true);
  };

  const handleLeadPinVerified = async ({ staff }: { staff: VerifiedStaff }) => {
    if (!pendingLeadPayload) return;
    try {
      setIsSubmittingLead(true);
      const payloadWithStaff: LeadPayload = {
        ...pendingLeadPayload,
        createdBy: {
          m_staff_id: staff.staffId || staff.m_staff_id || staff._id,
          m_staff_name: staff.staffName || staff.name,
          m_staff_email: staff.email || "",
        },
      };

      await handleCreateLead(payloadWithStaff);

      setIsLeadPinOpen(false);
      setIsCreateLeadOpen(false);
      setPendingLeadPayload(null);

      Swal.fire({
        icon: "success",
        title: "Lead Created",
        text: "New lead has been created successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      window.dispatchEvent(new CustomEvent("lead-created"));
    } catch (error: any) {
      console.error("Failed to create lead:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.message ||
          (Array.isArray(error?.response?.data?.errors)
            ? error.response.data.errors.join(", ")
            : "Failed to create lead."),
      });
    } finally {
      setIsSubmittingLead(false);
    }
  };

                                                                                                                                                                                              

  const hasQuickBillAccess = canPath("/create-invoice") || canPath("/create-pos") || canPath("/pos");

  const activeCompany = (companies || []).find((c) => c.id === activeCompanyId);
  const activeLogo = activeCompany?.logo || logo;

  const handleOpenUser = () => {
    setIsUserModalOpen(true);
  };

  return (
    <>
    <header className="flex w-full max-w-[100vw] items-center justify-end gap-2 border-b border-gray-200 bg-white px-2.5 py-2 sm:gap-3 sm:px-4 sm:py-2.5 md:justify-between md:px-6">
      <div className="hidden min-w-0 flex-1 items-center gap-1.5 sm:gap-3 md:flex md:gap-4">
        {showMenuButton ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition hover:bg-gray-50 sm:h-10 sm:w-10 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        ) : null}

        <img
          src={activeLogo}
          alt="logo"
          className="h-8 w-8 shrink-0 rounded-full border border-gray-100 object-cover shadow-sm sm:h-10 sm:w-10"
        />

        <div
          className="group flex min-w-0 cursor-pointer flex-col leading-tight"
          onClick={() => setIsCompanyModalOpen(true)}
        >
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <h1 className="truncate font-bold text-[13px] text-gray-900 transition-colors group-hover:text-blue-600 sm:text-sm md:text-[15px]">
              {companyName || "WOO WOO Art House"}
            </h1>
            <ChevronDown
              size={14}
              className="shrink-0 text-gray-400 transition-colors group-hover:text-blue-500"
            />
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-gray-500 sm:gap-1.5 sm:text-xs">
            <Shuffle size={12} className="hidden shrink-0 text-gray-400 sm:block" />
            <span className="truncate font-medium tracking-tight uppercase">
              Change Company
            </span>
            {m_staff_branch ? (
              <span className="ml-1 hidden shrink-0 font-normal text-gray-400 md:inline">
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
      

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-5">
        {hasQuickBillAccess && (
          <button
            type="button"
            onClick={() => setIsPosOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 p-2 text-xs font-semibold text-[#2F6FED] transition hover:bg-blue-100 sm:px-3 sm:py-1.5 md:px-4 md:py-2 md:text-sm"
            aria-label="POS Bill"
            title="POS Bill"
          >
            <FilePlus2 size={16} />
            <span className="hidden md:inline">POS BILL</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsCreateLeadOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 p-2 text-xs font-semibold text-[#2F6FED] transition hover:bg-blue-100 sm:px-3 sm:py-1.5 md:px-4 md:py-2 md:text-sm"
          aria-label="Create Lead"
          title="Create Lead"
        >
          <UserPlus size={16} />
          <span className="hidden md:inline">Create Lead</span>
        </button>
        <button
          type="button"
          onClick={handleOpenAddBooking}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 p-2 text-xs font-semibold text-[#2F6FED] transition hover:bg-blue-100 sm:px-3 sm:py-1.5 md:px-4 md:py-2 md:text-sm"
          aria-label="+ Add Booking"
          title="+ Add Booking"
        >
          <CalendarPlus size={16} />
          <span className="hidden md:inline">+ Add Booking</span>
        </button>
        <button
          type="button"
          onClick={() => setOpenCreateSubscriptionModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 p-2 text-xs font-semibold text-[#2F6FED] transition hover:bg-blue-100 sm:px-3 sm:py-1.5 md:px-4 md:py-2 md:text-sm"
          aria-label="Membership"
          title="Activate Membership"
        >
          <Crown size={16} />
          <span className="hidden lg:inline">Activate Membership</span>
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
            className="hidden cursor-pointer text-gray-700 transition hover:text-black md:block"
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

        {/* Render Create Lead Modal and Staff PIN Verification */}
        <CreateLeadModal
          isOpen={isCreateLeadOpen}
          onClose={() => {
            setIsCreateLeadOpen(false);
            setPendingLeadPayload(null);
          }}
          onSubmit={handleLeadSubmit}
          isSubmitting={isSubmittingLead}
        />
        <StaffVerifyModal
          open={isLeadPinOpen}
          onClose={() => setIsLeadPinOpen(false)}
          onVerified={handleLeadPinVerified}
        />
      

      </div>
    </header>

    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden"
    >
      <div className="flex h-14 items-stretch justify-between px-6">
        {showMenuButton ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex min-w-16 flex-col items-center justify-center gap-0.5 text-gray-700 transition active:scale-95"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
            <span className="text-[11px] font-medium">Menu</span>
          </button>
        ) : null}
      </div>
    </nav>
    </>
  );
}
