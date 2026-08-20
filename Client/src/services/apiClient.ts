import { Signal } from "lucide-react";
import { axiosInstance } from "./axiosInstance";

export const toWhatsAppNumber = (digits10: string) => `+91${digits10}`;

export const handleLogin = async (payload: {
  identifier: string;
  password: string;
}) => {
  try {
    const response = await axiosInstance.post("/auth/login", {
      identifier: payload.identifier.trim(),
      password: payload.password,
    });
    return response.data;
  } catch (error) {
    console.log("Error fetching to login:", error);
    throw error;
  }
};

export const handleSignup = async (payload: {
  email: string;
  mobileDigits10: string;
  password: string;
  fullName?: string;
}) => {
  try {
    const body: Record<string, string> = {
      email: payload.email.trim().toLowerCase(),
      phone: payload.mobileDigits10,
      password: payload.password,
    };
    const name = payload.fullName?.trim();
    if (name) body.fullName = name;

    const response = await axiosInstance.post("/auth/register", body);
    return response.data;
  } catch (error) {
    console.log("Error signing up:", error);
    throw error;
  }
};

export const handleRequestOtp = async (digits10: string) => {
  const whatsappNumber = toWhatsAppNumber(digits10);
  try {
    const response = await axiosInstance.post("/auth/request-otp", {
      whatsappNumber,
    });
    return response.data;
  } catch (error) {
    console.log("Error fetching to request otp.");
    throw error;
  }
};

export const handleLogout = async () => {
  try {
    const response = await axiosInstance.post("/auth/logout");
    return response.data;
  } catch (error) {
    console.log("Error fetching to logout:", error);
    throw error;
  }
};

export const handleVerifyOtp = async (digits10: string, otp: string) => {
  const whatsappNumber = toWhatsAppNumber(digits10);
  try {
    const response = await axiosInstance.post("/auth/verify-otp", {
      whatsappNumber,
      otp,
    });
    return response.data;
  } catch (error) {
    console.log("Error fetching to verify otp.");
    throw error;
  }
};

export const handleUpdateUser = async (_mobile: string, payload: any) => {
  try {
    // Step 11: authenticated self-profile update (mobile path kept for callers)
    const response = await axiosInstance.patch(`/auth/me`, payload);
    return response.data;
  } catch (error) {
    console.log("Error updating user:", error);
    throw error;
  }
};

export const handleRequestEmailOtp = async (email: string) => {
  try {
    const response = await axiosInstance.post("/auth/request-email-otp", {
      email,
    });
    return response.data;
  } catch (error) {
    console.log("Error requesting email otp:", error);
    throw error;
  }
};

export const handleResetPassword = async (payload: {
  identifier: string;
  otp: string;
  newPassword: string;
}) => {
  try {
    const response = await axiosInstance.patch("/auth/forgot-password", payload);
    return response.data;
  } catch (error) {
    console.log("Error resetting password:", error);
    throw error;
  }
};

export type CreateInvoiceItemPayload = {
  productName: string;
  qty: number;
  unitPrice: number;
  discount: number;
  category?: string;
};

export type CreateInvoicePayload = {
  search: string;
  signal?: AbortSignal;
  limit?: number;
  fromDate:string,
  toDate:string,
  customerName: string;
  customerPhone: string;
  /** Exact CRM customer linked to this invoice (preferred over name search). */
  customerId?: string | null;
  invoiceDate: string;
  dueDate: string;
  salesPersonName: string;
  /** Staff who verified via PIN at checkout (not the logged-in user). */
  invoiceBy?: {
    staffId?: string | null;
    staffName?: string;
    employeeId?: string;
    email?: string;
  } | null;
  verifiedAt?: string | null;
  notes: string;
  items: CreateInvoiceItemPayload[];
  subTotal: number;
  discountTotal: number;
  grandTotal: number;
  status?: "draft" | "final";
  mode?: string;
  paymentStatus?: "full" | "partial";
  paymentBreakdown?: {
    cash: number;
    upi: number;
    card: number;
    wallet?: number;
    paidAmount: number;
    dueAmount: number;
    changeAmount: number;
  };
  extraCharges?: Array<{ label: string; amount: number }>;
  pendingAmount?: number;
  coupon?: {
    code: string;
    discountAmount?: number;
  } | null;
  referral?: {
    code: string;
    discountAmount?: number;
    inviterName?: string;
    label?: string;
  } | null;
  /** Membership cashback to show on WhatsApp activityupdate (and client wallet credit) */
  cashbackTotal?: number;
  /** Membership discount amount for WhatsApp activityupdate */
  membershipDiscount?: number;
  /** Customer membership tier for WhatsApp (premium | pro | …) */
  membershipType?: string;
  /** e.g. Food Bill | Space Booking | Invoice */
  activityType?: string;
  createdBy?: {
    m_staff_id?: string | null;
    m_staff_name?: string | null;
    m_staff_email?: string | null;
  };
  newPayment?: {
    date: string;
    amount: number;
    mode: string;
    receivedBy: string;
  };
};

export type CouponPayload = {
  code: string;
  title: string;
  description?: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  startsAt?: string | null;
  expiresAt: string;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  isActive?: boolean;
  createdBy?: {
    m_staff_id?: string | null;
    m_staff_name?: string | null;
    m_staff_email?: string | null;
  };
};

export const handleCreateInvoice = async (payload: CreateInvoicePayload) => {
 
  try {
    const response = await axiosInstance.post("/invoice", payload);
    return response.data;
  } catch (error) {
    console.log("Error creating invoice:", error);
    throw error;
  }
};

export type VerifiedStaff = {
  _id: string;
  staffId: string;
  name: string;
  staffName: string;
  employeeId: string;
  m_staff_id?: string;
  email?: string;
};

export const handleVerifyStaffPin = async (pin: string) => {
  const response = await axiosInstance.post("/access/staff/verify-pin", { pin });
  return response.data as {
    success: boolean;
    message?: string;
    staff?: VerifiedStaff;
    verifiedAt?: string;
  };
};

export const handleSetStaffPin = async (
  staffId: string,
  payload: { pin?: string } = {},
) => {
  const response = await axiosInstance.post(`/access/staff/${staffId}/pin`, payload);
  return response.data as {
    success: boolean;
    message?: string;
    pin?: string;
    staff?: AccessStaffRow;
  };
};

export const handleUpdateStaffPin = async (
  staffId: string,
  payload: { enabled?: boolean; reset?: boolean; pin?: string },
) => {
  const response = await axiosInstance.patch(
    `/access/staff/${staffId}/pin`,
    payload,
  );
  return response.data as {
    success: boolean;
    message?: string;
    pin?: string;
    staff?: AccessStaffRow;
  };
};

export const handleClearStaffPin = async (staffId: string) => {
  const response = await axiosInstance.delete(`/access/staff/${staffId}/pin`);
  return response.data as {
    success: boolean;
    message?: string;
    staff?: AccessStaffRow;
  };
};

/** Reveal Staff PIN for Access managers (View PIN). */
export const handleViewStaffPin = async (staffId: string) => {
  const response = await axiosInstance.get(`/access/staff/${staffId}/pin`);
  return response.data as {
    success: boolean;
    message?: string;
    pin?: string;
    needsReset?: boolean;
    staff?: { _id: string; fullName: string; m_staff_id?: string };
  };
};

export const handleGetInvoices = async (
  search = "",
  signal?: AbortSignal,
  limit = 2000,
  fromDate = "",
  toDate = "",
) => {
  try {
    const response = await axiosInstance.get("/invoice", {
      params: { search: search.trim(), limit ,...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}) },
      signal,
    });
    return response.data;
  } catch (error) {
    console.log("Error fetching invoices:", error);
    throw error;
  }
};

export const handleGetInvoice = async (id: string, signal?: AbortSignal) => {
  const response = await axiosInstance.get(`/invoice/${id}`, { signal });
  return response.data as { success: boolean; invoice?: any; message?: string };
};

export const handleGetAllExpences = async (
  search = "",
  signal?: AbortSignal,
  limit = 6000,
  fromDate = "",
  toDate = "",
) => {
  const response = await axiosInstance.get("/api/expences", {
    params: {
      search: search.trim(),
      limit,
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
    },
    signal,
  });
  return response.data as {
    success: boolean;
    message?: string;
    expences?: any[];
    total?: number;
    limit?: number;
  };
};

export type ExpencePaymentBreakdown = {
  cash?: number;
  upi?: number;
  card?: number;
  wallet?: number;
};

export type ExpenceStaffRef = {
  m_staff_id?: string | null;
  m_staff_name?: string | null;
  m_staff_email?: string | null;
};

export type ExpencePaymentRecord = {
  _id?: string;
  amount: number;
  mode: string;
  paymentBreakdown?: ExpencePaymentBreakdown;
  receivedBy?: ExpenceStaffRef;
  notes?: string;
  paidAt?: string;
};

export type RecordExpencePaymentPayload = {
  amount: number;
  mode: string;
  isMultiMode?: boolean;
  paymentBreakdown?: ExpencePaymentBreakdown;
  receivedBy?: ExpenceStaffRef;
  notes?: string;
  paidAt?: string;
};

export type CreateExpencePayload = {
  expenseCode?: string;
  title: string;
  category: string;
  amount: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentBreakdown?: ExpencePaymentBreakdown;
  initialPayment?: {
    mode?: string;
    isMultiMode?: boolean;
    paymentBreakdown?: ExpencePaymentBreakdown;
    receivedBy?: ExpenceStaffRef;
    notes?: string;
    paidAt?: string;
  };
  paidTo: string;
  vendorId?: string | null;
  mode: string;
  status?: string;
  date: string;
  notes?: string;
  receiptUrl?: string | null;
  createdBy?: ExpenceStaffRef;
  addedBy?: ExpenceStaffRef;
};

export function expencePayloadToFormData(
  payload: Partial<CreateExpencePayload>,
  receiptFile?: File | null,
) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (key === "createdBy" || key === "addedBy") {
      fd.append(key, JSON.stringify(value));
      continue;
    }
    if (key === "initialPayment" || key === "paymentBreakdown") {
      fd.append(key, JSON.stringify(value));
      continue;
    }
    fd.append(key, String(value));
  }
  if (receiptFile) fd.append("receipt", receiptFile);
  return fd;
}

const expenceMultipartHeaders = {
  headers: { "Content-Type": "multipart/form-data" as const },
};

export const handleCreateExpence = async (
  payload: CreateExpencePayload,
  receiptFile?: File | null,
) => {
  const body = receiptFile
    ? expencePayloadToFormData(payload, receiptFile)
    : payload;
  const response = await axiosInstance.post(
    "/api/expences",
    body,
    receiptFile ? expenceMultipartHeaders : undefined,
  );
  return response.data as {
    success: boolean;
    message?: string;
    expence?: any;
  };
};

export const handleGetExpenceById = async (id: string, signal?: AbortSignal) => {
  const response = await axiosInstance.get(`/api/expences/${id}`, { signal });
  return response.data as {
    success: boolean;
    message?: string;
    expence?: any;
  };
};

export const handleUpdateExpence = async (
  id: string,
  payload: Partial<CreateExpencePayload>,
  receiptFile?: File | null,
) => {
  const body = receiptFile
    ? expencePayloadToFormData(payload, receiptFile)
    : payload;
  const response = await axiosInstance.patch(
    `/api/expences/${id}`,
    body,
    receiptFile ? expenceMultipartHeaders : undefined,
  );
  return response.data as {
    success: boolean;
    message?: string;
    expence?: any;
  };
};

export const handleDeleteExpence = async (id: string) => {
  const response = await axiosInstance.delete(`/api/expences/${id}`);
  return response.data as {
    success: boolean;
    message?: string;
  };
};

export const handleRecordExpencePayment = async (
  id: string,
  payload: RecordExpencePaymentPayload,
) => {
  const response = await axiosInstance.post(`/api/expences/${id}/payments`, payload);
  return response.data as {
    success: boolean;
    message?: string;
    expence?: any;
    payment?: ExpencePaymentRecord;
  };
};

export const handleUpdateInvoice = async (id: string, payload: Partial<CreateInvoicePayload>) => {
  try {
    const response = await axiosInstance.patch(`/invoice/${id}`, payload);
    return response.data;
  } catch (error) {
    console.log("Error updating invoice:", error);
    throw error;
  }
};

export const handleCancelInvoice = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`/invoice/${id}/cancel`);
    return response.data;
  } catch (error) {
    console.log("Error cancelling invoice:", error);
    throw error;
  }
};

export const handleDeleteInvoice = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/invoice/${id}`);
    return response.data;
  } catch (error) {
    console.log("Error deleting invoice:", error);
    throw error;
  }
};

export type CreateQuotationPayload = {
  customerName: string;
  customerPhone: string;
  quotationDate: string;
  dueDate: string;
  salesPersonName: string;
  notes: string;
  items: {
    productName: string;
    qty: number;
    unitPrice: number;
    discount: number;
    cashback?: number;
    category?: string;
    isCsp?: boolean;
    productDiscountType?: string;
    productDiscountValue?: number;
    productDiscountAmount?: number;
    membershipDiscountAmount?: number;
  }[];
  subTotal: number;
  discountTotal: number;
  grandTotal: number;
  membershipType?: string;
  membershipPlanId?: string | null;
  membershipDiscount?: number;
  cashbackTotal?: number;
  extraCharges?: Array<{ label: string; amount: number }>;
  status?: "draft" | "sent" | "accepted" | "rejected";
  coupon?: {
    code: string;
    discountAmount?: number;
  } | null;
  createdBy?: {
    m_staff_id?: string | null;
    m_staff_name?: string | null;
    m_staff_email?: string | null;
  };
};

export const handleCreateQuotation = async (payload: CreateQuotationPayload) => {
  try {
    const response = await axiosInstance.post("/quotation", payload);
    return response.data;
  } catch (error) {
    console.log("Error creating quotation:", error);
    throw error;
  }
};

export const handleGetQuotations = async (search = "", signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/quotation", {
      params: { search: search.trim() },
      signal,
    });
    return response.data;
  } catch (error) {
    console.log("Error fetching quotations:", error);
    throw error;
  }
};

export const handleUpdateQuotation = async (id: string, payload: Partial<CreateQuotationPayload>) => {
  try {
    const response = await axiosInstance.patch(`/quotation/${id}`, payload);
    return response.data;
  } catch (error) {
    console.log("Error updating quotation:", error);
    throw error;
  }
};

export const handleUpdateQuotationStatus = async (id: string, status: string) => {
  try {
    const response = await axiosInstance.patch(`/quotation/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.log("Error updating quotation status:", error);
    throw error;
  }
};

export const handleDeleteQuotation = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/quotation/${id}`);
    return response.data;
  } catch (error) {
    console.log("Error deleting quotation:", error);
    throw error;
  }
};

export const handleGetCoupons = async (
  params?: { search?: string; status?: "all" | "active" | "inactive" },
  signal?: AbortSignal,
) => {
  const response = await axiosInstance.get("/coupon", {
    params: {
      search: params?.search?.trim() ?? "",
      status: params?.status ?? "all",
    },
    signal,
  });
  return response.data;
};

export const handleCreateCoupon = async (payload: CouponPayload) => {
  const response = await axiosInstance.post("/coupon", payload);
  return response.data;
};

export const handleUpdateCoupon = async (id: string, payload: Partial<CouponPayload>) => {
  const response = await axiosInstance.patch(`/coupon/${id}`, payload);
  return response.data;
};

export const handleDeleteCoupon = async (id: string) => {
  const response = await axiosInstance.delete(`/coupon/${id}`);
  return response.data;
};

export const handleActivateCoupon = async (id: string) => {
  const response = await axiosInstance.patch(`/coupon/${id}/activate`);
  return response.data;
};

export const handleDeactivateCoupon = async (id: string) => {
  const response = await axiosInstance.patch(`/coupon/${id}/deactivate`);
  return response.data;
};

export const handleValidateCoupon = async (payload: {
  code: string;
  orderAmount: number;
  customerPhone?: string;
}) => {
  const response = await axiosInstance.post("/coupon/validate", payload);
  return response.data;
};

export const handleValidateReferralDiscount = async (payload: {
  customerId?: string;
  customerPhone?: string;
  referralCode?: string;
  orderAmount: number;
  items?: Array<{
    name?: string;
    productName?: string;
    qty?: number;
    unitPrice?: number;
    price?: number;
    discount?: number;
    lineTotal?: number;
    category?: string;
  }>;
}) => {
  const response = await axiosInstance.post(
    "/affiliate/validate-referral-discount",
    payload,
  );
  return response.data;
};


export type ReturnSaleItemPayload = CreateInvoiceItemPayload;

export type CreateReturnSalePayload = {
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  dueDate: string;
  salesPersonName: string;
  notes: string;
  items: Array<
    ReturnSaleItemPayload & {
      lineIndex?: number | null;
      originalQty?: number;
      isGift?: boolean;
      refundAmount?: number;
      lineTotal?: number;
    }
  >;
  subTotal: number;
  discountTotal: number;
  grandTotal: number;
  status?: "draft" | "final" | "cancelled";
  originalInvoiceId?: string | null;
  originalInvoiceCode?: string;
  intent?: "return" | "cancel";
  refundMode?: string;
  refundBreakdown?: {
    cash: number;
    upi: number;
    card: number;
    wallet: number;
    paidAmount: number;
  };
  createdBy?: {
    m_staff_id?: string | null;
    m_staff_name?: string | null;
    m_staff_email?: string | null;
  };
};

export const handleGetReturnSales = async (
  search = "",
  limit = 100,
  signal?: AbortSignal,
  originalInvoiceId?: string,
) => {
  const response = await axiosInstance.get("/returnsales", {//return sales Api Call 
    params: {
      search: search.trim(),
      limit,
      ...(originalInvoiceId ? { originalInvoiceId } : {}),
    },
    signal,
  });
  return response.data;
};

export const handleGetReturnSaleById = async (id: string, signal?: AbortSignal) => {
  const response = await axiosInstance.get(`/returnsales/${id}`, { signal });
  return response.data;
};

export const handleCreateReturnSale = async (payload: CreateReturnSalePayload) => {
  const response = await axiosInstance.post("/returnsales", payload);
  return response.data;
};

export const handleUpdateReturnSale = async (
  id: string,
  payload: Partial<CreateReturnSalePayload>,
) => {
  const response = await axiosInstance.patch(`/returnsales/${id}`, payload);
  return response.data;
};

export const handleDeleteReturnSale = async (id: string) => {
  const response = await axiosInstance.delete(`/returnsales/${id}`);
  return response.data;
};

export type SubscriptionItemPayload = CreateInvoiceItemPayload;

export type CreateSubscriptionPayload = {
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  dueDate: string;
  membershipId?: string;
  membershipPlanId?: string;
  membershipType?: string;
  /** Membership plan priority at purchase / upgrade time */
  priority?: number;
  repeatType?: "weekly" | "monthly" | "yearly" | "lifetime";
  repeatEvery?: number | null;
  repeatUnit?: "month" | "year" | null;
  students?: Array<{
    studentName: string;
    schoolName?: string;
    dob?: string | null;
    classStd: string;
    relation: string;
    parentName: string;
    studentId?: string;
    studentIdUpload?: string;
  }>;
  salesPersonName: string;
  notes: string;
  items: SubscriptionItemPayload[];
  subTotal: number;
  discountTotal: number;
  grandTotal: number;
  status?: "draft" | "active" | "completed" | "cancelled";
  createdBy?: {
    m_staff_id?: string | null;
    m_staff_name?: string | null;
    m_staff_email?: string | null;
  };
  subscriptionCode?: string;
  mode?: string;
  paymentStatus?: "full" | "partial";
  paymentBreakdown?: {
    cash: number;
    upi: number;
    card: number;
    wallet?: number;
    paidAmount: number;
    dueAmount: number;
    changeAmount: number;
  };
  coupon?: {
    code: string;
    discountAmount?: number;
  } | null;
  referral?: {
    code: string;
    discountAmount?: number;
    inviterName?: string;
    label?: string;
  } | null;
};

export const handleGetSubscriptions = async (
  search = "",
  limit = 5000,
  signal?: AbortSignal,
  page = 1,
) => {
  const response = await axiosInstance.get("/subscriptions", {
    params: { search: search.trim(), limit, page },
    signal,
  });
  return response.data;
};

/** Fetch every matching subscription by paging until exhausted */
export const handleGetAllSubscriptions = async (
  search = "",
  signal?: AbortSignal,
  pageSize = 2000,
) => {
  const size = Math.min(Math.max(Number(pageSize) || 2000, 1), 10000);
  const all: any[] = [];
  let page = 1;
  let total = Infinity;

  while (all.length < total) {
    const data = await handleGetSubscriptions(search, size, signal, page);
    const batch = Array.isArray(data?.subscriptions) ? data.subscriptions : [];
    total = Number.isFinite(Number(data?.total))
      ? Number(data.total)
      : batch.length;
    all.push(...batch);
    if (!batch.length || batch.length < size || data?.hasMore === false) break;
    page += 1;
    if (page > 100) break; // safety
  }

  return {
    success: true,
    subscriptions: all,
    total: Number.isFinite(total) ? total : all.length,
  };
};

export const handleGetSubscriptionById = async (id: string, signal?: AbortSignal) => {
  const response = await axiosInstance.get(`/subscriptions/${id}`, { signal });
  return response.data;
};

export const handleCreateSubscription = async (payload: CreateSubscriptionPayload) => {
  const response = await axiosInstance.post("/subscriptions", payload);
  return response.data;
};

export const handleUpdateSubscription = async (
  id: string,
  payload: Partial<CreateSubscriptionPayload>,
) => {
  const response = await axiosInstance.patch(`/subscriptions/${id}`, payload);
  return response.data;
};

export const handleDeleteSubscription = async (id: string) => {
  const response = await axiosInstance.delete(`/subscriptions/${id}`);
  return response.data;
};

export const handleSendMembershipRenewalWhatsApp = async (subscriptionId: string) => {
  const response = await axiosInstance.post(
    `/subscriptions/${subscriptionId}/whatsapp-renewal`,
  );
  return response.data as {
    success: boolean;
    message?: string;
    reminder?: {
      subscriptionId: string;
      phone: string;
      templateName: string;
      messageId?: string | null;
      stub?: boolean;
      bodyParams?: string[];
      lastRenewalReminderAt?: string;
      lastRenewalReminderStatus?: string;
    };
  };
};

export type CustomerPayload = {
  _id?: string;
  name: string;
  mobile: string;
  membershipType?: string|null;
  membershipPlanId?: string|null;
  /** Priority of customer's current membership plan */
  priority?: number|null;
  email?: string;
  gstin?: string;
  companyName?: string;
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  adharNumber?: string;
  dob?: string;
  gender?: string;
  whatsappNumber?: string;
  AlternateMobile?: string;
  IFSCcode?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  panNumber?: string;
  accountHolderName?: string;
  UPIID?: string;
  profileImage?: string;
  createdBy?: {
    m_staff_id?: string | null;
    m_staff_name?: string | null;
    m_staff_email?: string | null;
  };
};

export function customerPayloadToFormData(
  payload: Partial<CustomerPayload>,
  profileImageFile?: File | null,
) {
  const fd = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (key === "createdBy") continue;
    if (key === "profileImage") continue;

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      fd.append(key, String(value));
      continue;
    }
  }

  // Ensure membershipPlanId is appended if present
  if (payload.membershipPlanId) {
    fd.append("membershipPlanId", payload.membershipPlanId);
  }

  if (profileImageFile) {
    fd.append("profileImage", profileImageFile);
  }

  return fd;
}

export const handleGetCustomers = async (
  search = "",
  signal?: AbortSignal,
  limit = 2000,
  page = 1,
) => {
  try {
    const response = await axiosInstance.get("/customer", {
      params: {
        search: search.trim(),
        limit,
        page,
      },
      signal,
    });
    return response.data;
  } catch (error) {
    console.log("Error fetching customers:", error);
    throw error;
  }
};

/** Fetch one CRM customer by id (exact record; not a name search). */
export const handleGetCustomerById = async (
  id: string,
  signal?: AbortSignal,
) => {
  const response = await axiosInstance.get(`/customer/${id}`, { signal });
  return response.data as {
    success: boolean;
    message?: string;
    customer?: {
      _id: string;
      name: string;
      mobile: string;
      companyName?: string;
      membershipType?: string;
      membershipPlanId?: string;
    };
  };
};

/** Fetch every matching customer by paging until exhausted */
export const handleGetAllCustomers = async (
  search = "",
  signal?: AbortSignal,
  pageSize = 2000,
) => {
  const size = Math.min(Math.max(Number(pageSize) || 2000, 1), 10000);
  const all: any[] = [];
  let page = 1;
  let total = Infinity;

  while (all.length < total) {
    const data = await handleGetCustomers(search, signal, size, page);
    const batch = Array.isArray(data?.customers) ? data.customers : [];
    total = Number.isFinite(Number(data?.total)) ? Number(data.total) : batch.length;
    all.push(...batch);
    if (!batch.length || batch.length < size || data?.hasMore === false) break;
    page += 1;
    if (page > 100) break; // safety
  }

  return {
    success: true,
    customers: all,
    total: all.length,
  };
};

export const handleCreateCustomer = async (payload: CustomerPayload | FormData) => {
  try {
    const response = await axiosInstance.post("/customer", payload, payload instanceof FormData
      ? {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      : undefined);
    return response.data;
  } catch (error) {
    console.log("Error creating customer:", error);
    throw error;
  }
};

/** Check if a customer mobile already exists (CRM) */
export const handleCheckCustomerPhone = async (
  mobile: string,
  opts?: { excludeId?: string; signal?: AbortSignal },
) => {
  const response = await axiosInstance.get("/customer/check-phone", {
    params: {
      mobile: String(mobile || "").trim(),
      excludeId: opts?.excludeId,
    },
    signal: opts?.signal,
  });
  return response.data as {
    success: boolean;
    exists: boolean;
    available: boolean;
    message?: string;
    customer?: { id?: string; name?: string; mobile?: string };
  };
};

/** Check if a staff/user phone already exists (auth) */
export const handleCheckPhone = async (phoneNumber: string) => {
  const response = await axiosInstance.post("/auth/checkPhone", {
    phoneNumber: String(phoneNumber || "").trim(),
  });
  return response.data as {
    success: boolean;
    exists: boolean;
    available: boolean;
    message?: string;
  };
};

export type CustomerImportRow = {
  name: string;
  email?: string;
  mobile: string;
  walletAmount?: number;
  balance?: number;
  closingBalance?: number;
  gender?: string;
};

export const handleImportCustomers = async (customers: CustomerImportRow[]) => {
  const response = await axiosInstance.post("/customer/import", { customers });
  return response.data;
};

export const handleUpdateCustomer = async (
  id: string,
  payload: Partial<CustomerPayload> | FormData,
) => {
  try {
    const response = await axiosInstance.patch(
      `/customer/${id}`,
      payload,
      payload instanceof FormData
        ? {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        : undefined,
    );
    return response.data;
  } catch (error) {
    console.log("Error updating customer:", error);
    throw error;
  }
};

export const handleDeleteCustomer = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/customer/${id}`);
    return response.data;
  } catch (error) {
    console.log("Error deleting customer:", error);
    throw error;
  }
};

export type WalletTransactionPayload = {
  type?: "credit" | "debit" | string;
  amount: number;
  note?: string;
  /** Which wallet type to credit: withdrawable | nonWithdrawable */
  walletType?: "withdrawable" | "nonWithdrawable" | "general" | "cashback" | "affiliate" | string;
  minimumBalance?: number;
  referenceType?: string;
  referenceId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  createdBy?: {
    m_staff_id?: string | null;
    m_staff_name?: string | null;
    m_staff_email?: string | null;
  };
};

export type WalletRecord = {
  _id?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  walletAmount?: number;
  balance?: number;
  currentBalance?: number;
  availableBalance?: number;
  updatedAt?: string;
  createdAt?: string;
  transactions?: Array<Record<string, unknown>>;
};


export const handleGetWallets = async (
  params?: { search?: string; limit?: number },
  signal?: AbortSignal,
) => {
  try {
    const response = await axiosInstance.get("/wallet", {
      params: {
        search: params?.search?.trim() ?? "",
        limit: params?.limit,
      },
      signal,
    });
    console.log("Wallets:", response.data);
    return response.data;
  } catch (error) {
    console.log("Error fetching wallets:", error);
    throw error;
  }
};

export const handleGetWalletById = async (id: string, signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get(`/wallet/${id}`, { signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching wallet by id:", error);
    throw error;
  }
};

export const handleCreateWallet = async (payload: WalletTransactionPayload) => {
  try {
    const response = await axiosInstance.post("/wallet", payload);
    return response.data;
  } catch (error) {
    console.log("Error creating wallet:", error);
    throw error;
  }
};

export const handleUpdateWallet = async (
  id: string,
  payload: Partial<WalletTransactionPayload>,
) => {
  try {
    const response = await axiosInstance.patch(`/wallet/${id}`, payload);
    return response.data;
  } catch (error) {
    console.log("Error updating wallet:", error);
    throw error;
  }
};

export const handleBulkWalletUpdate = async (
  payload: Pick<WalletTransactionPayload, "type" | "amount" | "note" | "minimumBalance" | "createdBy">,
) => {
  try {
    const response = await axiosInstance.patch("/wallet/bulk", payload);
    return response.data;
  } catch (error) {
    console.log("Error updating wallets in bulk:", error);
    throw error;
  }
};

export const handleGetWalletInstructions = async (signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/wallet/instructions", { signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching wallet instructions:", error);
    throw error;
  }
};

export const handleDeleteWallet = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/wallet/${id}`);
    return response.data;
  } catch (error) {
    console.log("Error deleting wallet:", error);
    throw error;
  }
};

export type MembershipPlanPayload = {
  _id?: string;
  planId: string;
  displayName: string;
  priority?: number;
  planType?: string;
  description?: string;
  pricing?: {
    period?: string;
    /** Original list / MRP before plan discount */
    grossAmount?: number;
    /** Selling price after discount (what customer pays) */
    amount?: number;
    taxPercent?: number;
    discountType?: string;
    discountPercent?: number;
  };
  usageLimits?: Record<
    string,
    {
      discount?: number;
      cashback?: number;
    }
  >;
  insightsLevel?: string;
  status?: "Active" | "Inactive";
  internalNotes?: string;
  customerDisplay?: {
    showInApp?: boolean;
    badgeLabel?: string;
    themeKey?:
      | "blue"
      | "purple"
      | "green"
      | "orange"
      | "yellow"
      | "violet"
      | "emerald"
      | "teal"
      | "indigo"
      | "rose";
    iconKey?: "user" | "star" | "graduation" | "crown";
    cashbackPercent?: number;
    /** Products usage cashback % mirrored for billing fallbacks */
    storeCashbackPercent?: number;
    storeDiscountPercent?: number;
    spaceDiscountPercent?: number;
    foodDiscountPercent?: number;
    serviceDiscountPercent?: number;
    features?: Array<{ label: string; was?: number }>;
  };
  /** Fixed ₹ credited to wallet when this membership is purchased */
  walletCashback?: {
    amount?: number;
  };
  createdBy?: {
    m_staff_id?: string | null;
    m_staff_name?: string | null;
    m_staff_email?: string | null;
  };
};

export const handleGetMemberships = async (
  params?: { search?: string; planType?: string; status?: string },
  signal?: AbortSignal,
) => {
  const response = await axiosInstance.get("/membership", {
    params: {
      search: params?.search?.trim() ?? "",
      planType: params?.planType ?? "All",
      status: params?.status ?? "All",
    },
    signal,
  });
  return response.data;
};

export const handleCreateMembership = async (payload: MembershipPlanPayload) => {
  const response = await axiosInstance.post("/membership", payload);
  return response.data;
};

export const handleUpdateMembership = async (
  id: string,
  payload: Partial<MembershipPlanPayload>,
) => {
  const response = await axiosInstance.patch(`/membership/${id}`, payload);
  return response.data;
};

export const handleDeleteMembership = async (id: string) => {
  const response = await axiosInstance.delete(`/membership/${id}`);
  return response.data;
};

// ── Razorpay membership purchase ─────────────────────────────────────────────

export type RazorpayOrderResponse = {
  success: boolean;
  orderId: string;
  amount: number;         // paise
  amountInRupees: number;
  currency: string;
  keyId: string;
  planId: string;
  plan: {
    _id: string;
    planId: string;
    displayName: string;
    pricing: { period?: string; amount?: number; grossAmount?: number };
  };
  customer: { name?: string; mobile?: string; email?: string };
  message?: string;
};

export const handleCreateMembershipRazorpayOrder = async (
  customerId: string,
  planId: string,
): Promise<RazorpayOrderResponse> => {
  const response = await axiosInstance.post(
    `/customer/${customerId}/membership/razorpay-order`,
    { planId },
  );
  return response.data as RazorpayOrderResponse;
};

export const handleVerifyMembershipRazorpayPayment = async (
  customerId: string,
  payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    planId: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
  },
) => {
  const response = await axiosInstance.post(
    `/customer/${customerId}/membership/razorpay-verify`,
    payload,
  );
  return response.data as {
    success: boolean;
    message?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    subscription?: unknown;
  };
};

export type SpacePayload = {
  _id?: string;
  name: string;
  category?: string;
  price?: number;
  capacity?: number;
  status?: "Available" | "Booked" | "Maintenance";
  description?: string;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const handleGetSpaces = async (
  params?: { search?: string; category?: string; status?: string },
  signal?: AbortSignal,
) => {
  const response = await axiosInstance.get("/space", {
    params: {
      search: params?.search?.trim() ?? "",
      category: params?.category ?? "All",
      status: params?.status ?? "All",
    },
    signal,
  });
  return response.data;
};

export const handleGetSpaceById = async (id: string, signal?: AbortSignal) => {
  const response = await axiosInstance.get(`/space/${id}`, { signal });
  return response.data;
};

export const spacePayloadToFormData = (
  payload: SpacePayload | Partial<SpacePayload>,
  imageFile?: File | null,
) => {
  const fd = new FormData();
  if (payload.name !== undefined) fd.append("name", String(payload.name));
  if (payload.category !== undefined) fd.append("category", String(payload.category));
  if (payload.price !== undefined) fd.append("price", String(payload.price));
  if (payload.capacity !== undefined) fd.append("capacity", String(payload.capacity));
  if (payload.status !== undefined) fd.append("status", String(payload.status));
  if (payload.description !== undefined) {
    fd.append("description", String(payload.description));
  }
  if (imageFile) fd.append("image", imageFile);
  return fd;
};

export const handleCreateSpace = async (
  payload: SpacePayload | FormData,
) => {
  const response = await axiosInstance.post(
    "/space",
    payload,
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined,
  );
  return response.data;
};

export const handleUpdateSpace = async (
  id: string,
  payload: Partial<SpacePayload> | FormData,
) => {
  const response = await axiosInstance.put(
    `/space/${id}`,
    payload,
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined,
  );
  return response.data;
};

export const handleDeleteSpace = async (id: string) => {
  const response = await axiosInstance.delete(`/space/${id}`);
  return response.data;
};

export type FoodPayload = {
  _id?: string;
  name: string;
  category?: string;
  price?: number;
  stock?: number;
  unit?: string;
  description?: string;
  isVeg?: boolean;
  status?: "Active" | "Inactive";
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const handleGetFoods = async (
  params?: { search?: string; category?: string; status?: string },
  signal?: AbortSignal,
) => {
  const response = await axiosInstance.get("/food", {
    params: {
      search: params?.search?.trim() ?? "",
      category: params?.category ?? "All",
      status: params?.status ?? "All",
    },
    signal,
  });
  return response.data;
};

export const foodPayloadToFormData = (
  payload: FoodPayload | Partial<FoodPayload>,
  imageFile?: File | null,
) => {
  const fd = new FormData();
  if (payload.name !== undefined) fd.append("name", String(payload.name));
  if (payload.category !== undefined) fd.append("category", String(payload.category));
  if (payload.price !== undefined) fd.append("price", String(payload.price));
  if (payload.stock !== undefined) fd.append("stock", String(payload.stock));
  if (payload.unit !== undefined) fd.append("unit", String(payload.unit));
  if (payload.description !== undefined) {
    fd.append("description", String(payload.description));
  }
  if (payload.isVeg !== undefined) fd.append("isVeg", String(payload.isVeg));
  if (payload.status !== undefined) fd.append("status", String(payload.status));
  if (imageFile) fd.append("image", imageFile);
  return fd;
};

export const handleCreateFood = async (payload: FoodPayload | FormData) => {
  const response = await axiosInstance.post(
    "/food",
    payload,
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined,
  );
  return response.data;
};

export const handleUpdateFood = async (
  id: string,
  payload: Partial<FoodPayload> | FormData,
) => {
  const response = await axiosInstance.put(
    `/food/${id}`,
    payload,
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined,
  );
  return response.data;
};

export const handleDeleteFood = async (id: string) => {
  const response = await axiosInstance.delete(`/food/${id}`);
  return response.data;
};

export type PurchaseItemPayload = {
  productName: string;
  qty: number;
  unitPrice: number;
  discount?: number;
};

export type PurchasePayload = {
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  purchaser?: string;
  /** Logged-in creator display name */
  createdByName?: string;
  /** PIN-verified billing staff (Bill By) */
  billBy?: string;
  invoiceBy?: {
    staffId?: string;
    staffName?: string;
    employeeId?: string;
    email?: string;
  };
  phoneNumber?: string;
  vendorDate: string;
  amount: number;
  /** Bill-level manual discount value (₹ if flat, % if percentage) */
  manualDiscount?: number;
  /** How to interpret manualDiscount */
  manualDiscountType?: "flat" | "percentage";
  paymentMode?: "Cash" | "UPI" | "Card" | "Bank" | "Credit" | "Other";
  /** cash = settled at checkout; credit = outstanding due */
  purchaseType?: "cash" | "credit";
  status?: "draft" | "pending" | "paid" | "partial" | "cancelled" | "due";
  paidAmount?: number;
  dueAmount?: number;
  items?: PurchaseItemPayload[];
  notes?: string;
  attachments?: string[];
};

export function purchasePayloadToFormData(
  payload: Partial<PurchasePayload>,
  attachmentFiles?: File[],
) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (key === "items" || key === "invoiceBy") {
      fd.append(key, JSON.stringify(value));
      continue;
    }
    fd.append(key, String(value));
  }
  if (attachmentFiles) {
    attachmentFiles.forEach((file) => {
      fd.append("attachments", file);
    });
  }
  return fd;
}

export type PurchaseReturnPayload = PurchasePayload;

export const handleGetPurchases = async (
  signal?: AbortSignal,
  fromDate = "",
  toDate = "",
  limit = 2000,
) => {
  const response = await axiosInstance.get("/purchase", {
    params: {
      limit,
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
    },
    signal,
  });
  return response.data;
};

export const handleGetPurchaseById = async (id: string, signal?: AbortSignal) => {
  const response = await axiosInstance.get(`/purchase/${id}`, { signal });
  return response.data;
};

export const handleCreatePurchase = async (payload: PurchasePayload | FormData) => {
  const response = await axiosInstance.post("/purchase", payload, payload instanceof FormData ? {
    headers: { "Content-Type": "multipart/form-data" }
  } : undefined);
  return response.data;
};

export const handleUpdatePurchase = async (
  id: string,
  payload: Partial<PurchasePayload> | FormData,
) => {
  const response = await axiosInstance.patch(`/purchase/${id}`, payload, payload instanceof FormData ? {
    headers: { "Content-Type": "multipart/form-data" }
  } : undefined);
  return response.data;
};

export const handleDeletePurchase = async (id: string) => {
  const response = await axiosInstance.delete(`/purchase/${id}`);
  return response.data;
};

export const handleGetPurchaseReturns = async (signal?: AbortSignal) => {
  const response = await axiosInstance.get("/purchaseReturn", { signal });
  return response.data;
};

export const handleGetPurchaseReturnById = async (id: string, signal?: AbortSignal) => {
  const response = await axiosInstance.get(`/purchaseReturn/${id}`, { signal });
  return response.data;
};

export const handleCreatePurchaseReturn = async (payload: PurchaseReturnPayload) => {
  const response = await axiosInstance.post("/purchaseReturn", payload);
  return response.data;
};

export const handleUpdatePurchaseReturn = async (
  id: string,
  payload: Partial<PurchaseReturnPayload>,
) => {
  const response = await axiosInstance.patch(`/purchaseReturn/${id}`, payload);
  return response.data;
};

export const handleDeletePurchaseReturn = async (id: string) => {
  const response = await axiosInstance.delete(`/purchaseReturn/${id}`);
  return response.data;
};

export type InventorySummary = {
  lowStock: { items: number; qty: number };
  positiveStock: { items: number; qty: number };
  stockValueSalesPrice: number;
  stockValuePurchasePrice: number;
};

export type InventoryItem = {
  id: number;
  item: string;
  qty: number;
  purchase_price: string;
  sale_price: string;
  last_updated: string;
};

export const handleGetInventories = async (signal?: AbortSignal) => {
  const response = await axiosInstance.get("/inventory", { signal });
  return response.data as {
    success: boolean;
    message: string;
    inventories: InventoryItem[];
    summary: InventorySummary;
  };
};
export type PurchaseOrderPayload = {
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  vendorDate: string;
  amount: number;
  phoneNumber?: string;
  paymentMode?: "Cash" | "UPI" | "Card" | "Bank" | "Credit" | "Other";
  status?: "draft" | "pending" | "paid" | "partial" | "cancelled";
  items?: PurchaseItemPayload[];
  notes?: string;
  attachments?: string[];
  purchaser?: string;
};

export const handleGetPurchasesOrder = async (signal?: AbortSignal) => {
  const response = await axiosInstance.get("/purchaseOrder", { signal });
  return response.data;
};

export const handleGetPurchaseOrderById = async (id: string, signal?: AbortSignal) => {
  const response = await axiosInstance.get(`/purchaseOrder/${id}`, { signal });
  return response.data;
};

export const handleCreatePurchaseOrder = async (payload: PurchasePayload | FormData) => {
  const response = await axiosInstance.post("/purchaseOrder", payload, payload instanceof FormData ? {
    headers: { "Content-Type": "multipart/form-data" }
  } : undefined);
  return response.data;
};

export const handleUpdatePurchaseOrder = async (
  id: string,
  payload: Partial<PurchasePayload> | FormData,
) => {
  const response = await axiosInstance.patch(`/purchaseOrder/${id}`, payload, payload instanceof FormData ? {
    headers: { "Content-Type": "multipart/form-data" }
  } : undefined);
  return response.data;
};

export const handleDeletePurchaseOrder = async (id: string) => {
  const response = await axiosInstance.delete(`/purchaseOrder/${id}`);
  return response.data;
};

export type VendorPayload = {
  name: string;
  mobile: string;
  email?: string;
  gstin?: string;
  companyName?: string;
  address?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  openingBalance?: number;
  debitLimit?: number;
  defaultDueDays?: number;
  closingBalance?: number;
  netBalance?: number;
  notes?: string;
  adharNumber?: string;
  dob?: string;
  gender?: string;
  whatsappNumber?: string;
  AlternateMobile?: string;
  IFSCcode?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  panNumber?: string;
  accountHolderName?: string;
  UPIID?: string;
};

export type VendorImportRow = {
  name: string;
  mobile: string;
  email?: string;
  companyName?: string;
  gstin?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  openingBalance?: number;
  debitLimit?: number;
  defaultDueDays?: number;
  netBalance?: number;
  closingBalance?: number;
  notes?: string;
};

export const handleGetVendors = async (signal?: AbortSignal) => {
  const response = await axiosInstance.get("/vendor", { signal });
  return response.data;
};

export const handleGetVendorById = async (id: string, signal?: AbortSignal) => {
  const response = await axiosInstance.get(`/vendor/${id}`, { signal });
  return response.data;
};

export const handleCreateVendor = async (payload: VendorPayload) => {
  const response = await axiosInstance.post("/vendor", payload);
  return response.data;
};

export const handleUpdateVendor = async (id: string, payload: Partial<VendorPayload>) => {
  const response = await axiosInstance.patch(`/vendor/${id}`, payload);
  return response.data;
};

export const handleDeleteVendor = async (id: string) => {
  const response = await axiosInstance.delete(`/vendor/${id}`);
  return response.data;
};

export const handleImportVendors = async (vendors: VendorImportRow[]) => {
  const response = await axiosInstance.post("/vendor/import", { vendors });
  return response.data;
};

export type CspEnrollment = {
  _id: string;
  customerId?: string | { _id?: string; name?: string; mobile?: string };
  vendorId?: string | { _id?: string; name?: string; mobile?: string };
  status?: "active" | "inactive";
  sailorSharePercent?: number;
  platformSharePercent?: number;
  displayName?: string;
  mobile?: string;
  label?: string;
  customer?: { _id?: string; name?: string; mobile?: string; email?: string };
  vendor?: { _id?: string; name?: string; mobile?: string };
  /** CSP earnings eligible for withdrawal (wallet withdrawable bucket) */
  withdrawable?: number;
  withdrawableBalance?: number;
  affiliateBalance?: number;
  nonWithdrawable?: number;
  walletAmount?: number;
};

export const handleGetCspEnrollments = async (params?: {
  status?: string;
  search?: string;
}) => {
  const response = await axiosInstance.get("/csp", {
    params: {
      status: params?.status ?? "active",
      search: params?.search ?? "",
    },
  });
  return response.data as {
    success: boolean;
    enrollments?: CspEnrollment[];
    csps?: CspEnrollment[];
    message?: string;
  };
};

export const handleEnrollCsp = async (payload: {
  customerId?: string;
  vendorId?: string;
  name?: string;
  mobile?: string;
  email?: string;
  companyName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  sailorSharePercent?: number;
  platformSharePercent?: number;
}) => {
  const response = await axiosInstance.post("/csp/enroll", payload);
  return response.data as {
    success: boolean;
    enrollment?: CspEnrollment;
    message?: string;
  };
};

export const handleUpdateCsp = async (
  id: string,
  payload: {
    status?: "active" | "inactive";
    sailorSharePercent?: number;
    platformSharePercent?: number;
    displayName?: string;
    mobile?: string;
  },
) => {
  const response = await axiosInstance.patch(`/csp/${id}`, payload);
  return response.data as {
    success: boolean;
    enrollment?: CspEnrollment;
    message?: string;
  };
};

export const handleGetCspProducts = async (cspEnrollmentId: string) => {
  const response = await axiosInstance.get("/product", {
    params: { cspEnrollmentId, limit: 2000 },
  });
  return response.data as {
    success?: boolean;
    products?: any[];
    data?: any[];
    total?: number;
  };
};

export type GetProductsParams = {
  search?: string;
  type?: "product" | "service";
  page?: number;
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  includeStats?: boolean;
  signal?: AbortSignal;
};

/**
 * Fetch products. Supports legacy (search, signal, type) and options object
 * for server-side pagination / search / sort.
 */
export const handleGetProducts = async (
  searchOrParams: string | GetProductsParams = "",
  signal?: AbortSignal,
  type?: "product" | "service",
) => {
  try {
    const params: GetProductsParams =
      typeof searchOrParams === "object" && searchOrParams !== null
        ? searchOrParams
        : { search: searchOrParams, signal, type };

    const response = await axiosInstance.get("/product", {
      params: {
        search: String(params.search || "").trim(),
        ...(params.type ? { type: params.type } : {}),
        ...(params.page != null ? { page: params.page } : {}),
        ...(params.limit != null ? { limit: params.limit } : {}),
        ...(params.skip != null ? { skip: params.skip } : {}),
        ...(params.sortBy ? { sortBy: params.sortBy } : {}),
        ...(params.sortDir ? { sortDir: params.sortDir } : {}),
        ...(params.includeStats ? { includeStats: 1 } : {}),
      },
      signal: params.signal ?? signal,
    });
    return response.data;
  } catch (error) {
    console.log("Error fetching products:", error);
    throw error;
  }
};

export const handleGetServices = async (search = "", signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/services", {
      params: { search: search.trim() },
      signal,
    });
    return response.data;
  } catch (error) {
    console.log("Error fetching services:", error);
    throw error;
  }
};

export const handleCreateService = async (formData: FormData) => {
  try {
    formData.set("type", "service");
    const response = await axiosInstance.post("/services", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.log("Error creating service:", error);
    throw error;
  }
};

export const handleUpdateService = async (id: string, formData: FormData) => {
  try {
    formData.set("type", "service");
    const response = await axiosInstance.patch(`/services/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.log("Error updating service:", error);
    throw error;
  }
};

export const handleDeleteService = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/services/${id}`);
    return response.data;
  } catch (error) {
    console.log("Error deleting service:", error);
    throw error;
  }
};

export type CatalogueLookupItem = {
  _id: string;
  sourceId: string;
  sourceType: "product" | "service" | "space" | "food";
  name: string;
  productName: string;
  /** Present when this row is a product variant line */
  variantName?: string | null;
  /** Parent product name when row is a variant */
  parentProductName?: string | null;
  sellingPrice: number;
  /** Cost / buy price — used by Create Purchase Quick Select */
  purchasePrice?: number;
  stockQty: number | null;
  trackStock: boolean;
  category: string;
  lineCategory: string;
  imageUrl?: string | null;
  unit?: string;
  discountType?: string;
  discountValue?: number;
  status?: string;
  capacity?: number;
  isVeg?: boolean;
  isCsp?: boolean;
  cspLabel?: string | null;
  barcode?: string;
};

export const handleCatalogueLookup = async (
  search = "",
  signal?: AbortSignal,
  options: {
    limit?: number;
    page?: number;
    sourceType?: "all" | "product" | "service" | "space" | "food" | string;
  } = {},
) => {
  const limit = options.limit ?? 48;
  const page = options.page ?? 1;
  const sourceType = options.sourceType ?? "all";
  const response = await axiosInstance.get("/catalogue/lookup", {
    params: {
      search: search.trim(),
      limit,
      page,
      sourceType,
    },
    signal,
  });
  return response.data as {
    success: boolean;
    message?: string;
    items: CatalogueLookupItem[];
    counts?: Record<string, number>;
    pagination?: {
      page: number;
      limit: number;
      skip: number;
      hasMore: boolean;
      total: number;
      sourceType: string;
    };
  };
};

export const handleCreateProduct = async (formData: FormData) => {
  try {
    const response = await axiosInstance.post("/product", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.log("Error creating product:", error);
    throw error;
  }
};

export type ProductBulkUploadRow = {
  productName: string;
  variant?: string;
  category?: string;
  barcode?: string;
  barCode?: string;
  sellingPrice: number;
  unitPrice?: number;
  itemCode?: string;
  stockQty?: number;
  qty?: number;
  purchasePrice?: number;
  variants?: Array<{
    name: string;
    sellingPrice: number;
    purchasePrice: number;
    barcode?: string;
  }>;
};

export const handleBulkUploadProducts = async (
  products: ProductBulkUploadRow[],
) => {
  try {
    const response = await axiosInstance.post("/product/bulkUpload", {
      products,
    });
    return response.data;
  } catch (error) {
    console.log("Error bulk uploading products:", error);
    throw error;
  }
};

export const handleBulkUpload=async(formData:FormData)=>{
  try {
    const response = await axiosInstance.post("/product/bulkUpload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.log("Error creating product:", error);
    throw error;
  }
}

export const handleUpdateProduct = async (id: string, formData: FormData) => {
  try {
    const response = await axiosInstance.patch(`/product/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.log("Error updating product:", error);
    throw error;
  }
};

export const handleDeleteProduct = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/product/${id}`);
    return response.data;
  } catch (error) {
    console.log("Error deleting product:", error);
    throw error;
  }
};

export const handleGetCategories = async (signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/api/categories", { signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching categories:", error);
    throw error;
  }
};

export const handleCreateCategories = async (payload: { categories: Array<{ name: string }> }) => {
  try {
    const response = await axiosInstance.post("/api/categories", payload);
    return response.data;
  } catch (error) {
    console.log("Error creating categories:", error);
    throw error;
  }
};

export const handleGetSubCategories = async (signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/api/subCategories", { signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching sub categories:", error);
    throw error;
  }
};

export const handleCreateSubCategory = async (payload: { name: string; categoryId: string }) => {
  try {
    const response = await axiosInstance.post("/api/subCategories", payload);
    return response.data;
  } catch (error) {
    console.log("Error creating sub category:", error);
    throw error;
  }
};

export const handleUpdateCategory = async (id: string, name: string) => {
  try {
    const response = await axiosInstance.patch("/api/categories", {
      categories: [{ _id: id, name }]
    });
    return response.data;
  } catch (error) {
    console.log("Error updating category:", error);
    throw error;
  }
};

export const handleDeleteCategory = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/api/categories/${id}`);
    return response.data;
  } catch (error) {
    console.log("Error deleting category:", error);
    throw error;
  }
};

export const handleUpdateSubCategory = async (id: string, name: string, categoryId?: string) => {
  try {
    const response = await axiosInstance.patch(`/api/subCategories/${id}`, { name, categoryId });
    return response.data;
  } catch (error) {
    console.log("Error updating subcategory:", error);
    throw error;
  }
};

export const handleDeleteSubCategory = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/api/subCategories/${id}`);
    return response.data;
  } catch (error) {
    console.log("Error deleting subcategory:", error);
    throw error;
  }
};

export const handleGetMyCompanies = async (signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/company", { signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching companies:", error);
    throw error;
  }
};

export const handleCreateCompany = async (payload: { name: string; branch: string; logo?: string }) => {
  try {
    const response = await axiosInstance.post("/company", payload);
    return response.data;
  } catch (error) {
    console.log("Error creating company:", error);
    throw error;
  }
};

export const handleSwitchCompany = async (companyId: string) => {
  try {
    const response = await axiosInstance.patch("/company/switch", { companyId });
    return response.data;
  } catch (error) {
    console.log("Error switching company:", error);
    throw error;
  }
};

export const handleGetAffiliateSettings = async (signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/affiliate/settings", { signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching affiliate settings:", error);
    throw error;
  }
};

export const handleUpdateAffiliateSettings = async (payload: any) => {
  try {
    const response = await axiosInstance.put("/affiliate/settings", payload);
    return response.data;
  } catch (error) {
    console.log("Error updating affiliate settings:", error);
    throw error;
  }
};

export const handleGetAffiliateOverview = async (signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/affiliate/overview", { signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching affiliate overview:", error);
    throw error;
  }
};

export const handleGetAffiliateLeaderboard = async (signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/affiliate/leaderboard", { signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching affiliate leaderboard:", error);
    throw error;
  }
};

export const handleGetAffiliateWalletSummary = async (signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/affiliate/wallet-summary", { signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching wallet summary:", error);
    throw error;
  }
};

export const handleGetAffiliatesList = async (params?: Record<string, string>, signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/affiliate/list", { params, signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching affiliates list:", error);
    throw error;
  }
};

export const handleGetAffiliateById = async (id: string, signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get(`/affiliate/affiliates/${id}`, { signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching affiliate detail:", error);
    throw error;
  }
};

export const handleGetPayoutsList = async (params?: Record<string, string>, signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/affiliate/payouts", { params, signal });
    return response.data;
  } catch (error) {
    console.log("Error fetching payouts list:", error);
    throw error;
  }
};

export const handleCreateManualPayout = async (payload: any) => {
  try {
    const response = await axiosInstance.post("/affiliate/payouts/manual", payload);
    return response.data;
  } catch (error) {
    console.log("Error creating manual payout:", error);
    throw error;
  }
};

export const handleUpdatePayoutStatus = async (id: string, payload: any) => {
  try {
    const response = await axiosInstance.put(`/affiliate/payouts/${id}`, payload);
    return response.data;
  } catch (error) {
    console.log("Error updating payout status:", error);
    throw error;
  }
};

/* ——— Access Control (RBAC Step 10) ——— */

export type AccessRole = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  permissions?: string[];
  permissionCount?: number;
  isSystem?: boolean;
  isActive?: boolean;
};

export type AccessStaffRow = {
  _id: string;
  m_staff_id?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  legacyRole?: string;
  pinEnabled?: boolean;
  pinSet?: boolean;
  /** true when encrypted PIN exists and View PIN can reveal it */
  pinViewable?: boolean;
  role?: {
    id: string;
    name: string;
    slug: string;
    isSystem?: boolean;
    permissionCount?: number;
  } | null;
  permissionCount?: number;
  createdAt?: string;
};

export const handleGetAccessRoles = async (signal?: AbortSignal) => {
  const response = await axiosInstance.get("/access/roles", { signal });
  return response.data;
};

export const handleGetAccessStaff = async (
  search = "",
  signal?: AbortSignal,
) => {
  const response = await axiosInstance.get("/access/staff", {
    params: search ? { search } : undefined,
    signal,
  });
  return response.data;
};

export const handleAssignStaffRole = async (
  staffId: string,
  roleId: string | null,
) => {
  const response = await axiosInstance.patch(`/access/staff/${staffId}/role`, {
    roleId,
  });
  return response.data;
};

export const handleUpdateAccessRole = async (
  roleId: string,
  payload: { name?: string; description?: string; permissions?: string[] },
) => {
  const response = await axiosInstance.patch(`/access/roles/${roleId}`, payload);
  return response.data;
};

export const handleCreateAccessStaff = async (payload: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  roleId?: string | null;
}) => {
  const response = await axiosInstance.post("/access/staff", payload);
  return response.data;
};

export const handleUpdateAccessStaff = async (
  staffId: string,
  payload: {
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    roleId?: string | null;
  },
) => {
  const response = await axiosInstance.patch(`/access/staff/${staffId}`, payload);
  return response.data;
};

export const handleDeleteAccessStaff = async (staffId: string) => {
  const response = await axiosInstance.delete(`/access/staff/${staffId}`);
  return response.data;
};

export const handleBulkCreateSubscriptions = async (payload: { subscriptions: any[] }) => {
  try {
    const response = await axiosInstance.post("/subscriptions/bulk", payload);
    return response.data;
  } catch (error) {
    console.error("Error bulk uploading subscriptions:", error);
    throw error;
  }
};

export type CreateAnnouncementPayload = {
  templateName: string;
  audienceType: "all" | "selected";
  selectedCustomerIds?: string[];
  whatsappTemplateName: string;
  languageCode?: string;
  templateParams?: string[];
  /** Public HTTPS image URL — required for Meta IMAGE-header templates */
  headerImageLink?: string;
};

export const handleGetAnnouncements = async (signal?: AbortSignal) => {
  const response = await axiosInstance.get("/api/announcement", { signal });
  return response.data;
};

export const handleCreateAnnouncement = async (
  payload: CreateAnnouncementPayload,
) => {
  const response = await axiosInstance.post("/api/announcement", payload);
  return response.data;
};
