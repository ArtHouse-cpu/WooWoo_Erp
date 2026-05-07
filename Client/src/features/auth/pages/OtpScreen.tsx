import React, { useEffect, useState } from "react";
import ButtonComponent from "@/components/ButtonComponent";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { handleVerifyOtp } from "@/services/apiClient";
import { useAuthStore } from "@/store/authStore";

export default function OtpScreen() {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const location = useLocation();
  const mobileNumber = location.state?.mobileNumber as string | undefined;
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!mobileNumber) {
      navigate("/login", { replace: true });
    }
  }, [mobileNumber, navigate]);
  // Handle OTP input change
  const handleChange = (value: string, index: number) => {
    if (!/^\d$/.test(value)) return; // allow only single digit
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (index < otp.length - 1) {
      (
        document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null
      )?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key !== "Backspace") return;
    const cur = otp[index];
    if (cur === "") {
      if (index > 0) {
        const prevIndex = index - 1;
        const next = [...otp];
        next[prevIndex] = "";
        setOtp(next);
        (
          document.getElementById(`otp-${prevIndex}`) as HTMLInputElement | null
        )?.focus();
      }
    } else {
      const next = [...otp];
      next[index] = "";
      setOtp(next);
    }
  };

  const verifyOtp = async () => {
    if (!mobileNumber) return;
    if (otp.some((digit) => digit === "")) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "All fields are required.",
        confirmButtonText: "OK",
        confirmButtonColor: "#000000",
      });
      return;
    }
    try {
      setLoading(true);
      const response = await handleVerifyOtp(mobileNumber, otp.join(""));
      setUser(response.user, response.token);
      Swal.fire({
        icon: "success",
        title: "Success",
        text: response.message,
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/", { replace: true });
      });
    } catch (error: any) {
      console.log("OTP verification error:", error);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error?.response?.data?.message ?? "Verification failed.",
        confirmButtonText: "OK",
        confirmButtonColor: "#000000",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {" "}
        {/* increased width */}
        <div className="bg-white shadow-sm rounded-3xl p-10 md:p-12">
          <h2 className="text-3xl font-bold text-center mb-3">
            OTP Verification
          </h2>

          <p className="text-center text-gray-600 mb-8 text-base">
            Enter the 4-digit verification code sent to{" "}
            <b className="font-semibold">{mobileNumber}</b>.
          </p>

          {/* BIGGER OTP INPUTS */}
          <div className="flex justify-between mb-8">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                id={`otp-${i}`}
                value={otp[i]}
                onChange={(e) => handleChange(e.target.value.trim(), i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                maxLength={1}
                inputMode="numeric"
                className="w-16 h-16 md:w-20 md:h-20 border border-gray-300 rounded-2xl text-center text-2xl font-bold focus:border-black focus:outline-none"
              />
            ))}
          </div>

          <ButtonComponent
            title="Verify OTP"
            onClick={verifyOtp}
            loading={loading}
          />

          {/* Divider */}
          <div className="flex items-center my-8">
            <div className="flex-grow h-px bg-gray-300"></div>
            <span className="mx-3 text-gray-500 text-sm">Or Sign in with</span>
            <div className="flex-grow h-px bg-gray-300"></div>
          </div>

          <p className="text-center text-gray-600 text-sm">
            Don’t have an account?{" "}
            <Link
              to="/signup"
              className="font-medium underline text-black hover:no-underline"
            >
              Register Now
            </Link>
          </p>
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          Copyright &copy; 2025 WOO WOOO Art House | Privacy Policy
        </p>
      </div>
    </div>
  );
}
