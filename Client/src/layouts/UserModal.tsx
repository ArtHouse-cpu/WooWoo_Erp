import { useEffect, useCallback, useState } from "react";
import { X, User, MapPin, Phone, Mail, UserCircle2, CalendarDays, Save } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { handleUpdateUser } from "@/services/apiClient";
import Swal from "sweetalert2";

type UserModalProps = {
  open: boolean;
  onClose: () => void;
  user?: any;
};

export const UserModal = ({ open, onClose, user: propUser }: UserModalProps) => {
  const staff = useAppSelector((state) => state.user);
  console.log(staff);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPropUserObject = propUser && typeof propUser === "object";
  
  const displayUser = {
    _id: isPropUserObject && propUser._id ? propUser._id : (staff.m_staff_id || ""),
    name: isPropUserObject && propUser.name ? propUser.name : staff.m_staff_name || "",
    email: isPropUserObject && propUser.email ? propUser.email : staff.m_staff_email || "",
    phone: isPropUserObject && propUser.phone ? propUser.phone : staff.m_staff_mobile || "",
    gender: isPropUserObject && propUser.gender ? propUser.gender : staff.gender || "",
    dob: isPropUserObject && propUser.dob ? propUser.dob : staff.dob || "",
    address: isPropUserObject && propUser.address ? propUser.address : staff.address || staff.m_staff_branch || "",
    membership: isPropUserObject && propUser.membership ? propUser.membership : (staff.m_staff_role || "Active"),
    gstin: isPropUserObject && propUser.gstin ? propUser.gstin : staff.gstin || "",
    companyName: isPropUserObject && propUser.companyName ? propUser.companyName : staff.companyName || "",
    pincode: isPropUserObject && propUser.pincode ? propUser.pincode : staff.pincode || "",
    city: isPropUserObject && propUser.city ? propUser.city : staff.city || "",
    state: isPropUserObject && propUser.state ? propUser.state : staff.state || "",
    country: isPropUserObject && propUser.country ? propUser.country : staff.country || "",
    membershipType: isPropUserObject && propUser.membershipType ? propUser.membershipType : staff.membershipType || "",
    adharNumber: isPropUserObject && propUser.adharNumber ? propUser.adharNumber : staff.adharNumber || "",
    whatsappNumber: isPropUserObject && propUser.whatsappNumber ? propUser.whatsappNumber : staff.whatsappNumber || "",
    AlternateMobile: isPropUserObject && propUser.AlternateMobile ? propUser.AlternateMobile : staff.alternateMobile || "",
  };
  console.log(displayUser);

  const [formData, setFormData] = useState(displayUser);

  // Sync formData when modal opens or displayUser changes
  useEffect(() => {
    setFormData(displayUser);
    if (!open) {
      setIsEditing(false); // Reset edit state when closed
    }
  }, [open, staff, propUser]); // depend on staff implicitly updates displayUser

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [open, handleEsc]);

  // Badge Color logic
  const getBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "admin":
        return "bg-green-100 text-green-700 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "premium":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    if (!formData.phone) {
      Swal.fire("Error", "Mobile Number is required for updating.", "error");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...formData };
      delete payload._id; 
      
      if (payload.name) {
          payload.fullName = payload.name;
          delete payload.name;
      }
      
      const updateMobile = payload.phone;
      if (payload.phone) {
          payload.mobile = payload.phone;
          delete payload.phone;
      }
      
      await handleUpdateUser(updateMobile, payload);
      
      Swal.fire("Success", "User details updated successfully.", "success");
      setIsEditing(false);
    } catch (error: any) {
      Swal.fire("Error", error?.response?.data?.message || "Could not update user", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = "w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white";
  const labelStyle = "block text-xs font-semibold text-gray-600 mb-1 mt-2";

  return (
    <>
      <div 
        className={`fixed inset-0 z-[60] bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={onClose}
      />

      <div 
        className={`fixed inset-y-0 right-0 z-[70] w-full max-w-[420px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ pointerEvents: open ? "auto" : "none" }}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? "Edit User Details" : "User Details"}
          </h2>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-24">
          {!isEditing ? (
            // --- VIEW MODE ---
            <>
              <div className="flex flex-col items-center mb-8 gap-3">
                <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-500 shadow-sm">
                  <User size={36} />
                </div>
                <div className="text-center w-full">
                  <h3 className="text-xl font-bold text-gray-900 truncate px-2">{displayUser.name || "N/A"}</h3>
                  <p className="text-sm text-gray-500 mt-0.5 truncate px-2">{displayUser.email || "N/A"}</p>
                </div>
                <div className={`capitalize mt-1 px-3 py-1 rounded-full text-xs font-semibold border ${getBadgeColor(displayUser.membership)}`}>
                  {displayUser.membership || "Active"}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact Information</h4>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Phone size={18} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Phone</p>
                    <p className="text-sm text-gray-900 mt-0.5">{displayUser.phone || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Mail size={18} className="text-gray-400 mt-0.5" />
                  <div className="w-full min-w-0">
                    <p className="text-xs text-gray-500 font-medium">Email</p>
                    <p className="text-sm text-gray-900 mt-0.5 truncate">{displayUser.email || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <MapPin size={18} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Address</p>
                    <p className="text-sm text-gray-900 mt-0.5">{displayUser.address || "N/A"}</p>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-2">Personal Information</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-transparent">
                    <UserCircle2 size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Gender</p>
                      <p className="text-sm text-gray-900 mt-0.5">{displayUser.gender || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-transparent">
                    <CalendarDays size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Date of Birth</p>
                      <p className="text-sm text-gray-900 mt-0.5">{displayUser.dob || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // --- EDIT MODE ---
            <div className="space-y-3">
              <div>
                <label className={labelStyle}>Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={inputStyle} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>Mobile</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Alternate Mobile</label>
                  <input type="text" name="AlternateMobile" value={formData.AlternateMobile} onChange={handleInputChange} className={inputStyle} />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={inputStyle} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>WhatsApp Number</label>
                  <input type="text" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Adhar Number</label>
                  <input type="text" name="adharNumber" value={formData.adharNumber} onChange={handleInputChange} className={inputStyle} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className={inputStyle}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Date of Birth</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>Membership Type</label>
                  <input type="text" name="membershipType" value={formData.membershipType} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>GSTIN</label>
                  <input type="text" name="gstin" value={formData.gstin} onChange={handleInputChange} className={inputStyle} />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Company Name</label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} className={inputStyle} />
              </div>

              <div>
                <label className={labelStyle}>Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} className={inputStyle} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>State</label>
                  <input type="text" name="state" value={formData.state} onChange={handleInputChange} className={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>Country</label>
                  <input type="text" name="country" value={formData.country} onChange={handleInputChange} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Pincode</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} className={inputStyle} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-white flex items-center justify-end gap-3 absolute bottom-0 w-full left-0 origin-bottom">
          {!isEditing ? (
            <>
              <button 
                type="button" 
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsEditing(true)}
              >
                Edit User
              </button>
              <button 
                type="button" 
                className="w-full px-4 py-2.5 rounded-lg bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                Delete User
              </button>
            </>
          ) : (
            <>
              <button 
                type="button" 
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => {
                   setIsEditing(false);
                   setFormData(displayUser); // reset edits
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="w-full px-4 py-2.5 flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                onClick={handleSave}
                disabled={loading}
              >
                <Save size={16} />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};