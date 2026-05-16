import { Bell, User, Shuffle, ChevronDown } from "lucide-react";
import logo from "../assets/images/logo/woo_woo_art_house_logo.png";
import { useState } from "react";
import { UserModal } from "./UserModal";
import { CompanySelectorModal } from "./CompanySelectorModal";
import { useAppSelector } from "@/store/hooks";

export default function Header() {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const { companyName, m_staff_branch, companies, activeCompanyId } = useAppSelector((state) => state.user);
  
  const activeCompany = (companies || []).find(c => c.id === activeCompanyId);
  const activeLogo = activeCompany?.logo || logo;

  const handleOpenUser = () => {
    setIsUserModalOpen(true);
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 md:px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3 md:gap-4">
        <img
          src={activeLogo}
          alt="logo"
          className="h-10 w-10 rounded-full object-cover cursor-pointer border border-gray-100 shadow-sm"
        />

        <div className="flex flex-col leading-tight cursor-pointer group" onClick={() => setIsCompanyModalOpen(true)}>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm md:text-[15px] text-gray-900 group-hover:text-blue-600 transition-colors">
              {companyName || "WOO WOO Art House"}
            </h1>
            <ChevronDown size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Shuffle size={12} className="text-gray-400" />
            <span className="text-[12px] font-medium uppercase tracking-tight">Change Company</span>
            {m_staff_branch && (
              <span className="ml-1 text-gray-400 font-normal">({m_staff_branch})</span>
            )}
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
      </div>
    </header>
  );
}
