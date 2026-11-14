import { useEffect, useMemo, useState } from "react";
import {
  Gift,
  Sparkles,
  ChevronDown,
  ShoppingCart,
  Wallet,
  LayoutDashboard,
  Banknote,
  BookOpenText,
  Network,
  FileSpreadsheet,
  LogOut,
  UserRound,
  Receipt,
  FileText,
  Percent,
  Users,
  Package,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ShieldUser,
  MapPin,
  UtensilsCrossed,
  BadgeIndianRupee,
  CircleDollarSign,
  CalendarCheck,
  ClipboardList,
  type LucideIcon,
  Megaphone,
  ChartNoAxesCombined,
  TimerIcon,
  GitGraphIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import { handleLogout } from "@/services/apiClient";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout as logoutUser } from "@/store/slices/userSlice";
import { usePermission } from "@/hooks/usePermission";
import AppearanceButtons from "@/components/AppearanceButtons";

type SubMenuItem = {
  name: string;
  label: string;
  icon: LucideIcon;
  path: string;
};

type SubCategory = {
  name: string;
  label: string;
  icon: LucideIcon;
  items: SubMenuItem[];
};

type MenuGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  submenu?: SubMenuItem[];
  categories?: SubCategory[];
};

type TopLink = {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
};

const MENU_GROUPS: MenuGroup[] = [
  {
    key: "bookingAndOrders",
    label: "Booking",
    icon: BookOpenText,
    submenu: [
      {
        name: "bookingOverView",
        label: "Bookings Overview",
        icon: ClipboardList,
        path: "/bookingOverView",
      },
      {
        name: "spaceBooking",
        label: "Space Booking",
        icon: CalendarCheck,
        path: "/spaceBooking",
      },
      {
        name: "allBookings",
        label: "Full Bookings",
        icon: ChartNoAxesCombined,
        path: "/allBookings",
      },
    ],
  },
  {
    key: "bills",
    label: "Bills",
    icon: Banknote,
    categories: [
      {
        name: "sales",
        label: "Sales",
        icon: Receipt,
        items: [
          { name: "pos", label: "Invoice", icon: Receipt, path: "/pos" },
          {
            name: "creditnotes",
            label: "Credit Notes",
            icon: FileText,
            path: "/creditnotes",
          },
          {
            name: "subscriptions",
            label: "Subscription",
            icon: DollarSign,
            path: "/subscriptions",
          },
          {
            name: "quotations",
            label: "Quotations",
            icon: Percent,
            path: "/quotations",
          },
        ],
      },
      {
        name: "purchases",
        label: "Purchases",
        icon: ShoppingCart,
        items: [
          {
            name: "purchase",
            label: "Purchase",
            icon: Package,
            path: "/purchase",
          },
          {
            name: "purchaseOrder",
            label: "Purchase Order",
            icon: FileText,
            path: "/purchase-orders",
          },
          {
            name: "debitNotes",
            label: "Debit Notes",
            icon: FileText,
            path: "/debit-notes",
          },
        ],
      },
    ],
  },
  {
    key: "Timeline",
    label: "Timeline",
    icon: Package,
    submenu: [
      {
        name: "Activity Timeline",
        label: "Activity Timeline",
        icon: TimerIcon,
        path: "/activity-timeline",
      },
      {
        name: "Inventory",
        label: "Inventory",
        icon: Package,
        path: "/inventory",
      },
      {
        name: "Inventory Timeline",
        label: "Timeline",
        icon: FileSpreadsheet,
        path: "/inventory-timeline",
      },
      {
        name: "Payments Timeline",
        label: "Payments",
        icon: FileSpreadsheet,
        path: "/inventory-payments",
      },
      {
        name: "Insights & Analytics",
        label: "Insights & Analytics",
        icon: GitGraphIcon,
        path: "/insights-analytics",
      },
    ],
  },
  {
    key: "catalogue",
    label: "Catalogue",
    icon: BookOpenText,
    submenu: [
      {
        name: "products",
        label: "Products",
        icon: Package,
        path: "/products",
      },
      { name: "spaces", label: "Spaces", icon: MapPin, path: "/spaces" },
      {
        name: "Foods",
        label: "Foods",
        icon: UtensilsCrossed,
        path: "/foods",
      },
      {
        name: "services",
        label: "Services",
        icon: FileText,
        path: "/services",
      },
      {
        name: "Manage Plans",
        label: "Manage Plans",
        icon: Package,
        path: "/manage-plans",
      },
    ],
  },
  {
    key: "network",
    label: "Network",
    icon: Network,
    submenu: [
      { name: "vendor", label: "Vendors", icon: Users, path: "/vendors" },

      { name: "lead", label: "Leads", icon: Users, path: "/leads" },

      {
        name: "customers",
        label: "Customers",
        icon: Users,
        path: "/customers",
      },
    ],
  },
  {
    key: "affiliateProgram",
    label: "Program",
    icon: Network,
    submenu: [
      {
        name: "affiliate",
        label: "HAP",
        icon: Users,
        path: "/affiliate-program",
      },
          {
        name: "csp",
        label: "CSP",
        icon: Users,
        path: "/csp",
      },
      // {
      //   name: "hap",
      //   label: "HAP",
      //   icon: Users,
      //   path: "/hap",
      // },
      {
        name: "cvp",
        label: "CVP",
        icon: Users,
        path: "/cvp",
      },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: Network,
    submenu: [
      {
        name: "Coupons",
        label: "Coupons",
        icon: Percent,
        path: "/coupons",
      },
      {
        name: "offersAndDiscounts",
        label: "Offers and discounts",
        icon: Gift,
        path: "/offers-and-discounts",
      },
      {
        name: "giftcard",
        label: "Gift Card",
        icon: Gift,
        path: "/giftcard",
      },
      {
        name: "Announcements",
        label: "Megaphone",
        icon: Megaphone,
        path: "/announcements",
      },
    ],
  },
  {
    key: "Company",
    label: "Company",
    icon: Network,
    submenu: [
      {
        name: "Access Control",
        label: "Access Control",
        icon: ShieldUser,
        path: "/access",
      },
      { name: "wallet", label: "Wallet", icon: Wallet, path: "/wallet" },
      {
        name: "staffCommission",
        label: "Staff Commission",
        icon: CircleDollarSign,
        path: "/staffCommission",
      },
      {
        name: "expenses",
        label: "Expense",
        icon: BadgeIndianRupee,
        path: "/expenses",
      },

      {
        name: "Announcements",
        label: "Megaphone",
        icon: Megaphone,
        path: "/announcements",
      },
    ],
  },
];

const TOP_LINKS: TopLink[] = [
  // { key: "foodBill", label: "Food Billing", icon: Utensils, path: "/foodBill" },
  // { key: "expenses", label: "Expense", icon: BadgeIndianRupee, path: "/expenses" },
  // { key: "staffCommission", label: "Staff Commission", icon: CircleDollarSign , path: "/staffCommission" },
  // { key: "spaceBooking", label: "Space Booking", icon: CalendarCheck  , path: "/spaceBooking" },
  // { key: "announcement", label: "Announcements", icon: Megaphone , path: "/announcements" },
  // { key: "wallet", label: "Wallet", icon: Wallet, path: "/wallet" },
  // { key: "giftcard", label: "Gift Card", icon: Gift , path: "/giftcard" },
  // { key: "coupons", label: "Coupons", icon: Percent, path: "/coupons" },
  {
    key: "exhibition",
    label: "Exhibition",
    icon: Sparkles,
    path: "/exhibitiontable",
  },
  // { key: "access", label: "Access", icon: ShieldUser, path: "/access" },
];

/**
 * Step 8 — Sidebar filtered by MENU_PERMISSION_MAP via canPath().
 * Hiding a link is UX only; PermissionRoute + APIs still enforce access.
 */
type LeftSideBarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
  onOpenProfile?: () => void;
};

export default function LeftSideBar({
  mobile = false,
  onNavigate,
  onOpenProfile,
}: LeftSideBarProps) {
  const staffName = useAppSelector((state) => state.user.m_staff_name);
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState("");
  const [activeMenu, setActiveMenu] = useState("home");
  const [activeSubmenu, setActiveSubmenu] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const logout = useAuthStore((s) => s.logout);
  const { canPath } = usePermission();
  const isCollapsed = mobile ? false : collapsed;

  const location = useLocation();
  const currentPath = location.pathname;

  const [openSubCategories, setOpenSubCategories] = useState<
    Record<string, boolean>
  >({
    sales: true,
    purchases: false,
  });

  const handleToggleSubCategory = (categoryName: string) => {
    setOpenSubCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  useEffect(() => {
    const isSalesRoute = [
      "/pos",
      "/creditnotes",
      "/subscriptions",
      "/quotations",
    ].includes(currentPath);
    const isPurchaseRoute = [
      "/purchase",
      "/purchase-orders",
      "/debit-notes",
    ].includes(currentPath);

    if (isSalesRoute || isPurchaseRoute) {
      setActiveMenu("bills");
      setOpenMenu("bills");
      if (isSalesRoute) {
        setOpenSubCategories((prev) => ({ ...prev, sales: true }));
      }
      if (isPurchaseRoute) {
        setOpenSubCategories((prev) => ({ ...prev, purchases: true }));
      }
    }
  }, [currentPath]);

  const visibleGroups = useMemo(
    () =>
      MENU_GROUPS.map((group) => {
        if (group.categories) {
          const filteredCategories = group.categories
            .map((cat) => ({
              ...cat,
              items: cat.items.filter((item) => canPath(item.path)),
            }))
            .filter((cat) => cat.items.length > 0);
          return {
            ...group,
            categories: filteredCategories,
          };
        }
        return {
          ...group,
          submenu: (group.submenu || []).filter((sub) => canPath(sub.path)),
        };
      }).filter(
        (group) =>
          (group.categories && group.categories.length > 0) ||
          (group.submenu && group.submenu.length > 0),
      ),
    [canPath],
  );

  const visibleTopLinks = useMemo(
    () => TOP_LINKS.filter((link) => canPath(link.path)),
    [canPath],
  );

  const showHome = canPath("/");

  const handleToggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? "" : menu);
  };

  const handleMenuClick = (menu: string, path: string | null = null) => {
    setActiveMenu(menu);
    setActiveSubmenu("");
    if (path) {
      navigate(path);
      onNavigate?.();
    }
  };

  const handleSubmenuClick = (menu: string, submenu: string, path: string) => {
    setActiveMenu(menu);
    setActiveSubmenu(submenu);
    navigate(path);
    onNavigate?.();
  };

  const onLogout = async () => {
    try {
      await handleLogout();
    } catch (error) {
      console.log("Logout API failed:", error);
    } finally {
      logout();
      dispatch(logoutUser());
      navigate("/login", { replace: true });
      Swal.fire({
        icon: "success",
        title: "Logged out",
        text: "You have been logged out successfully.",
        timer: 1000,
        showConfirmButton: false,
      });
    }
  };

  return (
    <div
      className={`flex h-full max-h-dvh flex-col border-r border-gray-100 bg-white/95 shadow-sm backdrop-blur transition-all duration-300 ${
        mobile ? "w-full" : isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div
        className={`flex items-center justify-between border-b border-gray-100 px-3 py-3 ${
          mobile ? "" : ""
        }`}
      >
        {!isCollapsed && (
          <span className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
            Navigation
          </span>
        )}
        {!mobile ? (
          <button
            className={`rounded-lg p-2 text-gray-600 transition-all hover:bg-gray-100 hover:text-black ${
              isCollapsed ? "mx-auto" : ""
            }`}
            onClick={() => setCollapsed(!collapsed)}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        ) : (
          <span className="text-xs font-medium text-gray-400">Menu</span>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 text-gray-700">
        {showHome ? (
          <button
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
              activeMenu === "home"
                ? "border-l-4 border-blue-500 bg-gray-100 text-black shadow-sm"
                : "text-gray-700 hover:bg-gray-50 hover:text-black"
            }`}
            onClick={() => handleMenuClick("home", "/")}
          >
            <LayoutDashboard size={20} className="text-gray-500" />
            {!isCollapsed && (
              <span className="text-[15px] font-semibold">Home</span>
            )}
          </button>
        ) : null}

        {visibleGroups.map((menu) => {
          const Icon = menu.icon;

          return (
            <div key={menu.key} className="mt-2">
              <button
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                  activeMenu === menu.key
                    ? "border-l-4 border-blue-500 bg-gray-100 text-black shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-black"
                }`}
                onClick={() => {
                  handleMenuClick(menu.key);
                  handleToggleMenu(menu.key);
                }}
              >
                <Icon size={20} className="text-gray-500" />

                {!isCollapsed && (
                  <span className="text-[15px] font-semibold">
                    {menu.label}
                  </span>
                )}

                {!isCollapsed && (
                  <ChevronDown
                    size={18}
                    className={`ml-auto transition-all duration-300 ${
                      openMenu === menu.key
                        ? "rotate-180 text-gray-700"
                        : "text-gray-400"
                    }`}
                  />
                )}
              </button>

              {openMenu === menu.key && !isCollapsed && (
                <div className="mt-2 ml-7 space-y-1.5">
                  {menu.categories ? (
                    <div className="space-y-2">
                      {menu.categories.map((cat) => {
                        const CatIcon = cat.icon;
                        const isCatOpen = Boolean(openSubCategories[cat.name]);
                        const hasActiveChild = cat.items.some(
                          (item) =>
                            activeSubmenu === item.name ||
                            currentPath === item.path,
                        );

                        return (
                          <div key={cat.name} className="space-y-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSubCategory(cat.name);
                              }}
                              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
                                hasActiveChild
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-gray-600 hover:bg-gray-100 hover:text-black"
                              }`}
                            >
                              <CatIcon
                                size={15}
                                className={
                                  hasActiveChild
                                    ? "text-blue-600"
                                    : "text-gray-400"
                                }
                              />
                              <span>{cat.label}</span>
                              <ChevronDown
                                size={14}
                                className={`ml-auto transition-transform duration-200 ${
                                  isCatOpen
                                    ? "rotate-180 text-gray-700"
                                    : "text-gray-400"
                                }`}
                              />
                            </button>

                            {isCatOpen && (
                              <div className="ml-2.5 space-y-1 border-l-2 border-gray-100 pl-2">
                                {cat.items.map((sub) => {
                                  const SubIcon = sub.icon;
                                  const isActive =
                                    activeSubmenu === sub.name ||
                                    currentPath === sub.path;

                                  return (
                                    <div
                                      key={sub.name}
                                      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-all ${
                                        isActive
                                          ? "bg-gray-100 font-medium text-black"
                                          : "text-gray-600 hover:bg-gray-50 hover:text-black"
                                      }`}
                                      onClick={() =>
                                        handleSubmenuClick(
                                          menu.key,
                                          sub.name,
                                          sub.path,
                                        )
                                      }
                                    >
                                      <SubIcon
                                        size={16}
                                        className={
                                          isActive
                                            ? "text-blue-600"
                                            : "text-gray-400"
                                        }
                                      />
                                      <span className="text-[14px]">
                                        {sub.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    (menu.submenu || []).map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive =
                        activeSubmenu === sub.name || currentPath === sub.path;

                      return (
                        <div
                          key={sub.name}
                          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-all ${
                            isActive
                              ? "bg-gray-100 font-medium text-black"
                              : "text-gray-600 hover:bg-gray-50 hover:text-black"
                          }`}
                          onClick={() =>
                            handleSubmenuClick(menu.key, sub.name, sub.path)
                          }
                        >
                          <SubIcon
                            size={16}
                            className={
                              isActive ? "text-blue-600" : "text-gray-400"
                            }
                          />
                          <span className="text-[14px]">{sub.label}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {visibleTopLinks.map((link) => {
          const Icon = link.icon;
          return (
            <div key={link.key} className="mt-2">
              <button
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                  activeMenu === link.key
                    ? "border-l-4 border-blue-500 bg-gray-100 text-black shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-black"
                }`}
                onClick={() => handleMenuClick(link.key, link.path)}
              >
                <Icon size={20} className="text-gray-500" />
                {!isCollapsed && (
                  <span className="text-[15px] font-semibold">
                    {link.label}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="space-y-1 border-t border-gray-100 bg-white/50 p-3 backdrop-blur-sm">
        <div className={isCollapsed ? "px-0" : "px-1 pb-2"}>
          {!isCollapsed ? (
            <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Settings
            </p>
          ) : null}
          <AppearanceButtons compact={isCollapsed} />
        </div>
        {mobile && onOpenProfile ? (
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-gray-700 transition-colors hover:bg-gray-50 hover:text-black md:hidden"
            onClick={onOpenProfile}
          >
            <UserRound size={20} className="text-gray-500" />
            <span className="min-w-0 text-left leading-tight">
              <span className="block text-[15px] font-semibold">Profile</span>
              {staffName ? (
                <span className="block truncate text-xs text-gray-500">
                  {staffName}
                </span>
              ) : null}
            </span>
          </button>
        ) : null}
        <button
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-500 transition-colors hover:bg-red-50"
          onClick={onLogout}
        >
          <LogOut
            size={20}
            className="transition-transform group-hover:scale-110"
          />
          {!isCollapsed && (
            <span className="text-[15px] font-semibold">Logout</span>
          )}
        </button>
      </div>
    </div>
  );
}
