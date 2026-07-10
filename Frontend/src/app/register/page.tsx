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

  return (
    <main className="max-w-2xl mx-auto bg-white mt-10 p-8 rounded-xl shadow-sm text-slate-950">
      <h1 className="text-3xl font-bold mb-6 text-slate-950">Create Account</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setRole("buyer")}
          className={`px-4 py-2 rounded-md ${
            role === "buyer" ? "bg-blue-600 text-white" : "bg-slate-200"
          }`}
        >
          Buyer
        </button>

        <button
          onClick={() => setRole("seller")}
          className={`px-4 py-2 rounded-md ${
            role === "seller" ? "bg-blue-600 text-black" : "bg-slate-200"
          }`}
        >
          Seller
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="fullName"
          placeholder="Full Name"
          className="w-full border p-3 rounded-md"
          required
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          className="w-full border p-3 rounded-md"
          required
        />

        <input
          name="phone"
          placeholder="Phone"
          className="w-full border p-3 rounded-md"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full border p-3 rounded-md"
          required
        />

        {role === "buyer" && (
          <>
            <input
              name="preferredBusinessCategory"
              placeholder="Preferred Business Category"
              className="w-full border p-3 rounded-md"
            />

            <input
              name="preferredLocation"
              placeholder="Preferred Location"
              className="w-full border p-3 rounded-md"
            />

            <input
              name="budgetMin"
              type="number"
              placeholder="Minimum Budget"
              className="w-full border p-3 rounded-md"
            />

            <input
              name="budgetMax"
              type="number"
              placeholder="Maximum Budget"
              className="w-full border p-3 rounded-md"
            />
          </>
        )}

        {role === "seller" && (
          <>
            <input
              name="nicOrPassport"
              placeholder="NIC or Passport"
              className="w-full border p-3 rounded-md"
            />

            <input
              name="address"
              placeholder="Address"
              className="w-full border p-3 rounded-md"
            />

            <input
              name="businessOwnerType"
              placeholder="Business Owner Type"
              className="w-full border p-3 rounded-md"
            />
          </>
        )}

        <button className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700">
          Register
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
    </main>
  );
}
