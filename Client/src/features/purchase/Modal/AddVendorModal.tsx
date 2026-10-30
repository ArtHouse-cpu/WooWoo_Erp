import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLInputTypeAttribute,
  type RefObject,
} from "react";
import {
  Camera,
  X,
  UserRound,
  MapPin,
  Building2,
  Wallet,
  Contact2,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
} from "lucide-react";
import {
  handleUploadVendorDocument,
  type CustomerPayload,
  type VendorDocument,
  type VendorPointOfContact,
} from "@/services/apiClient";
import { closeIfConfirmed } from "@/utils/confirmClose";

type Props = {
  onClose: () => void;
  onSubmit: (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => Promise<void>;
  loading: boolean;
  /** Prefill for edit mode */
  initialValues?: Partial<CustomerPayload> | null;
  mode?: "create" | "edit";
};

type FormState = Required<
  Omit<
    CustomerPayload,
    | "createdBy"
    | "pointsOfContact"
    | "documents"
    | "_id"
    | "membershipPlanId"
    | "priority"
  >
>;
type FormKey = keyof FormState;
type ContactState = Required<VendorPointOfContact>;
const DIGIT_ONLY_FIELDS: FormKey[] = [
  "mobile",
  "whatsappNumber",
  "businessPhoneNumber",
  "AlternateMobile",
  "pincode",
  "adharNumber",
  "accountNumber",
];
const UPPERCASE_FIELDS: FormKey[] = ["IFSCcode", "panNumber", "gstin", "udyamNumber", "cinNumber"];

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

function ContactInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}

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

const emptyState: FormState = {
  name: "",
  mobile: "",
  email: "",
  gstin: "",
  companyName: "",
  address: "",
  pincode: "",
  city: "",
  state: "",
  country: "India",
  membershipType: "general",
  adharNumber: "",
  dob: "",
  gender: "",
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
  businessPhoneNumber: "",
  brandName: "",
  website: "",
  businessEmail: "",
  msme: "",
  udyamNumber: "",
  cinNumber: "",
};

const emptyContact = (): ContactState => ({
  name: "",
  mobile: "",
  email: "",
  whatsappNumber: "",
  alternateMobile: "",
  dob: "",
  gender: "",
  department: "",
  designation: "",
});

const contactFromSaved = (row?: VendorPointOfContact | null): ContactState => ({
  name: String(row?.name ?? ""),
  mobile: String(row?.mobile ?? ""),
  email: String(row?.email ?? ""),
  whatsappNumber: String(row?.whatsappNumber ?? ""),
  alternateMobile: String(row?.alternateMobile ?? ""),
  dob: formatDobForInput(row?.dob),
  gender: String(row?.gender ?? ""),
  department: String(row?.department ?? ""),
  designation: String(row?.designation ?? ""),
});

const DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function savedDocuments(rows?: VendorDocument[] | null): VendorDocument[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => /^https:\/\//i.test(String(row?.url || "")))
    .slice(0, 5)
    .map((row) => ({
      url: String(row.url),
      name: String(row.name || "document"),
      mimeType: String(row.mimeType || ""),
      size: Number(row.size || 0),
    }));
}

async function uploadVendorFiles(
  files: File[],
  setDocuments: (update: (current: VendorDocument[]) => VendorDocument[]) => void,
  setUploading: (value: boolean) => void,
  setFormError: (value: string) => void,
) {
  const accepted = files.filter(
    (file) => DOCUMENT_TYPES.includes(file.type) && file.size <= 5 * 1024 * 1024,
  );
  if (!accepted.length) {
    setFormError("Upload a JPG, PNG, WEBP, or PDF up to 5 MB.");
    return;
  }
  setUploading(true);
  setFormError("");
  try {
    let saved = 0;
    for (const file of accepted) {
      const response = await handleUploadVendorDocument(file);
      if (!response?.document?.url) continue;
      saved += 1;
      const document = response.document;
      setDocuments((current) => [...current, document].slice(0, 5));
    }
    if (!saved) {
      setFormError("The document could not be stored. Check cloud storage and try again.");
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    setFormError(err.response?.data?.message ?? "Could not upload the document.");
  } finally {
    setUploading(false);
  }
}

function formatDobForInput(value?: string | null): string {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildFormState(initial?: Partial<CustomerPayload> | null): FormState {
  if (!initial) return { ...emptyState };
  return {
    ...emptyState,
    name: String(initial.name ?? ""),
    mobile: String(initial.mobile ?? ""),
    email: String(initial.email ?? ""),
    gstin: String(initial.gstin ?? ""),
    companyName: String(initial.companyName ?? ""),
    address: String(initial.address ?? ""),
    pincode: String(initial.pincode ?? ""),
    city: String(initial.city ?? ""),
    state: String(initial.state ?? ""),
    country: String(initial.country ?? "India") || "India",
    membershipType: String(initial.membershipType ?? "general") || "general",
    adharNumber: String(initial.adharNumber ?? ""),
    dob: formatDobForInput(initial.dob),
    gender: String(initial.gender ?? ""),
    whatsappNumber: String(initial.whatsappNumber ?? ""),
    AlternateMobile: String(initial.AlternateMobile ?? ""),
    IFSCcode: String(initial.IFSCcode ?? ""),
    bankName: String(initial.bankName ?? ""),
    branchName: String(initial.branchName ?? ""),
    accountNumber: String(initial.accountNumber ?? ""),
    panNumber: String(initial.panNumber ?? ""),
    accountHolderName: String(initial.accountHolderName ?? ""),
    UPIID: String(initial.UPIID ?? ""),
    profileImage: String(initial.profileImage ?? ""),
    businessPhoneNumber: String(initial.businessPhoneNumber ?? ""),
    brandName: String(initial.brandName ?? ""),
    website: String(initial.website ?? ""),
    businessEmail: String(initial.businessEmail ?? ""),
    msme: String(initial.msme ?? ""),
    udyamNumber: String(initial.udyamNumber ?? ""),
    cinNumber: String(initial.cinNumber ?? ""),
  };
}

export default function AddVendorModal({
  onClose,
  onSubmit,
  loading,
  initialValues = null,
  mode = "create",
}: Props) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState<FormState>(() =>
    buildFormState(initialValues),
  );
  const [contacts, setContacts] = useState<ContactState[]>(() =>
    initialValues?.pointsOfContact?.length
      ? initialValues.pointsOfContact.map(contactFromSaved)
      : [emptyContact()],
  );
  const [documents, setDocuments] = useState<VendorDocument[]>(() =>
    savedDocuments(initialValues?.documents),
  );
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const [formError, setFormError] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm(buildFormState(initialValues));
    setContacts(
      initialValues?.pointsOfContact?.length
        ? initialValues.pointsOfContact.map(contactFromSaved)
        : [emptyContact()],
    );
    setDocuments(savedDocuments(initialValues?.documents));
    setUploadingDocs(false);
    setFormError("");
    setProfileImageFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [initialValues, mode]);

  const initials = useMemo(() => {
    const cleaned = String(contacts[0]?.name || form.companyName || "").trim();
    if (!cleaned) return "V";
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "V";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + second).toUpperCase();
  }, [contacts, form.companyName]);

  const previewUrl = useMemo(() => {
    if (profileImageFile) return URL.createObjectURL(profileImageFile);
    return String(form.profileImage || "").trim();
  }, [profileImageFile, form.profileImage]);

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

  const validPhone = (value: string) => /^[6-9]\d{9}$/.test(value.trim());
  const namedContact = contacts.find(row => row.name.trim());
  const canSave = Boolean(
    (namedContact?.name.trim() || form.companyName.trim()) &&
      validPhone(form.businessPhoneNumber || namedContact?.mobile || ""),
  );

  const updateContact = (index: number, key: keyof ContactState, value: string) => {
    const digits = key === "mobile" || key === "whatsappNumber" || key === "alternateMobile";
    const nextValue = digits ? value.replace(/\D/g, "") : value;
    setContacts(current =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: nextValue } : row,
      ),
    );
  };

  const submit = async () => {
    const filledPhone = (value: string) => value.replace(/\D/g, "");
    const businessPhone = filledPhone(form.businessPhoneNumber);
    const pointsOfContact = contacts
      .map(row => ({
        name: row.name.trim(),
        mobile: filledPhone(row.mobile),
        email: row.email.trim(),
        whatsappNumber: filledPhone(row.whatsappNumber),
        alternateMobile: filledPhone(row.alternateMobile),
        dob: row.dob,
        gender: row.gender,
        department: row.department.trim(),
        designation: row.designation.trim(),
      }))
      .filter(row =>
        row.name ||
        row.mobile ||
        row.email ||
        row.whatsappNumber ||
        row.alternateMobile ||
        row.dob ||
        row.gender ||
        row.department ||
        row.designation,
      );
    const namedContact = pointsOfContact.find(row => row.name);
    const vendorName = namedContact?.name || form.companyName.trim();
    const vendorPhone = businessPhone || namedContact?.mobile || "";
    if (!vendorName) {
      setFormError("Enter the vendor name in Point of Contact, or the company name.");
      return;
    }
    if (!validPhone(vendorPhone)) {
      setFormError("Enter a valid 10-digit business phone number or point of contact mobile number.");
      return;
    }
    const extraPhones = pointsOfContact.flatMap(row =>
      [row.mobile, row.whatsappNumber, row.alternateMobile].filter(Boolean),
    );
    if ([businessPhone, ...extraPhones].some(phone => phone && !validPhone(phone))) {
      setFormError("Enter a valid 10-digit phone number.");
      return;
    }
    setFormError("");

    const payload: CustomerPayload = {
      ...form,
      name: vendorName,
      mobile: vendorPhone,
      email: namedContact?.email || pointsOfContact[0]?.email || form.email.trim(),
      companyName: form.companyName.trim(),
      businessPhoneNumber: businessPhone,
      brandName: form.brandName.trim(),
      website: form.website.trim(),
      businessEmail: form.businessEmail.trim(),
      msme: form.msme.trim(),
      udyamNumber: form.udyamNumber.trim().toUpperCase(),
      cinNumber: form.cinNumber.trim().toUpperCase(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      pointsOfContact,
      documents,
    };

    await onSubmit({ payload, profileImageFile });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity">
      <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-900/5 transition-all">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <UserRound size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEdit ? "Edit Vendor" : "Create New Vendor"}
              </h2>
              <p className="text-sm text-slate-500">
                {isEdit
                  ? "Update vendor details and save changes."
                  : "Add a new vendor to your database."}
              </p>
            </div>
          </div>
          <button
            onClick={() => void closeIfConfirmed(onClose)}
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
          <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
            <div className="space-y-8">
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

                  {(profileImageFile || form.profileImage) && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setProfileImageFile(null);
                        update("profileImage", "");
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 size={18} className="text-slate-400" />
                  <h3 className="text-base font-semibold text-slate-800">
                    Identity & Business name
                  </h3>
                </div>
                <p className="mb-4 text-sm text-slate-500">
                  The vendor name is taken from the point of contact.
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <InputField
                    label="Company Name"
                    value={form.companyName}
                    keyName="companyName"
                    onValueChange={update}
                    placeholder="Registered business name"
                  />
                   <InputField
                    label="Business Phone Number"
                    value={form.businessPhoneNumber}
                    keyName="businessPhoneNumber"
                    onValueChange={update}
                    placeholder="Business phone number"
                    maxLength={10}
                  />
                   <InputField
                    label="Business Whatsapp Number"
                    value={form.whatsappNumber}
                    keyName="whatsappNumber"
                    onValueChange={update}
                    placeholder="Whatsapp Number"
                  />
                  <InputField
                    label="Brand Name"
                    value={form.brandName}
                    keyName="brandName"
                    onValueChange={update}
                    placeholder="Enter brand name"
                  />
                  <InputField
                    label="Website"
                    value={form.website}
                    keyName="website"
                    onValueChange={update}
                    placeholder="Website URL"
                  />
                 
                 
                  <InputField
                    label="Business Email"
                    value={form.businessEmail}
                    keyName="businessEmail"
                    onValueChange={update}
                    placeholder="Enter Business email"
                  />
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
                  <InputField
                    label="MSME"
                    value={form.msme}
                    keyName="msme"
                    onValueChange={update}
                    placeholder="MSME"
                  />
                  <InputField
                    label="Udyam Number"
                    value={form.udyamNumber}
                    keyName="udyamNumber"
                    onValueChange={update}
                    placeholder="UDYAM-XX-00-0000000"
                  />
                  <InputField
                    label="CIN Number"
                    value={form.cinNumber}
                    keyName="cinNumber"
                    onValueChange={update}
                    placeholder="Corporate Identification Number"
                    maxLength={21}
                  />
                </div>
                <VendorDocuments
                  documents={documents}
                  uploading={uploadingDocs}
                  inputRef={documentInputRef}
                  onUpload={(files) => {
                    const room = 5 - documents.length;
                    if (room <= 0) {
                      setFormError("You can upload up to 5 documents.");
                      return;
                    }
                    void uploadVendorFiles(
                      files.slice(0, room),
                      setDocuments,
                      setUploadingDocs,
                      setFormError,
                    );
                  }}
                  onRemove={(url) =>
                    setDocuments((current) => current.filter((row) => row.url !== url))
                  }
                />
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Contact2 size={18} className="text-slate-400" />
                    <h3 className="text-base font-semibold text-slate-800">
                      Point of Contact
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setContacts(current => [...current, emptyContact()])}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                    title="Add another point of contact"
                    aria-label="Add another point of contact"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-4">
                  {contacts.map((contact, index) => (
                    <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">Contact {index + 1}</p>
                        {contacts.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => setContacts(current => current.filter((_, rowIndex) => rowIndex !== index))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Remove contact ${index + 1}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        <ContactInput label="Vendor Name" value={contact.name} onChange={value => updateContact(index, "name", value)} placeholder="Full name" />
                        <ContactInput label="Department" value={contact.department} onChange={value => updateContact(index, "department", value)} placeholder="Department" />
                        <ContactInput label="Designation" value={contact.designation} onChange={value => updateContact(index, "designation", value)} placeholder="Designation" />
                        <ContactInput label="Mobile" value={contact.mobile} onChange={value => updateContact(index, "mobile", value)} placeholder="Mobile number" maxLength={10} />
                        <ContactInput label="Email" value={contact.email} onChange={value => updateContact(index, "email", value)} type="email" placeholder="Email address" />
                        <ContactInput label="WhatsApp Number" value={contact.whatsappNumber} onChange={value => updateContact(index, "whatsappNumber", value)} placeholder="WhatsApp number" maxLength={10} />
                        <ContactInput label="Alternate Mobile" value={contact.alternateMobile} onChange={value => updateContact(index, "alternateMobile", value)} placeholder="Backup contact" maxLength={10} />
                        <ContactInput label="Date of Birth" value={contact.dob} onChange={value => updateContact(index, "dob", value)} type="date" />
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">Gender</label>
                          <select
                            value={contact.gender}
                            onChange={event => updateContact(index, "gender", event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          >
                            <option value="">Not Specified</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

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

          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
            {formError ? <p className="mr-auto text-sm font-medium text-rose-600">{formError}</p> : null}
            <button
              type="button"
              onClick={() => void closeIfConfirmed(onClose)}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingDocs || !canSave}
              className="flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? isEdit
                  ? "Updating..."
                  : "Saving..."
                : isEdit
                  ? "Update Vendor"
                  : "Create Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VendorDocuments({
  documents,
  uploading,
  inputRef,
  onUpload,
  onRemove,
}: {
  documents: VendorDocument[];
  uploading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onUpload: (files: File[]) => void;
  onRemove: (url: string) => void;
}) {
  const full = documents.length >= 5;
  const take = (list: FileList | null) => {
    if (!list || uploading || full) return;
    onUpload(Array.from(list));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Upload document
        </p>
        <span className="text-[10px] font-medium text-slate-400">
          {documents.length}/5 · 5 MB
        </span>
      </div>
      <button
        type="button"
        disabled={uploading || full}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          take(event.dataTransfer.files);
        }}
        className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-white px-3 py-4 text-center transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadCloud size={22} className="text-blue-500" />
        <span className="mt-1 text-sm font-semibold text-slate-800">
          {uploading ? "Uploading…" : full ? "Five documents added" : "Click or drop a document"}
        </span>
        <span className="mt-0.5 text-[11px] text-slate-400">JPG, PNG, WEBP, or PDF</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        disabled={uploading || full}
        className="hidden"
        onChange={(event) => take(event.target.files)}
      />
      {documents.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {documents.map((document) => {
            const image = String(document.mimeType || "").startsWith("image/");
            return (
              <li
                key={document.url}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"
              >
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {image ? (
                    <img src={document.url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <FileText size={16} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {document.name || "Document"}
                    </span>
                    <span className="block text-[11px] text-slate-400">Open file</span>
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => onRemove(document.url)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Remove ${document.name || "document"}`}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
