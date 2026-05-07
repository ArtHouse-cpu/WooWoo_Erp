import axios from "axios";
import { useAuthStore } from "@/store/authStore";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://woo-woo-erp.vercel.app/",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});