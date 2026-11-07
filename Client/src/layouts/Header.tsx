import {
  Bell,
  User,
  Shuffle,
  ChevronDown,
  Menu,
  FilePlus2,
  Crown,
  CalendarPlus,
  ClipboardList,
  CalendarCheck,
  Home,
  List,
  Plus,
  FileText,
  Printer,
  UserPlus,
  Store,
  ShoppingCart,
  ShieldCheck,
  KeyRound,
  TicketPercent,
  Gift,
  Box,
  Layers,
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

const CreateExpenseIcon = ({
  size = 18,
  className = "",
  strokeWidth = 2,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7" />
    <path d="M14 2v6h6" />
    <path d="M9 13h5" />
    <path d="M9 17h3" />
    <path d="M19 16v6" />
    <path d="M16 19h6" />
  </svg>
);

const FoodClocheIcon = ({
  size = 18,
  className = "",
  strokeWidth = 2,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="4" r="1.5" />
    <path d="M5 18a7 7 0 0 1 14 0" />
    <path d="M3 18h18" />
  </svg>
);

const FoodBillIcon = ({
  size = 18,
  className = "",
  strokeWidth = 2,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-5 2Z" />
    <path d="M9 8h6" />
    <path d="M9 12h6" />
    <path d="M9 16h3" />
  </svg>
);

type ShortcutItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  iconBg: string;
};
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

  useEffect(() => {
    if (shortcutOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [shortcutOpen]);

  const openShortcut = (path: string) => {
    setShortcutOpen(false);
    navigate(path);
  };

  const shortcuts: ShortcutItem[] = [
    can(PERMISSIONS.EXPENSE_CREATE) && {
      label: "Create Expense",
      path: "/expenses?create=1",
      icon: CreateExpenseIcon,
      iconBg: "bg-sky-50 text-sky-500",
    },
    canPath("/create-quotation") && {
      label: "Create Quotation",
      path: "/create-quotation",
      icon: FileText,
      iconBg: "bg-purple-50 text-purple-600",
    },
    canPath("/pos") && {
      label: "POS Drafts",
      path: "/pos?tab=draft",
      icon: Printer,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    can(PERMISSIONS.CUSTOMER_CREATE) && {
      label: "Add Customer",
      path: "/customers?create=1",
      icon: UserPlus,
      iconBg: "bg-amber-50 text-amber-500",
    },
    can(PERMISSIONS.VENDOR_CREATE) && {
      label: "Add Vendor",
      path: "/vendors?create=1",
      icon: Store,
      iconBg: "bg-rose-50 text-rose-500",
    },
    canPath("/create-purchase") && {
      label: "Create Purchase",
      path: "/create-purchase",
      icon: ShoppingCart,
      iconBg: "bg-sky-50 text-sky-500",
    },
    canAny([PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_CREATE]) && {
      label: "Enroll CSP",
      path: "/csp?enroll=1",
      icon: ShieldCheck,
      iconBg: "bg-indigo-50 text-indigo-600",
    },
    can(PERMISSIONS.ACCESS_MANAGE) && {
      label: "Add Access",
      path: "/access",
      icon: KeyRound,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    can(PERMISSIONS.COUPON_MANAGE) && {
      label: "Create Coupon",
      path: "/coupons?create=1",
      icon: TicketPercent,
      iconBg: "bg-purple-50 text-purple-600",
    },
    can(PERMISSIONS.GIFT_CARD_CREATE) && {
      label: "Create Gift Card",
      path: "/giftcard?create=1",
      icon: Gift,
      iconBg: "bg-rose-50 text-rose-500",
    },
    can(PERMISSIONS.FOOD_CREATE) && {
      label: "Add Food",
      path: "/foods?create=1",
      icon: FoodClocheIcon,
      iconBg: "bg-amber-50 text-amber-500",
    },
    canPath("/foodBill") && {
      label: "Food Bill",
      path: "/foodBill",
      icon: FoodBillIcon,
      iconBg: "bg-sky-50 text-sky-500",
    },
    can(PERMISSIONS.PRODUCT_CREATE) && {
      label: "Add Product",
      path: "/products?create=1",
      icon: Box,
      iconBg: "bg-sky-50 text-sky-600",
    },
    can(PERMISSIONS.SERVICE_CREATE) && {
      label: "Add Service",
      path: "/services?create=1",
      icon: Layers,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
  ].filter((item): item is ShortcutItem => Boolean(item));

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
            onClick={() => {
              setBookingMenu(null);
              setShortcutOpen(true);
            }}
            className="hidden h-9 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 text-[#2F6FED] transition hover:bg-blue-100 md:inline-flex md:h-auto md:px-5 md:py-2.5"
            aria-label="Shortcuts"
            title="Shortcuts"
          >
            <Plus size={18} />
            <span className="text-[13px] font-semibold">Shortcut</span>
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
          <div className="hidden h-[45px] items-center rounded-[10px] border border-gray-200 bg-white px-2 md:inline-flex">
            <span className="whitespace-nowrap text-[15px] font-medium text-gray-900">
              Leads
            </span>
            <div className="mx-3 h-8 w-px bg-gray-200" />
            <button
              type="button"
              onClick={() => setIsCreateLeadOpen(true)}
              className="inline-flex h-8 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
              aria-label="Create Lead"
              title="Create Lead"
            >
              <Plus size={24} strokeWidth={1.8} />
            </button>
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
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            aria-label="Close shortcuts"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setShortcutOpen(false)}
          />

          {/* Bottom Sheet Modal */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-heading"
            className="relative z-10 w-full max-h-[88dvh] sm:max-h-[82vh] md:max-w-xl md:mx-auto rounded-t-[28px] md:rounded-b-[28px] md:mb-6 bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out"
          >
            {/* Grab handle */}
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="h-1 w-11 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
              <h2
                id="shortcuts-heading"
                className="text-lg font-bold text-slate-900 tracking-tight"
              >
                Shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setShortcutOpen(false)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 active:text-blue-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Scrollable grid content */}
            <div className="overflow-y-auto px-4 sm:px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] custom-scrollbar">
              {shortcuts.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-slate-500">
                  No shortcuts for this account.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pb-2">
                  {shortcuts.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => openShortcut(item.path)}
                        className="group flex items-center gap-2.5 sm:gap-3 rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-3 text-left transition-all hover:bg-slate-50/80 hover:border-slate-300 hover:shadow-2xs active:scale-[0.98] cursor-pointer"
                      >
                        <div
                          className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${item.iconBg}`}
                        >
                          <Icon size={19} strokeWidth={2} />
                        </div>
                        <span className="truncate text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-slate-900">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
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
