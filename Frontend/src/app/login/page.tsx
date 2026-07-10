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
    <main className="max-w-md mx-auto bg-white mt-10 p-8 rounded-xl shadow-sm text-slate-950">
      <h1 className="text-3xl font-bold mb-6 text-slate-950">Login</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="w-full border p-3 rounded-md"
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full border p-3 rounded-md"
          required
        />

        <button className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700">
          Login
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
    </main>
  );
}
