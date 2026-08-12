import {create} from 'zustand';
import type {Customer} from '../types/auth';

interface AuthState {
  customer: Customer | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (payload: {customer: Customer; token: string}) => void;
  setCustomer: (customer: Customer | null) => void;
  setAccessToken: (token: string | null) => void;
  setLoading: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  customer: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  setSession: ({customer, token}) =>
    set({
      customer,
      accessToken: token,
      isAuthenticated: true,
      isLoading: false,
    }),
  setCustomer: customer =>
    set({
      customer,
      isAuthenticated: Boolean(customer),
    }),
  setAccessToken: token => set({accessToken: token}),
  setLoading: value => set({isLoading: value}),
  logout: () =>
    set({
      customer: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));

