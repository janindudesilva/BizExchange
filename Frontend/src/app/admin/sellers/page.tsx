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

  if (loading) return <p className="p-10 text-[#4f6380]">Loading...</p>;
  if (error) return <p className="p-10 text-red-400">{error}</p>;

  const statusBadge = (status: string) => {
    if (status === "APPROVED") return <span className="text-[#00cfa8]">✅ Approved</span>;
    if (status === "REJECTED") return <span className="text-red-400">❌ Rejected</span>;
    return <span className="text-[#f5a623]">⏳ Pending</span>;
  };

  return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">SELLERS</h1>
        <p className="text-[#4f6380] text-sm mb-8">All registered sellers on the platform</p>

        <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
            <tr className="border-b border-white/5">
              <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">NAME</th>
              <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">EMAIL</th>
              <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">PHONE</th>
              <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">STATUS</th>
            </tr>
            </thead>
            <tbody>
            {sellers.map((s) => (
                <tr key={s.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-sm text-[#d8e4f0]">{s.fullName}</td>
                  <td className="p-4 text-sm text-[#8092ab]">{s.email}</td>
                  <td className="p-4 text-sm text-[#8092ab]">{s.phone}</td>
                  <td className="p-4 text-sm">
                    {statusBadge(s.verificationStatus)}
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>
      </main>
  );
}