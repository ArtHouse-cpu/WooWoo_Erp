import {
  useMemo,
  useRef,
  useState,
  type HTMLInputTypeAttribute,
} from "react";
import {
  Camera,
  X,
  UserRound,
  MapPin,
  Building2,
  Wallet,
  Contact2,
} from "lucide-react";
import { type CustomerPayload } from "@/services/apiClient";

type Props = {
  onClose: () => void;
  onSubmit: (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => Promise<void>;
  loading: boolean;
};

type FormState = Required<Omit<CustomerPayload, "createdBy">>;
type FormKey = keyof FormState;
const DIGIT_ONLY_FIELDS: FormKey[] = [
  "mobile",
  "whatsappNumber",
  "AlternateMobile",
  "pincode",
  "adharNumber",
  "accountNumber",
];
const UPPERCASE_FIELDS: FormKey[] = ["IFSCcode", "panNumber", "gstin"];

type InputFieldProps = {
  label: string;
  value: string;
  keyName: FormKey;
  onValueChange: (key: FormKey, value: string) => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
};

function InputField({
  label,
  value,
  keyName,
  onValueChange,
  type = "text",
  placeholder,
  required = false,
  maxLength,
}: InputFieldProps) {
  return (
    <div>
      <label
        htmlFor={keyName}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={keyName}
        name={keyName}
        value={value}
        onChange={(e) => onValueChange(keyName, e.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}

const initialState: FormState = {
  name: "",
  mobile: "",
  membershipType: "none",
  email: "",
  gstin: "",
  companyName: "",
  address: "",
  pincode: "",
  city: "",
  state: "",
  country: "India",
  adharNumber: "",
  dob: "",
  gender: "Not Specified",
  whatsappNumber: "",
  AlternateMobile: "",
  IFSCcode: "",
  bankName: "",
  branchName: "",
  accountNumber: "",
  panNumber: "",
  accountHolderName: "",
  UPIID: "",
  profileImage: "",
};

export default function CreateCustomerModal({
  onClose,
  onSubmit,
  loading,
}: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(() => {
    const cleaned = String(form.name ?? "").trim();
    if (!cleaned) return "C";
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "C";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + second).toUpperCase();
  }, [form.name]);

  const previewUrl = useMemo(() => {
    if (!profileImageFile) return "";
    return URL.createObjectURL(profileImageFile);
  }, [profileImageFile]);

  const update = (key: FormKey, value: string) => {
    let nextValue = value;
    if (DIGIT_ONLY_FIELDS.includes(key)) {
      nextValue = nextValue.replace(/\D/g, "");
    }
    if (UPPERCASE_FIELDS.includes(key)) {
      nextValue = nextValue.toUpperCase();
    }
    setForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const submit = async () => {
    if (!form.name.trim() || !form.mobile.trim()) return;

    const payload: CustomerPayload = {
      ...form,
      membershipType:
        form.membershipType && form.membershipType !== "none"
          ? form.membershipType.trim()
          : "",
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      companyName: form.companyName.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
    };

    await onSubmit({ payload, profileImageFile });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity">
      <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-900/5 transition-all">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <UserRound size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Create New Customer
              </h2>
              <p className="text-sm text-slate-500">
                Add a new customer to your database.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="contents"
        >
          {/* Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
            <div className="space-y-8">
              {/* Profile Photo */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 ring-2 ring-white shadow-sm">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
                            {initials}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => fileRef.current?.click()}
                        className="absolute -bottom-2 -right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Upload profile photo"
                      >
                        <Camera size={18} />
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setProfileImageFile(f);
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        Profile photo
                      </div>
                      <div className="text-sm text-slate-500">
                        Upload JPG/PNG/WebP (max 2MB).
                      </div>
                    </div>
                  </div>

                  {profileImageFile && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setProfileImageFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </section>

              {/* Section 1: Basic Information */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Contact2 size={18} className="text-slate-400" />
                  <h3 className="text-base font-semibold text-slate-800">
                    Contact Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <InputField
                    label="Name"
                    value={form.name}
                    keyName="name"
                    onValueChange={update}
                    placeholder="Full name"
                    required
                  />
                  <InputField
                    label="Mobile"
                    value={form.mobile}
                    keyName="mobile"
                    onValueChange={update}
                    placeholder="Primary mobile"
                    required
                    maxLength={10}
                  />
                  <InputField
                    label="Email"
                    value={form.email}
                    keyName="email"
                    onValueChange={update}
                    type="email"
                    placeholder="Email address"
                  />
                  <InputField
                    label="WhatsApp Number"
                    value={form.whatsappNumber}
                    keyName="whatsappNumber"
                    onValueChange={update}
                    placeholder="WhatsApp number"
                    maxLength={10}
                  />
                  <InputField
                    label="Alternate Mobile"
                    value={form.AlternateMobile}
                    keyName="AlternateMobile"
                    onValueChange={update}
                    placeholder="Backup contact"
                    maxLength={10}
                  />
                  <InputField
                    label="Date of Birth"
                    value={form.dob}
                    keyName="dob"
                    onValueChange={update}
                    type="date"
                  />

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.gender}
                      onChange={(e) => update("gender", e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="Not Specified">Not Specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Section 2: Identity & Company */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 size={18} className="text-slate-400" />
                  <h3 className="text-base font-semibold text-slate-800">
                    Identity & Business
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <InputField
                    label="Pan Number"
                    value={form.panNumber}
                    keyName="panNumber"
                    onValueChange={update}
                    placeholder="PAN details"
                    maxLength={10}
                  />
                  <InputField
                    label="Aadhar Number"
                    value={form.adharNumber}
                    keyName="adharNumber"
                    onValueChange={update}
                    placeholder="Aadhar details"
                    maxLength={12}
                  />
                  <InputField
                    label="GSTIN"
                    value={form.gstin}
                    keyName="gstin"
                    onValueChange={update}
                    placeholder="GST Number"
                  />
                  <div className="md:col-span-2 lg:col-span-3">
                    <InputField
                      label="Company Name"
                      value={form.companyName}
                      keyName="companyName"
                      onValueChange={update}
                      placeholder="Registered business name"
                    />
                  </div>
                </div>
              </section>

              {/* Section 3: Bank Details */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Wallet size={18} className="text-slate-400" />
                  <h3 className="text-base font-semibold text-slate-800">
                    Bank Details
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <InputField
                    label="Account Holder Name"
                    value={form.accountHolderName}
                    keyName="accountHolderName"
                    onValueChange={update}
                    placeholder="Name as per bank"
                  />
                  <InputField
                    label="Bank Name"
                    value={form.bankName}
                    keyName="bankName"
                    onValueChange={update}
                    placeholder="e.g. HDFC Bank"
                  />
                  <InputField
                    label="Account Number"
                    value={form.accountNumber}
                    keyName="accountNumber"
                    onValueChange={update}
                    placeholder="Bank Ac No."
                    maxLength={20}
                  />
                  <InputField
                    label="IFSC Code"
                    value={form.IFSCcode}
                    keyName="IFSCcode"
                    onValueChange={update}
                    placeholder="Branch IFSC"
                    maxLength={11}
                  />
                  <InputField
                    label="Branch Name"
                    value={form.branchName}
                    keyName="branchName"
                    onValueChange={update}
                    placeholder="e.g. MG Road Branch"
                  />
                  <InputField
                    label="UPI ID"
                    value={form.UPIID}
                    keyName="UPIID"
                    onValueChange={update}
                    placeholder="e.g. user@bank"
                  />
                </div>
              </section>

              {/* Section 4: Address */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-slate-400" />
                  <h3 className="text-base font-semibold text-slate-800">
                    Location
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <div className="md:col-span-2 lg:col-span-3">
                    <InputField
                      label="Full Address"
                      value={form.address}
                      keyName="address"
                      onValueChange={update}
                      placeholder="Street layout, building, area"
                    />
                  </div>
                  <InputField
                    label="Pincode"
                    value={form.pincode}
                    keyName="pincode"
                    onValueChange={update}
                    placeholder="Postal code"
                    maxLength={6}
                  />
                  <InputField
                    label="City"
                    value={form.city}
                    keyName="city"
                    onValueChange={update}
                    placeholder="e.g. Mumbai"
                  />
                  <InputField
                    label="State"
                    value={form.state}
                    keyName="state"
                    onValueChange={update}
                    placeholder="e.g. Maharashtra"
                  />
                  <InputField
                    label="Country"
                    value={form.country}
                    keyName="country"
                    onValueChange={update}
                    placeholder="e.g. India"
                  />
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.name.trim() || !form.mobile.trim()}
              className="flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
