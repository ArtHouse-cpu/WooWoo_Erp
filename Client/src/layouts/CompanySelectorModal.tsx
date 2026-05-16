import { useState, useEffect } from "react";
import { X, Search, PlusCircle, CheckCircle2, Edit3, Share2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCompanies, setActiveCompany } from "@/store/slices/userSlice";
import { 
    handleGetMyCompanies, 
    handleCreateCompany, 
    handleSwitchCompany as apiSwitchCompany 
} from "@/services/apiClient";
import Swal from "sweetalert2";

type CompanySelectorModalProps = {
  open: boolean;
  onClose: () => void;
};

export const CompanySelectorModal = ({ open, onClose }: CompanySelectorModalProps) => {
  const dispatch = useAppDispatch();
  const { companies, activeCompanyId } = useAppSelector((state) => state.user);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredCompanies = (companies || []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open) {
        fetchCompanies();
    }
  }, [open]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await handleGetMyCompanies();
      if (response?.companies) {
        // Map backend _id to id if needed, or just use _id
        const mapped = response.companies.map((c: any) => ({
            ...c,
            id: c._id // Ensure we have a consistent id field
        }));
        dispatch(setCompanies(mapped));
        if (response.activeCompany) {
            dispatch(setActiveCompany(response.activeCompany));
        }
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.ctrlKey && !isNaN(Number(e.key))) {
        const index = Number(e.key) - 1;
        const currentCompanies = companies || [];
        if (currentCompanies[index]) {
          handleSwitchCompany(currentCompanies[index].id || currentCompanies[index]._id!);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, companies]);

  const handleSwitchCompany = async (id: string) => {
    try {
      await apiSwitchCompany(id);
      dispatch(setActiveCompany(id));
      onClose();
      Swal.fire({
        icon: "success",
        title: "Company Switched",
        text: "Data context has been updated.",
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (error) {
      Swal.fire("Error", "Failed to switch company context.", "error");
    }
  };

  const handleAddNew = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Add New Company',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Company Name">' +
        '<input id="swal-input2" class="swal2-input" placeholder="Branch Name">',
      focusConfirm: false,
      preConfirm: () => {
        return [
          (document.getElementById('swal-input1') as HTMLInputElement).value,
          (document.getElementById('swal-input2') as HTMLInputElement).value
        ];
      }
    });

    if (formValues && formValues[0] && formValues[1]) {
      try {
        await handleCreateCompany({ name: formValues[0], branch: formValues[1] });
        await fetchCompanies();
        Swal.fire('Success', 'New company added.', 'success');
      } catch (error) {
        Swal.fire('Error', 'Failed to create company.', 'error');
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative flex-1 mr-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={`Search your companies (${(companies || []).length})`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              autoFocus
            />
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Company List */}
        <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1">
          {filteredCompanies.map((company, index) => (
            <div
              key={company.id}
              onClick={() => handleSwitchCompany(company.id)}
              className={`group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
                activeCompanyId === company.id 
                  ? "bg-emerald-50/50 border border-emerald-100" 
                  : "hover:bg-gray-50 border border-transparent"
              }`}
            >
              {/* Avatar/Logo */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm">
                  {company.logo ? (
                    <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-gray-400">
                      {company.name.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {activeCompanyId === company.id && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    <CheckCircle2 className="text-emerald-500 fill-white" size={18} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-bold truncate ${activeCompanyId === company.id ? "text-emerald-900" : "text-gray-900"}`}>
                    {company.name}
                  </h3>
                  <span className="text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    CTRL + {index + 1}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{company.branch || "No branch specified"}</p>
                
                {activeCompanyId === company.id && (
                  <div className="flex items-center gap-3 mt-2">
                    <button className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition">
                      <Edit3 size={12} />
                      Edit
                    </button>
                    <button className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition">
                      <Share2 size={12} />
                      Share
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredCompanies.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="text-gray-300" size={24} />
              </div>
              <p className="text-sm text-gray-500 font-medium">No companies found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <button 
          onClick={handleAddNew}
          className="w-full p-4 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-50 transition-all font-semibold text-sm"
        >
          <PlusCircle size={18} className="text-gray-400" />
          Add new Company
          <span className="text-gray-300 ml-auto">→</span>
        </button>
      </div>
    </div>
  );
};
