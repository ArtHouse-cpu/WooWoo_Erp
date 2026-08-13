import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import {
  forceLogout,
  isNonSessionAuthFailure,
  isPublicAuthRequest,
  isTokenExpired,
} from "@/utils/session";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://woo-woo-erp.vercel.app/",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  // Proactive logout if JWT already past exp (before hitting API)
  if (token && isTokenExpired(token) && !isPublicAuthRequest(config.url || "")) {
    forceLogout({ reason: "expired" });
    return Promise.reject(new Error("Session expired"));
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || "");
    const message = String(error?.response?.data?.message || "").toLowerCase();

    // Wrong Staff PIN (and similar) must stay in-app — do not clear the ERP session.
    if (isNonSessionAuthFailure(url)) {
      return Promise.reject(error);
    }

    const looksLikeExpiredToken =
      status === 401 &&
      !isPublicAuthRequest(url) &&
      Boolean(useAuthStore.getState().token) &&
      (message.includes("expired") ||
        message.includes("unauthorized") ||
        message.includes("token") ||
        message.includes("jwt") ||
        message.includes("session"));

    // Only force-logout on real session/auth failures — not every 401 business error.
    if (
      looksLikeExpiredToken ||
      (status === 401 &&
        !isPublicAuthRequest(url) &&
        Boolean(useAuthStore.getState().token) &&
        !message.includes("staff pin") &&
        !message.includes("pin"))
    ) {
      forceLogout({
        reason: message.includes("expired") ? "expired" : "unauthorized",
      });
    }

    return Promise.reject(error);
  },
);
