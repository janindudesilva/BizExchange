"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { AuthResponse } from "@/types/auth";

const trustItems = [
  "100% verified sellers and listings",
  "Confidential inquiry threads",
  "Dedicated officer audits on every deal",
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);

    const payload = {
      email: String(form.get("email")),
      password: String(form.get("password")),
    };

    try {
      const result = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      localStorage.setItem("token", result.data.token);
      localStorage.setItem("role", result.data.role);
      localStorage.setItem("userId", String(result.data.userId));
      window.dispatchEvent(new Event("auth-change"));

      // Check if an authorized return redirect was requested
      const redirectParam = searchParams.get("redirect");
      if (redirectParam && redirectParam.startsWith("/")) {
        router.push(redirectParam);
        return;
      }

      if (result.data.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else if (result.data.role === "SELLER") {
        router.push("/seller/dashboard");
      } else if (result.data.role === "SUPPORT_AGENT") {
        router.push("/support-agent/dashboard");
      } else if (result.data.role === "VERIFICATION_OFFICER") {
        router.push("/verification-officer/dashboard");
      } else {
        router.push("/buyer/dashboard");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Authentication failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] flex items-stretch">
      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[44%] auth-brand-panel flex-col justify-between p-12 xl:p-16 flex-shrink-0">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00cfa8] to-[#00b28e] flex items-center justify-center font-black text-[#070b14] text-base shadow-[0_0_16px_rgba(0,207,168,0.3)]">
            B
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Biz<span className="text-[#00cfa8]">Exchange</span>
          </span>
        </Link>

        {/* Center Content */}
        <div>
          <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-[1.15] mb-4">
            The verified marketplace for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00cfa8] to-[#22d3ee]">
              business transitions
            </span>
          </h2>
          <p className="text-sm text-[#7a93b4] leading-relaxed mb-8 max-w-sm">
            Sign in to access your deal dashboard, active inquiries, and verified business listings.
          </p>

          <div className="space-y-3">
            {trustItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#00cfa8]/15 border border-[#00cfa8]/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-[#00cfa8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-[#8aaccc]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-xs text-[#3d5a78]">
          © {new Date().getFullYear()} BizExchange. All rights reserved.
        </p>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 bg-[#070b14]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00cfa8] to-[#00b28e] flex items-center justify-center font-black text-[#070b14] text-base shadow-[0_0_16px_rgba(0,207,168,0.3)]">
                B
              </div>
              <span className="text-base font-bold tracking-tight text-white">
                Biz<span className="text-[#00cfa8]">Exchange</span>
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-[#8493a8]">
              Sign in to your BizExchange account
            </p>
          </div>

          {message && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#627288] mb-2">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                placeholder="e.g. founder@company.com"
                className="input-premium"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#627288]">
                  Password
                </label>
                <Link
                  href="/change-password"
                  className="text-xs text-[#00cfa8] hover:text-[#00e6bc] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="input-premium pr-16"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-[#627288] hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center !rounded-xl !py-3.5 mt-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-[#070b14] border-t-transparent rounded-full animate-spin" />
              )}
              <span>{loading ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center text-sm text-[#8493a8]">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="text-[#00cfa8] hover:text-[#00e6bc] font-semibold transition-colors">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center bg-[#070b14]">
          <div className="w-8 h-8 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
