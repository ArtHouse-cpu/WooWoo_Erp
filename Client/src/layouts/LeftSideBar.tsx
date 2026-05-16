import { useState } from "react";
import {
  ChevronDown,
  ShoppingCart,
  // BarChart3,
  Wallet,
  LayoutDashboard,
  Banknote,
  BookOpenText,
  Network,
  // BetweenHorizontalStart,
   FileSpreadsheet,
  // BookAudio,
  // Handshake,
  LogOut,

  // Submenu Icons
  Receipt,
  // CreditCard,
  FileText,
  Percent,
  Users,
  Package,
  // Mail,
  // MessageCircle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import { handleLogout } from "@/services/apiClient";
import { useAppDispatch } from "@/store/hooks";
import { logout as logoutUser } from "@/store/slices/userSlice";

export default function LeftSideBar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState("");
  const [activeMenu, setActiveMenu] = useState("home");
  const [activeSubmenu, setActiveSubmenu] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const logout = useAuthStore((s) => s.logout);

  const handleToggleMenu = (menu: any) => {
    setOpenMenu(openMenu === menu ? "" : menu);
  };

  const handleMenuClick = (menu: any, path: string | null = null) => {
    setActiveMenu(menu);
    setActiveSubmenu("");
    if (path) navigate(path);
  };

  const handleSubmenuClick = (menu: any, submenu: any, path: any) => {
    setActiveMenu(menu);
    setActiveSubmenu(submenu);
    navigate(path);
  };

  const onLogout = async () => {
    try {
      await handleLogout();
    } catch (error) {
      // Even if API fails, clear local session to prevent stale auth state.
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
  const menuConfig: any = [
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
        // { name: "invoices", label: "Invoices", icon: FileText, path: "/pos" },
        // { name: "payments", label: "Payments", icon: CreditCard, path: "/payments" },
        { name: "quotations", label: "Quotations", icon: Percent, path: "/quotations" },
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
        {name: "Inventory Timeline", label: "Inventory Timeline", icon: FileSpreadsheet, path: "/inventory-timeline" },
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
      ],
    },
  ];

  return (
    <div
      className={`h-screen flex flex-col bg-white/90 backdrop-blur border-r border-gray-100 shadow-sm transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3 mt-14 border-b border-gray-100">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
            Navigation
          </span>
        )}
        <button
          className={`rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-black transition-all ${
            collapsed ? "mx-auto" : ""
          }`}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className="flex-1 px-3 py-4 text-gray-700 space-y-2 overflow-y-auto">
        {/* HOME */}
        <button
          className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-lg transition-all
          ${
            activeMenu === "home"
              ? "bg-gray-100 border-l-4 border-blue-500 text-black shadow-sm"
              : "text-gray-700 hover:bg-gray-50 hover:text-black"
          }`}
          onClick={() => handleMenuClick("home", "/")}
        >
          <LayoutDashboard size={20} className="text-gray-500" />
          {!collapsed && (
            <span className="text-[15px] font-semibold">Home</span>
          )}
        </button>

        {/* MENUS */}
        {menuConfig.map((menu: any) => {
          const Icon = menu.icon;

          return (
            <div key={menu.key} className="mt-2">
              <button
                className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-lg transition-all
                ${
                  activeMenu === menu.key
                    ? "bg-gray-100 border-l-4 border-blue-500 text-black shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-black"
                }`}
                onClick={() => {
                  handleMenuClick(menu.key);
                  handleToggleMenu(menu.key);
                }}
              >
                <Icon size={20} className="text-gray-500" />

                {!collapsed && (
                  <span className="text-[15px] font-semibold">
                    {menu.label}
                  </span>
                )}

                {!collapsed && (
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

              {/* SUBMENU */}
              {openMenu === menu.key && !collapsed && (
                <div className="ml-9 mt-2 space-y-1.5">
                  {menu.submenu.map((sub: any) => {
                    const SubIcon = sub.icon;

                    return (
                      <div
                        key={sub.name}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer
                        ${
                          activeSubmenu === sub.name
                            ? "bg-gray-100 text-black font-medium"
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

        <div className="mt-2">
          <button
            className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-lg transition-all
            ${
              activeMenu === "wallet"
                ? "bg-gray-100 border-l-4 border-blue-500 text-black shadow-sm"
                : "text-gray-700 hover:bg-gray-50 hover:text-black"
            }`}
            onClick={() => handleMenuClick("wallet", "/wallet")}
          >
            <Wallet size={20} className="text-gray-500" />
            {!collapsed && (
              <span className="text-[15px] font-semibold">Wallet</span>
            )}
          </button>
        </div>
        <div className="mt-2">
          <button
            className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-lg transition-all
            ${
              activeMenu === "coupons"
                ? "bg-gray-100 border-l-4 border-blue-500 text-black shadow-sm"
                : "text-gray-700 hover:bg-gray-50 hover:text-black"
            }`}
            onClick={() => handleMenuClick("coupons", "/coupons")}
          >
            <Percent size={20} className="text-gray-500" />
            {!collapsed && (
              <span className="text-[15px] font-semibold">Coupons</span>
            )}
          </button>
        </div>
      </div>
      <div className="p-3 border-t border-gray-100 bg-white/50 backdrop-blur-sm">
        <button
          className="flex items-center gap-3 w-full py-2.5 px-3 rounded-lg hover:bg-red-50 text-red-500 transition-colors group"
          onClick={onLogout}
        >
          <LogOut
            size={20}
            className="group-hover:scale-110 transition-transform"
          />
          {!collapsed && (
            <span className="text-[15px] font-semibold">Logout</span>
          )}
        </button>
      </div>
    </div>
  );
}
