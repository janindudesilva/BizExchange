"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function ResendVerificationPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");

    try {
      await apiRequest("/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      setStatus("success");
      setMessage("Verification email sent successfully! Please check your inbox.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to send verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#080c15] px-6">
      <div className="max-w-md w-full bg-[#121c32] border border-white/5 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-[#d8e4f0] mb-2">Resend Verification Email</h1>
        <p className="text-[#8092ab] mb-6">
          Enter your email address to receive a new verification link.
        </p>

        {status === "success" && (
          <div className="bg-[#10b981]/20 border border-[#10b981]/30 rounded-lg p-4 mb-6">
            <p className="text-[#10b981] text-sm">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-[#8092ab] mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00cfa8] text-[#080c15] px-4 py-3 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Verification Email"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/auth/login")}
            className="text-[#8092ab] text-sm hover:text-[#d8e4f0] transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    </main>
  );
}
