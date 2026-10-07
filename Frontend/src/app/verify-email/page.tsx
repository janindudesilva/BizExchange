"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : "No verification token found in link.");

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    async function runVerification() {
      try {
        await apiRequest("/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!ignore) {
          setStatus("success");
          setMessage("Your email has been verified successfully. Your account is now active!");
        }
      } catch (err: unknown) {
        if (ignore) return;
        const errorMsg = err instanceof Error ? err.message : "Failed to verify email. Please try again.";
        if (errorMsg.includes("expired")) {
          setStatus("expired");
          setMessage("This verification token has expired. Please request a new verification link.");
        } else {
          setStatus("error");
          setMessage(errorMsg);
        }
      }
    }

    runVerification();
    return () => {
      ignore = true;
    };
  }, [token]);

  return (
    <div className="max-w-md w-full glass-panel rounded-2xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Decorative ambient background accent */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#00cfa8]/10 rounded-full blur-2xl pointer-events-none" />

      {status === "loading" && (
        <div className="text-center py-6">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="w-16 h-16 rounded-full border-2 border-white/10" />
            <div className="w-16 h-16 rounded-full border-2 border-[#00cfa8] border-t-transparent animate-spin absolute inset-0" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Verifying your account</h2>
          <p className="text-xs text-[#8493a8] max-w-xs mx-auto">
            Please wait a moment while we securely validate your verification token with BizExchange.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-[#00cfa8]/15 border border-[#00cfa8]/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-[#00cfa8] shadow-[0_0_24px_rgba(0,207,168,0.2)]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Email Verified!</h2>
          <p className="text-xs text-[#8493a8] mb-6 leading-relaxed">{message}</p>
          <Link
            href="/login"
            className="block text-center w-full bg-[#00cfa8] text-[#070b14] py-3 rounded-xl font-semibold text-sm hover:bg-[#00e6bc] transition-all shadow-[0_0_16px_rgba(0,207,168,0.25)] hover:shadow-[0_0_24px_rgba(0,207,168,0.4)]"
          >
            Continue to Sign In
          </Link>
        </div>
      )}

      {(status === "error" || status === "expired") && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-rose-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {status === "expired" ? "Token Expired" : "Verification Failed"}
          </h2>
          <p className="text-xs text-[#8493a8] mb-6 leading-relaxed">{message}</p>
          <div className="space-y-2.5">
            <Link
              href="/auth/resend-verification"
              className="block w-full bg-[#00cfa8] text-[#070b14] py-2.5 rounded-xl font-semibold text-xs hover:bg-[#00e6bc] transition-all"
            >
              Request New Verification Email
            </Link>
            <Link
              href="/login"
              className="block w-full bg-white/[0.04] text-[#8493a8] hover:text-white py-2.5 rounded-xl font-medium text-xs border border-white/5 transition-all"
            >
              Return to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <Suspense
        fallback={
          <div className="max-w-md w-full glass-panel rounded-2xl p-8 border border-white/10 text-center">
            <div className="w-10 h-10 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs text-[#8493a8]">Loading verification session...</p>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
