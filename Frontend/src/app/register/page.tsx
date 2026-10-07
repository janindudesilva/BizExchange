"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { AuthResponse } from "@/types/auth";

const sellerBenefits = [
  "List your business at no upfront cost",
  "Human officer verification builds buyer trust",
  "Receive qualified, confidential inquiries only",
];

const buyerBenefits = [
  "Access 100% verified business listings",
  "Filter by industry, price, and location",
  "Confidential direct inquiries to sellers",
];

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const form = new FormData(event.currentTarget);

    const baseData = {
      fullName: String(form.get("fullName")),
      email: String(form.get("email")),
      phone: String(form.get("phone")),
      password: String(form.get("password")),
    };

    const endpoint =
      role === "buyer" ? "/auth/register/buyer" : "/auth/register/seller";

    const payload =
      role === "buyer"
        ? { ...baseData }
        : {
            ...baseData,
            nicOrPassport: String(form.get("nicOrPassport")),
            address: String(form.get("address")),
            businessOwnerType: String(form.get("businessOwnerType")),
          };

    try {
      const result = await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (result.data?.token) {
        localStorage.setItem("token", result.data.token);
        localStorage.setItem("role", result.data.role);
        localStorage.setItem("userId", String(result.data.userId));
        window.dispatchEvent(new Event("auth-change"));

        setMessage(result.message || "Account registered successfully!");

        setTimeout(() => {
          if (result.data.role === "SELLER") {
            router.push("/seller/dashboard");
          } else {
            router.push("/businesses");
          }
        }, 1000);
      } else {
        setMessage(
          "Account created successfully! We sent a verification link to your email. Please verify your email address before signing in."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const benefits = role === "seller" ? sellerBenefits : buyerBenefits;

  return (
    <main className="min-h-[calc(100dvh-4rem)] flex items-stretch">
      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[40%] xl:w-[42%] auth-brand-panel flex-col justify-between p-12 xl:p-16 flex-shrink-0">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00cfa8] to-[#00b28e] flex items-center justify-center font-black text-[#070b14] text-base shadow-[0_0_16px_rgba(0,207,168,0.3)]">
            B
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Biz<span className="text-[#00cfa8]">Exchange</span>
          </span>
        </Link>

        {/* Center content — reacts to selected role */}
        <div>
          <div className="mb-5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#00cfa8]">
              {role === "buyer" ? "For Investors & Buyers" : "For Business Owners"}
            </span>
          </div>
          <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-[1.15] mb-4">
            {role === "buyer" ? (
              <>Find your next{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00cfa8] to-[#22d3ee]">
                  acquisition
                </span>
              </>
            ) : (
              <>Exit your business{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00cfa8] to-[#22d3ee]">
                  at full value
                </span>
              </>
            )}
          </h2>
          <p className="text-sm text-[#7a93b4] leading-relaxed mb-8 max-w-sm">
            {role === "buyer"
              ? "Discover verified businesses for sale, send confidential inquiries, and track your portfolio."
              : "List your business, pass our verification, and connect with serious, funded buyers."}
          </p>

          <div className="space-y-3">
            {benefits.map((item, i) => (
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

        <p className="text-xs text-[#3d5a78]">
          © {new Date().getFullYear()} BizExchange. All rights reserved.
        </p>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-8 py-10 bg-[#070b14] overflow-y-auto">
        <div className="w-full max-w-lg">
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

          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Create your account
            </h1>
            <p className="text-sm text-[#8493a8]">
              Join the BizExchange network as a buyer or seller
            </p>
          </div>

          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/[0.07] mb-7">
            <button
              type="button"
              onClick={() => setRole("buyer")}
              className={`py-3 px-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1 min-h-[52px] ${
                role === "buyer"
                  ? "bg-[#00cfa8] text-[#070b14] shadow-[0_0_14px_rgba(0,207,168,0.3)]"
                  : "text-[#8493a8] hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Buyer / Investor</span>
              <span className={`text-xs font-normal ${role === "buyer" ? "text-[#070b14]/70" : "text-[#52637a]"}`}>
                Acquire businesses
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRole("seller")}
              className={`py-3 px-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1 min-h-[52px] ${
                role === "seller"
                  ? "bg-[#00cfa8] text-[#070b14] shadow-[0_0_14px_rgba(0,207,168,0.3)]"
                  : "text-[#8493a8] hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Seller / Founder</span>
              <span className={`text-xs font-normal ${role === "seller" ? "text-[#070b14]/70" : "text-[#52637a]"}`}>
                List & exit companies
              </span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-5 p-3.5 bg-[#00cfa8]/10 border border-[#00cfa8]/20 text-[#00cfa8] rounded-xl text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#627288] mb-2">
                  Full Legal Name
                </label>
                <input
                  name="fullName"
                  placeholder="e.g. Kasun Fernando"
                  className="input-premium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#627288] mb-2">
                  Phone Number (10 Digits)
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="0771234567"
                  className="input-premium tabular-nums"
                  required
                  pattern="[0-9]{10}"
                  maxLength={10}
                  minLength={10}
                  title="Phone number must contain exactly 10 digits."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#627288] mb-2">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  className="input-premium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#627288] mb-2">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  placeholder="Min 8 characters"
                  className="input-premium"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {role === "seller" && (
              <div className="space-y-4 pt-4 border-t border-white/[0.07]">
                <p className="text-xs font-bold uppercase tracking-widest text-[#00cfa8]">
                  Seller Verification Details
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#627288] mb-2">
                      NIC / Passport ID
                    </label>
                    <input
                      name="nicOrPassport"
                      placeholder="e.g. 199012345678"
                      className="input-premium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#627288] mb-2">
                      Owner Structure
                    </label>
                    <input
                      name="businessOwnerType"
                      placeholder="e.g. Sole Proprietor / Director"
                      className="input-premium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#627288] mb-2">
                    Business Registered Address
                  </label>
                  <input
                    name="address"
                    placeholder="Street, City, Postal Code"
                    className="input-premium"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center !rounded-xl !py-3.5 mt-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-[#070b14] border-t-transparent rounded-full animate-spin" />
              )}
              <span>
                {loading
                  ? "Creating Account..."
                  : `Register as ${role === "buyer" ? "Buyer" : "Seller"}`}
              </span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center text-sm text-[#8493a8]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#00cfa8] hover:text-[#00e6bc] font-semibold transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
