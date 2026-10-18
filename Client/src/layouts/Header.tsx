import {
  Bell,
  User,
  Shuffle,
  ChevronDown,
  Menu,
  FilePlus2,
  Crown,
  CalendarPlus,
  UserPlus,
  ClipboardList,
  CalendarCheck,
  Home,
  List,
  Plus,
} from "lucide-react";
import logo from "../assets/images/logo/woo_woo_art_house_logo.png";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
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
  const { canPath, can, canAny } = usePermission();
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
  const [pendingLeadPayload, setPendingLeadPayload] =
    useState<LeadPayload | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const [bookingMenu, setBookingMenu] = useState<null | "header" | "mobile">(
    null,
  );
  const [shortcutOpen, setShortcutOpen] = useState(false);

  const openBookingChoice = (kind: "full" | "space") => {
    setBookingMenu(null);
    const path = location.pathname.toLowerCase();
    if (kind === "full") {
      if (path.includes("allbookings")) {
        window.dispatchEvent(new CustomEvent("open-add-full-booking"));
      } else {
        navigate("/allBookings?create=true");
      }
      return;
    }
    if (path.includes("spacebooking")) {
      window.dispatchEvent(new CustomEvent("open-add-space-booking"));
    } else {
      navigate("/spaceBooking?create=true");
    }
  };

  useEffect(() => {
    if (!bookingMenu && !shortcutOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setBookingMenu(null);
        setShortcutOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bookingMenu, shortcutOpen]);

  const openShortcut = (path: string) => {
    setShortcutOpen(false);
    navigate(path);
  };

  const shortcuts = [
    can(PERMISSIONS.EXPENSE_CREATE) && {
      label: "Create Expense",
      path: "/expenses?create=1",
    },
    canPath("/create-quotation") && {
      label: "Create Quotation",
      path: "/create-quotation",
    },
    canPath("/pos") && {
      label: "POS Drafts",
      path: "/pos?tab=draft",
    },
    can(PERMISSIONS.CUSTOMER_CREATE) && {
      label: "Add Customer",
      path: "/customers?create=1",
    },
    can(PERMISSIONS.VENDOR_CREATE) && {
      label: "Add Vendor",
      path: "/vendors?create=1",
    },
    canPath("/create-purchase") && {
      label: "Create Purchase",
      path: "/create-purchase",
    },
    canAny([PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_CREATE]) && {
      label: "Enroll CSP",
      path: "/csp?enroll=1",
    },
    can(PERMISSIONS.ACCESS_MANAGE) && {
      label: "Add Access",
      path: "/access",
    },
  ].filter((item): item is { label: string; path: string } => Boolean(item));

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

  const hasQuickBillAccess =
    canPath("/create-invoice") || canPath("/create-pos") || canPath("/pos");

  const activeCompany = (companies || []).find((c) => c.id === activeCompanyId);
  const activeLogo = activeCompany?.logo || logo;

  const handleOpenUser = () => {
    setIsUserModalOpen(true);
  };

  return (
    <>
      <header className="flex w-full max-w-[100vw] items-center justify-between gap-2 border-b border-gray-200 bg-white px-2.5 py-2 sm:gap-3 sm:px-4 sm:py-2.5 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3 md:gap-4">
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
            className="hidden h-10 w-10 shrink-0 rounded-full border border-gray-100 object-cover shadow-sm md:block"
          />

          <div
            className="group hidden min-w-0 cursor-pointer flex-col leading-tight md:flex"
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
              <Shuffle
                size={12}
                className="hidden shrink-0 text-gray-400 sm:block"
              />
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
          <button
            type="button"
            onClick={() => navigate("/")}
            className="hidden h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2F6FED] transition hover:bg-blue-100 md:inline-flex md:h-auto md:w-auto md:gap-2 md:px-5 md:py-2.5"
            aria-label="Home"
            title="Home"
          >
            <Home size={18} />
            <span className="hidden text-[13px] font-semibold md:inline">
              Home
            </span>
          </button>
          <div className="flex items-center gap-2 md:hidden">
            {/* Combined Leads Container */}
            <div className="inline-flex h-[45px] items-center rounded-[10px] border border-gray-200 bg-white px-2">
              {/* Leads Label */}
              <span className="whitespace-nowrap text-[15px] font-medium text-gray-900">
                Leads
              </span>
              {/* Vertical Divider */}
              <div className="mx-3 h-8 w-px bg-gray-200" />

              {/* Create Lead */}
              <button
                type="button"
                onClick={() => setIsCreateLeadOpen(true)}
                className="inline-flex h-8 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                aria-label="Create Lead"
                title="Create Lead"
              >
                <Plus size={24} strokeWidth={1.8} />
              </button>

              {/* Lead List */}
              <button
                type="button"
                onClick={() => navigate("/leads")}
                className="ml-2 inline-flex h-8 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                aria-label="Lead List"
                title="Lead List"
              >
                <List size={24} strokeWidth={1.8} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setBookingMenu(null);
                setShortcutOpen(true);
              }}
              className="inline-flex h-[45px] items-center rounded-[10px] border border-gray-200 bg-white px-3 text-[15px] font-medium text-gray-900 transition hover:bg-gray-50"
            >
              +Shortcut
            </button>
          </div>
          {hasQuickBillAccess && (
            <button
              type="button"
              onClick={() => setIsPosOpen(true)}
              className="hidden items-center gap-2 rounded-xl bg-blue-50 p-2.5 text-xs font-semibold text-[#2F6FED] transition hover:bg-blue-100 sm:px-3.5 sm:py-2 md:inline-flex md:px-5 md:py-2.5 md:text-[13px]"
              aria-label="POS Bill"
              title="POS Bill"
            >
              <FilePlus2 size={19} />
              <span className="hidden md:inline">POS BILL</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCreateLeadOpen(true)}
            className="hidden items-center gap-2 rounded-xl bg-blue-50 p-2.5 text-xs font-semibold text-[#2F6FED] transition hover:bg-blue-100 sm:px-3.5 sm:py-2 md:inline-flex md:px-5 md:py-2.5 md:text-[13px]"
            aria-label="Create Lead"
            title="Create Lead"
          >
            <UserPlus size={19} />
            <span className="hidden md:inline">Create Lead</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setBookingMenu((current) =>
                current === "header" ? null : "header",
              )
            }
            className="hidden items-center gap-2 rounded-xl bg-blue-50 p-2.5 text-xs font-semibold text-[#2F6FED] transition hover:bg-blue-100 sm:px-3.5 sm:py-2 md:inline-flex md:px-5 md:py-2.5 md:text-[13px]"
            aria-label="+ Add Booking"
            title="+ Add Booking"
          >
            <CalendarPlus size={19} />
            <span className="hidden md:inline">+ Add Booking</span>
          </button>
          <button
            type="button"
            onClick={() => setOpenCreateSubscriptionModal(true)}
            className="hidden items-center gap-2 rounded-xl bg-blue-50 p-2.5 text-xs font-semibold text-[#2F6FED] transition hover:bg-blue-100 sm:px-3.5 sm:py-2 md:inline-flex md:px-5 md:py-2.5 md:text-[13px]"
            aria-label="Membership"
            title="Activate Membership"
          >
            <Crown size={19} />
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
        aria-label="Quick actions"
        className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-gray-200 bg-white px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] md:hidden"
      >
        {[
          {
            label: "Home",
            Icon: Home,
            onClick: () => navigate("/"),
            tone: "from-slate-600 to-slate-800 shadow-slate-500/30",
          },
          hasQuickBillAccess && {
            label: "POS Bill",
            Icon: FilePlus2,
            onClick: () => setIsPosOpen(true),
            tone: "from-blue-500 to-indigo-600 shadow-blue-500/30",
          },
          {
            label: "Add Booking",
            Icon: CalendarPlus,
            onClick: () =>
              setBookingMenu((current) =>
                current === "mobile" ? null : "mobile",
              ),
            tone: "from-violet-500 to-fuchsia-600 shadow-violet-500/30",
          },
          {
            label: "Membership",
            Icon: Crown,
            onClick: () => setOpenCreateSubscriptionModal(true),
            tone: "from-amber-400 to-orange-500 shadow-amber-500/30",
          },
        ]
          .filter((item): item is Exclude<typeof item, false> => Boolean(item))
          .map(({ label, Icon, onClick, tone }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-linear-to-br px-1 text-[10px] font-semibold text-white shadow-md transition active:scale-95 active:brightness-95 ${tone}`}
            >
              <Icon size={18} />
              <span className="max-w-full truncate">{label}</span>
            </button>
          ))}
      </nav>
      {shortcutOpen ? (
      <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/30 p-3 pt-16 sm:items-center sm:pt-3">
        <button
          type="button"
          aria-label="Close shortcuts"
          className="absolute inset-0 cursor-default"
          onClick={() => setShortcutOpen(false)}
        />
        <div className="relative w-full max-w-xs rounded-2xl bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-bold text-slate-900">Shortcuts</p>
            <button
              type="button"
              onClick={() => setShortcutOpen(false)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500"
            >
              Close
            </button>
          </div>
          <div className="grid gap-1.5">
            {shortcuts.length === 0 ? (
              <p className="px-2 py-3 text-sm text-slate-500">No shortcuts for this account.</p>
            ) : (
              shortcuts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => openShortcut(item.path)}
                  className="rounded-xl bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  {item.label}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    ) : null}
    {bookingMenu ? (
        <>
          <button
            type="button"
            aria-label="Close booking options"
            className="fixed inset-0 z-[70] cursor-default bg-black/20"
            onClick={() => setBookingMenu(null)}
          />
          <div
            role="menu"
            aria-label="Add booking"
            className={`fixed z-[80] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${
              bookingMenu === "mobile"
                ? "inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
                : "right-4 top-[calc(3.6rem+env(safe-area-inset-top))] w-72"
            }`}
          >
            <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Add booking
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={() => openBookingChoice("full")}
              className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-violet-50"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <ClipboardList size={18} />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-900">
                  Full Booking
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Space, services, and food
                </span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openBookingChoice("space")}
              className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-indigo-50"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <CalendarCheck size={18} />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-900">
                  Space Booking
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Space and services
                </span>
              </span>
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
