"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

interface VerificationRequest {
  id: number;
  businessId: number;
  businessTitle: string;
  sellerName: string;
  officerId: number | null;
  officerName: string | null;
  status: string;
  remarks: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function VerificationOfficerDashboardPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check role
    const role = localStorage.getItem("role");
    if (role !== "VERIFICATION_OFFICER" && role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const response = await apiRequest<{ data: VerificationRequest[] }>("/verification/pending");
      setRequests(response.data || []);
    } catch (err) {
      console.error("Failed to fetch pending requests", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-[#f59e0b]/20 text-[#f59e0b]";
      case "APPROVED":
        return "bg-[#10b981]/20 text-[#10b981]";
      case "REJECTED":
        return "bg-[#ef4444]/20 text-[#ef4444]";
      case "NEEDS_MORE_INFORMATION":
        return "bg-[#3b82f6]/20 text-[#3b82f6]";
      default:
        return "bg-[#8092ab]/20 text-[#8092ab]";
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-xl sm:text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">VERIFICATION OFFICER DASHBOARD</h1>
      <p className="text-[#4f6380] text-sm mb-8">Review business verification requests</p>

      {loading ? (
        <div className="text-[#4f6380]">Loading pending requests...</div>
      ) : requests.length === 0 ? (
        <div className="text-[#4f6380]">No pending verification requests</div>
      ) : (
        <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#0d1220]">
                <tr>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">ID</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Business</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Seller</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Status</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Created</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-t border-white/5">
                    <td className="p-4 text-[#d8e4f0]">#{req.id}</td>
                    <td className="p-4 text-[#d8e4f0]">{req.businessTitle}</td>
                    <td className="p-4 text-[#c7d2e0]">{req.sellerName}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(req.status)}`}>
                        {req.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-[#8092ab] text-sm">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => router.push(`/verification-officer/review/${req.businessId}`)}
                        className="bg-[#00cfa8] text-[#080c15] px-3.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#00e6bc] transition-colors min-h-[36px]"
                      >
                        Review
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
