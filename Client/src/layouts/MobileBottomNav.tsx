import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Home,
  Package,
  Plus,
  Users,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/customers", label: "Customers", icon: Users, end: false },
  { to: "/products", label: "Products", icon: Package, end: false },
  { to: "/payments", label: "Reports", icon: BarChart3, end: false },
] as const;

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const { canPath } = usePermission();

  const quickBillPath = canPath("/create-invoice")
    ? "/create-invoice"
    : canPath("/create-pos")
      ? "/create-pos"
      : canPath("/pos")
        ? "/pos"
        : "/";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Mobile primary"
    >
      <div className="relative mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 items-end px-1">
        {NAV_ITEMS.slice(0, 2).map((item) => {
          if (!canPath(item.to) && item.to !== "/") return <div key={item.to} />;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 pb-2.5 text-[11px] font-medium transition ${
                  isActive ? "text-[#2F6FED]" : "text-gray-500"
                }`
              }
            >
              <Icon size={22} strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="relative flex flex-col items-center justify-end pb-1.5">
          <button
            type="button"
            onClick={() => navigate(quickBillPath)}
            className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-[#2F6FED] text-white shadow-[0_8px_20px_rgba(47,111,237,0.35)] transition hover:bg-[#2563eb] active:scale-95"
            aria-label="Quick Bill"
          >
            <Plus size={28} strokeWidth={2.25} />
          </button>
          <span className="mt-1 text-[11px] font-medium text-[#2F6FED]">
            Quick Bill
          </span>
        </div>

        {NAV_ITEMS.slice(2).map((item) => {
          if (!canPath(item.to)) return <div key={item.to} />;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 pb-2.5 text-[11px] font-medium transition ${
                  isActive ? "text-[#2F6FED]" : "text-gray-500"
                }`
              }
            >
              <Icon size={22} strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
