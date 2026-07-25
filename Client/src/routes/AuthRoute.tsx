import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginSuccess } from "@/store/slices/userSlice";
import { mapAuthUserToReduxPayload } from "@/utils/authUserMapper";
import {
  forceLogout,
  getTokenExpiryMs,
  isTokenExpired,
} from "@/utils/session";
import DashboardLayout from "@/layouts/DashboardLayout";

/**
 * Auth gate: requires a JWT in Zustand.
 * Re-hydrates Redux once after refresh when staff id is missing.
 * Also logs out immediately / on timer when the JWT expires.
 */
export default function AuthRoute() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const dispatch = useAppDispatch();
  const reduxStaffId = useAppSelector((s) => s.user.m_staff_id);

  useEffect(() => {
    if (!token || !user) return;
    if (reduxStaffId) return;
    dispatch(loginSuccess(mapAuthUserToReduxPayload(user)));
  }, [token, user, reduxStaffId, dispatch]);

  useEffect(() => {
    if (!token) return;

    if (isTokenExpired(token)) {
      forceLogout({ reason: "expired" });
      return;
    }

    const expMs = getTokenExpiryMs(token);
    if (expMs == null) return;

    const delay = Math.max(expMs - Date.now() - 5_000, 0);
    const timer = window.setTimeout(() => {
      forceLogout({ reason: "expired" });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [token]);

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
}
