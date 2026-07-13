"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { AuthResponse } from "@/types/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        ? {
            ...baseData,
            preferredBusinessCategory: String(
              form.get("preferredBusinessCategory")
            ),
            preferredLocation: String(form.get("preferredLocation")),
            budgetMin: Number(form.get("budgetMin")),
            budgetMax: Number(form.get("budgetMax")),
          }
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

      localStorage.setItem("token", result.data.token);
      localStorage.setItem("role", result.data.role);
      localStorage.setItem("userId", String(result.data.userId));

      setMessage(result.message);

      if (result.data.role === "SELLER") {
        window.location.href = "/seller/dashboard";
      } else {
        window.location.href = "/businesses";
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registration failed");
    }
  }

  const inputClass = "w-full bg-[#121c32] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 transition-colors";

  return (
    <main className="max-w-2xl mx-auto mt-16 px-4">
      <div className="bg-[#0d1220] border border-white/5 p-8 rounded-2xl">
        <h1 className="text-3xl font-bold mb-6 text-[#d8e4f0] tracking-wide">Create Account</h1>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setRole("buyer")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              role === "buyer"
                ? "bg-[#00cfa8] text-[#080c15]"
                : "bg-[#121c32] text-[#8092ab] border border-white/10 hover:text-[#c7d2e0]"
            }`}
          >
            Buyer
          </button>

          <button
            onClick={() => setRole("seller")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              role === "seller"
                ? "bg-[#00cfa8] text-[#080c15]"
                : "bg-[#121c32] text-[#8092ab] border border-white/10 hover:text-[#c7d2e0]"
            }`}
          >
            Seller
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="fullName"
            placeholder="Full Name"
            className={inputClass}
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            className={inputClass}
            required
          />

          <input
            name="phone"
            placeholder="Phone"
            className={inputClass}
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            className={inputClass}
            required
          />

          {role === "buyer" && (
            <>
              <input
                name="preferredBusinessCategory"
                placeholder="Preferred Business Category"
                className={inputClass}
              />

              <input
                name="preferredLocation"
                placeholder="Preferred Location"
                className={inputClass}
              />

              <input
                name="budgetMin"
                type="number"
                placeholder="Minimum Budget"
                className={inputClass}
              />

              <input
                name="budgetMax"
                type="number"
                placeholder="Maximum Budget"
                className={inputClass}
              />
            </>
          )}

          {role === "seller" && (
            <>
              <input
                name="nicOrPassport"
                placeholder="NIC or Passport"
                className={inputClass}
              />

              <input
                name="address"
                placeholder="Address"
                className={inputClass}
              />

              <input
                name="businessOwnerType"
                placeholder="Business Owner Type"
                className={inputClass}
              />
            </>
          )}

          <button className="w-full bg-[#00cfa8] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors">
            Register
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-[#8092ab]">{message}</p>}
      </div>
    </main>
  );
}
