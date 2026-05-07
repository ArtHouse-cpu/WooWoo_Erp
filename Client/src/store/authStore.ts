import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  _id: string;
  fullName?: string;
  email: string;
  phoneNumber: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      setUser: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "auth-storage",
    }
  )
);
