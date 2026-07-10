"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

interface Seller {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  nicOrPassport: string;
  address: string;
  businessOwnerType: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const data = await apiRequest<Seller[]>("/admin/sellers");
        setSellers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load sellers");
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, []);

  if (loading) return <p className="p-10 text-white">Loading...</p>;
  if (error) return <p className="p-10 text-red-500">{error}</p>;

  return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">Sellers</h1>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden text-slate-900">
          <table className="w-full text-left">
            <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Verified</th>
            </tr>
            </thead>
            <tbody>
            {sellers.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.fullName}</td>
                  <td className="p-3">{s.email}</td>
                  <td className="p-3">{s.phone}</td>
                  <td className="p-3">
                    {s.verificationStatus === "APPROVED"
                        ? "✅ Approved"
                        : s.verificationStatus === "REJECTED"
                            ? "❌ Rejected"
                            : "⏳ Pending"}
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>
      </main>
  );
}