"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

interface SellerProfile {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  verificationStatus: string;
  reviewNotes: string | null;
  flaggedSuspicious: boolean;
  reviewedByName: string | null;
  rejectionReason: string | null;
}

export default function OfficerDashboardPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadSellers() {
      try {
        const response = await apiRequest<{ data: SellerProfile[] }>("/admin/sellers");
        if (!ignore) {
          setSellers(response.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch sellers", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSellers();
    return () => {
      ignore = true;
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-[#10b981]/20 text-[#10b981]";
      case "PENDING":
        return "bg-[#f59e0b]/20 text-[#f59e0b]";
      case "REJECTED":
        return "bg-[#ef4444]/20 text-[#ef4444]";
      default:
        return "bg-[#8092ab]/20 text-[#8092ab]";
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-xl sm:text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">VERIFICATION OFFICER DASHBOARD</h1>
      <p className="text-[#4f6380] text-sm mb-8">Review and verify seller profiles</p>

      {loading ? (
        <div className="text-[#4f6380]">Loading sellers...</div>
      ) : sellers.length === 0 ? (
        <div className="text-[#4f6380]">No sellers found</div>
      ) : (
        <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#0d1220]">
                <tr>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Name</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Email</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Status</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Flagged</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Reviewed By</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => (
                  <tr key={seller.id} className="border-t border-white/5">
                    <td className="p-4 text-[#d8e4f0]">{seller.fullName}</td>
                    <td className="p-4 text-[#c7d2e0]">{seller.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(seller.verificationStatus)}`}>
                        {seller.verificationStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      {seller.flaggedSuspicious ? (
                        <span className="text-[#ef4444]">⚠️ Suspicious</span>
                      ) : (
                        <span className="text-[#10b981]">✓ Clear</span>
                      )}
                    </td>
                    <td className="p-4 text-[#c7d2e0]">{seller.reviewedByName || "—"}</td>
                    <td className="p-4">
                      <button
                        onClick={() => router.push(`/officer/sellers/${seller.id}`)}
                        className="bg-[#00cfa8] text-[#080c15] px-3.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#00e6bc] transition-colors min-h-[36px]"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
