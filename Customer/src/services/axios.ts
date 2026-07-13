import axios, {type AxiosError, type InternalAxiosRequestConfig} from 'axios';
import {useAuthStore} from '../store/authStore';
import type {ApiResponse} from '../types/auth';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/customer`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

const flushQueue = (error: unknown, token: string | null = null) => {
  pendingQueue.forEach(promise => {
    if (error) promise.reject(error);
    else promise.resolve(token);
  });
  pendingQueue = [];
};

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (original.url?.includes('/refresh-token') || original.url?.includes('/login')) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: token => {
            if (token) original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const {data} = await api.post<ApiResponse>('/refresh-token');
      const token = data.token || null;
      if (token && data.data) {
        useAuthStore.getState().setSession({
          customer: data.data as never,
          token,
        });
      } else if (token) {
        useAuthStore.getState().setAccessToken(token);
      }
      flushQueue(null, token);
      if (token) original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong') => {
  if (axios.isAxiosError<ApiResponse>(error)) {
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};
