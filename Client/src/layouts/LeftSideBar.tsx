import { useMemo, useState } from "react";
import {
  ChevronDown,
  ShoppingCart,
  Wallet,
  LayoutDashboard,
  Banknote,
  BookOpenText,
  Network,
  FileSpreadsheet,
  LogOut,
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
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import { handleLogout } from "@/services/apiClient";
import { useAppDispatch } from "@/store/hooks";
import { logout as logoutUser } from "@/store/slices/userSlice";
import { usePermission } from "@/hooks/usePermission";

type SubMenuItem = {
  name: string;
  label: string;
  icon: LucideIcon;
  path: string;
};

type MenuGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  submenu: SubMenuItem[];
};

type TopLink = {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
};

const MENU_GROUPS: MenuGroup[] = [
  {
    key: "sales",
    label: "Sales",
    icon: Banknote,
    submenu: [
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
    key: "purchases",
    label: "Purchases",
    icon: ShoppingCart,
    submenu: [
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
  {
    key: "Inventory",
    label: "Inventory",
    icon: Package,
    submenu: [
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
      {
        name: "customers",
        label: "Customers",
        icon: Users,
        path: "/customers",
      },
      {
        name: "csp",
        label: "CSP",
        icon: Users,
        path: "/csp",
      },
    ],
  },
];

const TOP_LINKS: TopLink[] = [
  { key: "foodBill", label: "Food Billing", icon: Utensils, path: "/foodBill" },
  { key: "wallet", label: "Wallet", icon: Wallet, path: "/wallet" },
  { key: "coupons", label: "Coupons", icon: Percent, path: "/coupons" },
  {
    key: "affiliate",
    label: "Affiliate Program",
    icon: Network,
    path: "/affiliate-program",
  },
  { key: "access", label: "Access", icon: ShieldUser, path: "/access" },

];

/**
 * Step 8 — Sidebar filtered by MENU_PERMISSION_MAP via canPath().
 * Hiding a link is UX only; PermissionRoute + APIs still enforce access.
 */
type LeftSideBarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export default function LeftSideBar({
  mobile = false,
  onNavigate,
}: LeftSideBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState("");
  const [activeMenu, setActiveMenu] = useState("home");
  const [activeSubmenu, setActiveSubmenu] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const logout = useAuthStore((s) => s.logout);
  const { canPath } = usePermission();
  const isCollapsed = mobile ? false : collapsed;

  const visibleGroups = useMemo(
    () =>
      MENU_GROUPS.map((group) => ({
        ...group,
        submenu: group.submenu.filter((sub) => canPath(sub.path)),
      })).filter((group) => group.submenu.length > 0),
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
      className={`flex h-full flex-col border-r border-gray-100 bg-white/95 shadow-sm backdrop-blur transition-all duration-300 ${mobile ? "w-full" : isCollapsed ? "w-16" : "w-64"
        }`}
    >
      <div
        className={`flex items-center justify-between border-b border-gray-100 px-3 py-3 ${mobile ? "" : ""
          }`}
      >
        {!isCollapsed && (
          <span className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
            Navigation
          </span>
        )}
        {!mobile ? (
          <button
            className={`rounded-lg p-2 text-gray-600 transition-all hover:bg-gray-100 hover:text-black ${isCollapsed ? "mx-auto" : ""
              }`}
            onClick={() => setCollapsed(!collapsed)}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        ) : (
          <span className="text-xs font-medium text-gray-400">Menu</span>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 text-gray-700">
        {showHome ? (
          <button
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${activeMenu === "home"
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${activeMenu === menu.key
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
                  <span className="text-[15px] font-semibold">{menu.label}</span>
                )}

                {!isCollapsed && (
                  <ChevronDown
                    size={18}
                    className={`ml-auto transition-all duration-300 ${openMenu === menu.key
                        ? "rotate-180 text-gray-700"
                        : "text-gray-400"
                      }`}
                  />
                )}
              </button>

              {openMenu === menu.key && !isCollapsed && (
                <div className="mt-2 ml-9 space-y-1.5">
                  {menu.submenu.map((sub) => {
                    const SubIcon = sub.icon;

                    return (
                      <div
                        key={sub.name}
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-all ${activeSubmenu === sub.name
                            ? "bg-gray-100 font-medium text-black"
                            : "text-gray-600 hover:bg-gray-50 hover:text-black"
                          }`}
                        onClick={() =>
                          handleSubmenuClick(menu.key, sub.name, sub.path)
                        }
                      >
                        <SubIcon size={16} className="text-gray-400" />
                        <span className="text-[14px]">{sub.label}</span>
                      </div>
                    );
                  })}
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${activeMenu === link.key
                    ? "border-l-4 border-blue-500 bg-gray-100 text-black shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-black"
                  }`}
                onClick={() => handleMenuClick(link.key, link.path)}
              >
                <Icon size={20} className="text-gray-500" />
                {!isCollapsed && (
                  <span className="text-[15px] font-semibold">{link.label}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-100 bg-white/50 p-3 backdrop-blur-sm">
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
