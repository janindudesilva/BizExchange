"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

interface Business {
  id: number;
  title: string;
  category: string;
  sellerName: string;
  description: string;
  location: string;
  askingPrice: number;
  status: string;
}

export default function PendingBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ data: Business[] }>("/admin/businesses/pending");
      setBusinesses(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load pending businesses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const adminId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const handleApprove = async (id: number) => {
    setActionLoadingId(id);
    try {
      await apiRequest(`/admin/businesses/${id}/approve?adminId=${adminId}`, {
        method: "PUT",
      });
      setBusinesses((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;

    setActionLoadingId(id);
    try {
      await apiRequest(
        `/admin/businesses/${id}/reject?adminId=${adminId}&reason=${encodeURIComponent(reason)}`,
        { method: "PUT" }
      );
      setBusinesses((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) return <p className="p-10 text-[#4f6380]">Loading...</p>;
  if (error) return <p className="p-10 text-red-400">{error}</p>;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">
        PENDING BUSINESSES</h1>
      <p className="text-[#4f6380] text-sm mb-8">Review and approve or reject business listings</p>

      {businesses.length === 0 ? (
        <p className="text-[#4f6380]">No pending businesses right now.</p>
      ) : (
        <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">TITLE</th>
                <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">CATEGORY</th>
                <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">SELLER</th>
                <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">LOCATION</th>
                <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">ASKING PRICE</th>
                <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-sm text-[#d8e4f0]">{b.title}</td>
                  <td className="p-4 text-sm text-[#8092ab]">{b.category}</td>
                  <td className="p-4 text-sm text-[#8092ab]">{b.sellerName}</td>
                  <td className="p-4 text-sm text-[#8092ab]">{b.location}</td>
                  <td className="p-4 text-sm text-[#00cfa8] font-medium">{b.askingPrice}</td>
                  <td className="p-4 space-x-2">
                    <button
                      disabled={actionLoadingId === b.id}
                      onClick={() => handleApprove(b.id)}
                      className="bg-[#00cfa8] text-[#080c15] px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[#00e6bc] transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      disabled={actionLoadingId === b.id}
                      onClick={() => handleReject(b.id)}
                      className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-red-500/30 transition-colors"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}