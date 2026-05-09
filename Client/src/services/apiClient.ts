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

export const handleUpdateUser = async (mobile: string, payload: any) => {
  try {
    const response = await axiosInstance.patch(`/auth/${mobile}`, payload);
    return response.data;
  } catch (error) {
    console.log("Error updating user:", error);
    throw error;
  }
};

export type CreateInvoiceItemPayload = {
  productName: string;
  qty: number;
  unitPrice: number;
  discount: number;
};

export type CreateInvoicePayload = {
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  dueDate: string;
  salesPersonName: string;
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
  pendingAmount?: number;
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


export type ReturnSaleItemPayload = CreateInvoiceItemPayload;

export type CreateReturnSalePayload = {
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  dueDate: string;
  salesPersonName: string;
  notes: string;
  items: ReturnSaleItemPayload[];
  subTotal: number;
  discountTotal: number;
  grandTotal: number;
  status?: "draft" | "final" | "cancelled";
  originalInvoiceId?: string | null;
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
) => {
  const response = await axiosInstance.get("/returnsales", {//return sales Api Call 
    params: { search: search.trim(), limit },
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
  repeatType?: "monthly" | "yearly" | "lifetime";
  repeatEvery?: number | null;
  repeatUnit?: "month" | "year" | null;
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
};

export const handleGetSubscriptions = async (
  search = "",
  limit = 100,
  signal?: AbortSignal,
) => {
  const response = await axiosInstance.get("/subscriptions", {
    params: { search: search.trim(), limit },
    signal,
  });
  console.log(response.data);
  return response.data;
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

export type CustomerPayload = {
  name: string;
  mobile: string;
  membershipType?: string|null;
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

  if (profileImageFile) {
    fd.append("profileImage", profileImageFile);
  }

  return fd;
}

export const handleGetCustomers = async (search = "", signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/customer", {
      params: { search: search.trim() },
      signal,
    });
    console.log("Customers:", response.data);
    return response.data;
  } catch (error) {
    console.log("Error fetching customers:", error);
    throw error;
  }
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
  minimumBalance?: number;
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
  params?: { search?: string },
  signal?: AbortSignal,
) => {
  try {
    const response = await axiosInstance.get("/wallet", {
      params: { search: params?.search?.trim() ?? "" },
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
  planId: string;
  displayName: string;
  priority?: number;
  planType?: string;
  description?: string;
  pricing?: {
    period?: string;
    amount?: number;
    taxPercent?: number;
    discountType?: string;
    discountPercent?: number;
  };
  usageLimits?: Record<
    string,
    {
      min?: number;
      max?: number;
    }
  >;
  insightsLevel?: string;
  status?: "Active" | "Inactive";
  internalNotes?: string;
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
  phoneNumber?: string;
  vendorDate: string;
  amount: number;
  paymentMode?: "Cash" | "UPI" | "Card" | "Bank" | "Credit" | "Other";
  status?: "draft" | "pending" | "paid" | "partial" | "cancelled";
  items?: PurchaseItemPayload[];
  notes?: string;
};

export type PurchaseReturnPayload = PurchasePayload;

export const handleGetPurchases = async (signal?: AbortSignal) => {
  const response = await axiosInstance.get("/purchase", { signal });
  return response.data;
};

export const handleGetPurchaseById = async (id: string, signal?: AbortSignal) => {
  const response = await axiosInstance.get(`/purchase/${id}`, { signal });
  return response.data;
};

export const handleCreatePurchase = async (payload: PurchasePayload) => {
  const response = await axiosInstance.post("/purchase", payload);
  return response.data;
};

export const handleUpdatePurchase = async (id: string, payload: Partial<PurchasePayload>) => {
  const response = await axiosInstance.patch(`/purchase/${id}`, payload);
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

export const handleCreatePurchaseOrder = async (payload: PurchasePayload) => {
  const response = await axiosInstance.post("/purchaseOrder", payload);
  return response.data;
};

export const handleUpdatePurchaseOrder = async (id: string, payload: Partial<PurchasePayload>) => {
  const response = await axiosInstance.patch(`/purchaseOrder/${id}`, payload);
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
  city?: string;
  state?: string;
  country?: string;
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
export const handleGetProducts = async (search = "", signal?: AbortSignal) => {
  try {
    const response = await axiosInstance.get("/product", {
      params: { search: search.trim() },
      signal,
    });
    // console.log(response.data); 
    return response.data;
  } catch (error) {
    console.log("Error fetching products:", error);
    throw error;
  }
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
