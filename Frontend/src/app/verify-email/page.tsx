"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setStatus("error");
      setMessage("No verification token provided");
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      await apiRequest("/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      setStatus("success");
      setMessage("Your email has been verified successfully!");
    } catch (err: any) {
      setStatus("error");
      if (err.message?.includes("expired")) {
        setStatus("expired");
        setMessage("Verification token has expired. Please request a new one.");
      } else {
        setMessage(err.message || "Failed to verify email. Please try again.");
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#080c15] px-6">
      <div className="max-w-md w-full bg-[#121c32] border border-white/5 rounded-2xl p-8">
        {status === "loading" && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#00cfa8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-[#d8e4f0] mb-2">Verifying your email...</h2>
            <p className="text-[#8092ab]">Please wait while we verify your email address.</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="w-16 h-16 bg-[#10b981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#d8e4f0] mb-2">Email Verified!</h2>
            <p className="text-[#8092ab] mb-6">{message}</p>
            <button
              onClick={() => router.push("/businesses")}
              className="bg-[#00cfa8] text-[#080c15] px-6 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {(status === "error" || status === "expired") && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#d8e4f0] mb-2">
              {status === "expired" ? "Token Expired" : "Verification Failed"}
            </h2>
            <p className="text-[#8092ab] mb-6">{message}</p>
            <button
              onClick={() => router.push("/auth/resend-verification")}
              className="bg-[#00cfa8] text-[#080c15] px-6 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors"
            >
              Request New Verification Email
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
