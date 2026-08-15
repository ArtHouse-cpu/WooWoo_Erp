import { useEffect, useState } from "react";
import { Lock, Mail, Phone, User } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import logo from "@/assets/images/logo/woo_woo_art_house_logo.png";
import ButtonComponent from "@/components/ButtonComponent";
import { handleSignup } from "@/services/apiClient";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch } from "@/store/hooks";
import { loginFailure, loginStart, loginSuccess } from "@/store/slices/userSlice";
import { mapAuthUserToReduxPayload } from "@/utils/authUserMapper";

const signupSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email address"),
  mobileNumber: z
    .string()
    .min(10, "Mobile number must be 10 digits")
    .max(10, "Mobile number must be 10 digits")
    .regex(/^[0-9]+$/, "Only digits allowed"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignUpScreen() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    const first = errors.fullName ?? errors.email ?? errors.mobileNumber ?? errors.password;
    if (first?.message) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: first.message,
        confirmButtonText: "OK",
        confirmButtonColor: "#000000",
      });
    }
  }, [errors.fullName, errors.email, errors.mobileNumber, errors.password]);

  const onSubmit = async (data: SignupForm) => {
    try {
      setLoading(true);
      dispatch(loginStart());
      const response = await handleSignup({
        fullName: data.fullName,
        email: data.email,
        mobileDigits10: data.mobileNumber,
        password: data.password,
      });
      if (response.user && response.token) {
        setUser(response.user, response.token);
        dispatch(loginSuccess(mapAuthUserToReduxPayload(response.user)));
        Swal.fire({
          icon: "success",
          title: "Account created",
          text: response.message ?? "You are signed in.",
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
        text: err?.response?.data?.message ?? "Sign up failed. Try again.",
        confirmButtonText: "OK",
        confirmButtonColor: "#000000",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-8 md:grid-cols-2 md:p-10">
        <div className="hidden md:flex items-center justify-center bg-white">
          <img
            src={logo}
            alt="Sign up"
            className="h-[80%] w-auto object-contain"
          />
        </div>

        <div className="flex flex-col justify-center p-2 sm:p-6 md:p-10">
          <h2 className="text-xl md:text-3xl font-bold text-center mb-2">
            Create account
          </h2>

          <p className="text-center text-gray-600 mb-8 text-base">
            Public signup is limited. If registration is disabled, ask an admin
            to create your account from Access Control.
          </p>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div
              className={`flex items-center gap-3 border rounded-xl px-4 py-4 bg-gray-50 transition ${
                errors.fullName ? "border-red-500" : "border-gray-300"
              }`}
            >
              <User className="w-5 h-5 text-gray-500 shrink-0" />
              <input
                type="text"
                placeholder="Full name"
                autoComplete="name"
                className="w-full bg-transparent outline-none text-gray-800"
                {...register("fullName")}
              />
            </div>

            <div
              className={`flex items-center gap-3 border rounded-xl px-4 py-4 bg-gray-50 transition ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
            >
              <Mail className="w-5 h-5 text-gray-500 shrink-0" />
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                className="w-full bg-transparent outline-none text-gray-800"
                {...register("email")}
              />
            </div>

            <div
              className={`flex items-center gap-3 border rounded-xl px-4 py-4 bg-gray-50 transition ${
                errors.mobileNumber ? "border-red-500" : "border-gray-300"
              }`}
            >
              <Phone className="w-5 h-5 text-gray-500 shrink-0" />
              <input
                type="tel"
                placeholder="10-digit mobile number"
                autoComplete="tel"
                className="w-full bg-transparent outline-none text-gray-800"
                {...register("mobileNumber")}
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
                placeholder="Password (min. 8 characters)"
                autoComplete="new-password"
                className="w-full bg-transparent outline-none text-gray-800"
                {...register("password")}
              />
            </div>

            <ButtonComponent
              type="submit"
              title="Sign up"
              loading={loading}
            />

            <p className="text-center text-gray-600 text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-black font-semibold hover:underline"
              >
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
