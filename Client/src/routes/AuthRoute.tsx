import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function AuthRoute() {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
}
