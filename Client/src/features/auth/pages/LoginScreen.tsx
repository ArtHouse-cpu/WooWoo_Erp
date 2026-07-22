import { useEffect, useState } from "react";
import { Lock, Mail, Phone } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import logo from "@/assets/images/logo/woo_woo_art_house_logo.png";
import ButtonComponent from "@/components/ButtonComponent";
import { handleLogin, handleRequestEmailOtp, handleResetPassword } from "@/services/apiClient";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch } from "@/store/hooks";
import {
  loginFailure,
  loginStart,
  loginSuccess,
} from "@/store/slices/userSlice";

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your email or 10-digit phone number"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const first = errors.identifier ?? errors.password;
    if (first?.message) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: first.message,
        confirmButtonText: "OK",
        confirmButtonColor: "#000000",
      });
    }
  }, [errors.identifier, errors.password]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      dispatch(loginStart());
      const response = await handleLogin({
        identifier: data.identifier,
        password: data.password,
      });
      if (response.user && response.token) {
        setUser(response.user, response.token);
        dispatch(
          loginSuccess({
            m_staff_id: response.user.m_staff_id,
            m_staff_name: response.user.fullName,
            m_staff_mobile: response.user.phoneNumber,
            m_staff_email: response.user.email,
            m_staff_role: response.user.role,
            alternateMobile: response.user.AlternateMobile,
            whatsappNumber: response.user.whatsappNumber,
            address: response.user.address,
            city: response.user.city,
            state: response.user.state,
            country: response.user.country,
            pincode: response.user.pincode,
            companyName: response.user.companyName,
            gstin: response.user.gstin,
            adharNumber: response.user.adharNumber,
            gender: response.user.gender,
            dob: response.user.dob,
            membershipType: response.user.membershipType,
            createdAt: response.user.createdAt,
          }),
        );
        Swal.fire({
          icon: "success",
          title: "Welcome back",
          text: response.message ?? "Logged in successfully.",
          showConfirmButton: false,
          timer: 1200,
          timerProgressBar: true,
        }).then(() => navigate("/", { replace: true }));
      }
    } catch (error: unknown) {
      dispatch(loginFailure());
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: err?.response?.data?.message ?? "Login failed. Try again.",
        confirmButtonText: "OK",
        confirmButtonColor: "#000000",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRequestOtp = async () => {
    if (!forgotEmail.trim()) {
      Swal.fire({ icon: "error", title: "Oops...", text: "Please enter your email." });
      return;
    }
    try {
      setForgotLoading(true);
      const res = await handleRequestEmailOtp(forgotEmail);
      if (res.success) {
        Swal.fire({ icon: "success", title: "OTP Sent", text: "Please check your email for the OTP.", timer: 1500, showConfirmButton: false });
        setForgotStep("otp");
      }
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Oops...", text: error?.response?.data?.message || "Failed to send OTP." });
    } finally {
      setForgotLoading(false);
    }
  };

  const onResetPassword = async () => {
    if (!forgotOtp.trim() || !newPassword.trim()) {
      Swal.fire({ icon: "error", title: "Oops...", text: "Please enter OTP and new password." });
      return;
    }
    if (newPassword.length < 8) {
      Swal.fire({ icon: "error", title: "Oops...", text: "Password must be at least 8 characters." });
      return;
    }
    try {
      setForgotLoading(true);
      const res = await handleResetPassword({
        identifier: forgotEmail,
        otp: forgotOtp,
        newPassword: newPassword,
      });
      if (res.success) {
        Swal.fire({ icon: "success", title: "Success", text: "Password reset successfully.", timer: 1500, showConfirmButton: false });
        setShowForgot(false);
        setForgotStep("email");
        setForgotEmail("");
        setForgotOtp("");
        setNewPassword("");
      }
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Oops...", text: error?.response?.data?.message || "Failed to reset password." });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-5xl bg-white shadow-sm rounded-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden p-12">
        <div className="hidden md:flex items-center justify-center bg-white">
          <img
            src={logo}
            alt="Login"
            className="h-[80%] w-auto object-contain"
          />
        </div>

        <div className="p-10 flex flex-col justify-center">
          <h2 className="text-xl md:text-3xl font-bold text-center mb-2">
            Login
          </h2>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div
              className={`flex items-center gap-3 border rounded-xl px-4 py-4 bg-gray-50 transition ${
                errors.identifier ? "border-red-500" : "border-gray-300"
              }`}
            >
              <div className="flex items-center gap-1 shrink-0 text-gray-500">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Email or 10-digit mobile number"
                autoComplete="username"
                className="w-full bg-transparent outline-none text-gray-800"
                {...register("identifier")}
              />
            </div>

            <div
              className={`flex items-center gap-3 border rounded-xl px-4 py-4 bg-gray-50 transition ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
            >
              <Lock className="w-5 h-5 text-gray-500 shrink-0" />
              <input
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                className="w-full bg-transparent outline-none text-gray-800"
                {...register("password")}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForgot(true);
                  setForgotStep("email");
                  setForgotEmail("");
                  setForgotOtp("");
                  setNewPassword("");
                }}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <ButtonComponent type="submit" title="Log in" loading={loading} />
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Forgot Password
            </h3>
            {forgotStep === "email" ? (
              <>
                <p className="text-sm text-gray-500 mb-6">
                  Enter your email address to receive an OTP.
                </p>
                <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 mb-6">
                  <Mail className="w-5 h-5 text-gray-500 shrink-0" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-transparent outline-none text-gray-800"
                  />
                </div>
                <div className="flex gap-3">
                  <ButtonComponent
                    title="Cancel"
                    onClick={() => setShowForgot(false)}
                    // variant="outline"
                  />
                  <ButtonComponent
                    title="Send OTP"
                    loading={forgotLoading}
                    onClick={onRequestOtp}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-6">
                  Enter the OTP sent to {forgotEmail} and your new password.
                </p>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      className="w-full bg-transparent outline-none text-gray-800 tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  <div className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
                    <Lock className="w-5 h-5 text-gray-500 shrink-0" />
                    <input
                      type="password"
                      placeholder="New Password (min 8 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-transparent outline-none text-gray-800"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <ButtonComponent
                    title="Cancel"
                    onClick={() => setShowForgot(false)}
                    // variant="outline"
                  />
                  <ButtonComponent
                    title="Reset Password"
                    loading={forgotLoading}
                    onClick={onResetPassword}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
