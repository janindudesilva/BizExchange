"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiryMinutes, setOtpExpiryMinutes] = useState(5);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Request OTP (/api/auth/forgot-password)
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await apiRequest<{ message?: string; data?: { otpValidMinutes?: number } }>(
        "/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        }
      );

      if (res?.data?.otpValidMinutes) {
        setOtpExpiryMinutes(res.data.otpValidMinutes);
      }
      setMessage(res?.message || "If that email exists, an OTP has been sent.");
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Failed to send OTP request. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP (/api/auth/verify-otp)
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await apiRequest<{ data: { resetToken: string }; message: string }>("/auth/verify-reset-otp", {
        method: "POST",
        body: JSON.stringify({
          email,
          otp: otpCode,
        }),
      });

      setResetToken(res.data.resetToken);
      setMessage("OTP verified! Please set your new password.");
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Reset Password (/api/auth/reset-password)
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          resetToken,
          newPassword,
        }),
      });

      setMessage("Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#00cfa8] mx-auto mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Account Recovery
          </h1>
          <p className="text-xs text-[#8493a8] mt-1.5">
            Step {step} of 3 • Secure Identity Verification
          </p>
        </div>

        {/* Step progress pills */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step >= s ? "bg-[#00cfa8]" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {message && (
          <div className="mb-6 p-3.5 bg-[#00cfa8]/10 border border-[#00cfa8]/20 text-[#00cfa8] rounded-xl text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#627288] mb-1.5">
                Registered Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-premium"
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00cfa8] text-[#070b14] py-3.5 rounded-xl font-bold text-sm hover:bg-[#00e6bc] transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_16px_rgba(0,207,168,0.2)]"
            >
              {loading ? "Sending verification code..." : "Send Verification Code"}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-[#8493a8] hover:text-white transition-colors">
                ← Return to Login
              </Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#8493a8]">
              Verification code sent to <strong className="text-white">{email}</strong>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#627288] mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                className="input-premium text-center font-mono text-2xl tracking-[0.3em] font-bold text-[#00cfa8]"
                placeholder="000000"
              />
              <p className="text-[10px] text-[#52637a] mt-1.5 text-center">
                Code expires in {otpExpiryMinutes} minutes
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full bg-[#00cfa8] text-[#070b14] py-3.5 rounded-xl font-bold text-sm hover:bg-[#00e6bc] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Verifying..." : "Validate Code"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-[#8493a8] hover:text-[#00cfa8] transition-colors"
              >
                ← Request New Code
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#627288] mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="input-premium"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#627288] mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="input-premium"
                placeholder="Confirm password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00cfa8] text-[#070b14] py-3.5 rounded-xl font-bold text-sm hover:bg-[#00e6bc] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Updating..." : "Save New Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
