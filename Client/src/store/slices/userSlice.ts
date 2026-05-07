import {createSlice, type PayloadAction} from "@reduxjs/toolkit";

const normalizeAccessModules = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((v): v is string => typeof v === "string")
        : [];
    } catch {
      return [];
    }
  }

  return [];
};

export type UserState = {
  m_staff_id: string | null;
  m_staff_name: string | null;
  m_staff_mobile: string | null;
  m_staff_email: string | null;
  m_staff_role: string | null;
  m_staff_branch: string | null;
  access_module: string[];
  alternateMobile: string | null;
  whatsappNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  companyName: string | null;
  gstin: string | null;
  adharNumber: string | null;
  gender: string | null;
  dob: string | null;
  membershipType: string | null;
  createdAt: string | null;
  loading: boolean;
  error: boolean;
};

type LoginPayload = {
  m_staff_id?: string | null;
  m_staff_name?: string | null;
  m_staff_mobile?: string | null;
  m_staff_email?: string | null;
  m_staff_role?: string | null;
  m_staff_branch?: string | null;
  access_module?: unknown;
  alternateMobile?: string | null;
  whatsappNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  companyName?: string | null;
  gstin?: string | null;
  adharNumber?: string | null;
  gender?: string | null;
  dob?: string | null;
  membershipType?: string | null;
  createdAt?: string | null;
};

const initialState: UserState = {
  m_staff_id: null,
  m_staff_name: null,
  m_staff_mobile: null,
  m_staff_email: null,
  m_staff_role: null,
  m_staff_branch: null,
  access_module: [],
  alternateMobile: null,
  whatsappNumber: null,
  address: null,
  city: null,
  state: null,
  country: null,
  pincode: null,
  companyName: null,
  gstin: null,
  adharNumber: null,
  gender: null,
  dob: null,
  membershipType: null,
  createdAt: null,
  loading: false,
  error: false,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = false;
    },
    loginSuccess: (state, action: PayloadAction<LoginPayload>) => {
      state.loading = false;
      state.error = false;
      state.m_staff_id = action.payload.m_staff_id ?? null;
      state.m_staff_name = action.payload.m_staff_name ?? null;
      state.m_staff_mobile = action.payload.m_staff_mobile ?? null;
      state.m_staff_email = action.payload.m_staff_email ?? null;
      state.m_staff_role = action.payload.m_staff_role ?? null;
      state.access_module = normalizeAccessModules(action.payload.access_module);
      state.m_staff_branch = action.payload.m_staff_branch ?? null;
      state.alternateMobile = action.payload.alternateMobile ?? null;
      state.whatsappNumber = action.payload.whatsappNumber ?? null;
      state.address = action.payload.address ?? null;
      state.city = action.payload.city ?? null;
      state.state = action.payload.state ?? null;
      state.country = action.payload.country ?? null;
      state.pincode = action.payload.pincode ?? null;
      state.companyName = action.payload.companyName ?? null;
      state.gstin = action.payload.gstin ?? null;
      state.adharNumber = action.payload.adharNumber ?? null;
      state.gender = action.payload.gender ?? null;
      state.dob = action.payload.dob ?? null;
      state.membershipType = action.payload.membershipType ?? null;
      state.createdAt = action.payload.createdAt ?? null;
    },
    loginFailure: (state) => {
      state.loading = false;
      state.error = true;
    },
    logout: (state) => {
      state.m_staff_id = null;
      state.m_staff_name = null;
      state.m_staff_mobile = null;
      state.m_staff_email = null;
      state.m_staff_role = null;
      state.access_module = [];
      state.m_staff_branch = null;
      state.alternateMobile = null;
      state.whatsappNumber = null;
      state.address = null;
      state.city = null;
      state.state = null;
      state.country = null;
      state.pincode = null;
      state.companyName = null;
      state.gstin = null;
      state.adharNumber = null;
      state.gender = null;
      state.dob = null;
      state.membershipType = null;
      state.createdAt = null;
      state.loading = false;
      state.error = false;
    },
  },
});

export const {loginStart, loginSuccess, loginFailure, logout} = userSlice.actions;
export default userSlice.reducer;
