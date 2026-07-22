import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginSuccess } from "@/store/slices/userSlice";
import { mapAuthUserToReduxPayload } from "@/utils/authUserMapper";
import DashboardLayout from "@/layouts/DashboardLayout";

/**
 * Auth gate: requires a JWT in Zustand.
 * Re-hydrates Redux once after refresh when staff id is missing.
 */
export default function AuthRoute() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const dispatch = useAppDispatch();
  const reduxStaffId = useAppSelector((s) => s.user.m_staff_id);

  useEffect(() => {
    if (!token || !user) return;
    // Only hydrate when Redux is empty — never loop on empty permissions
    if (reduxStaffId) return;
    dispatch(loginSuccess(mapAuthUserToReduxPayload(user)));
  }, [token, user, reduxStaffId, dispatch]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
}
