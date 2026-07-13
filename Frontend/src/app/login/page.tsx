"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { AuthResponse } from "@/types/auth";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

      setMessage(result.message);

      if (result.data.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else if (result.data.role === "SELLER") {
        router.push("/seller/dashboard");
      } else {
        router.push("/businesses");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    }
  }

  return (
    <main className="max-w-md mx-auto mt-16 px-4">
      <div className="bg-[#0d1220] border border-white/5 p-8 rounded-2xl">
        <h1 className="text-3xl font-bold mb-6 text-[#d8e4f0] tracking-wide">Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full bg-[#121c32] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 transition-colors"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full bg-[#121c32] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 transition-colors"
            required
          />

          <button className="w-full bg-[#00cfa8] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors">
            Login
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-[#8092ab]">{message}</p>}
      </div>
    </main>
  );
}
