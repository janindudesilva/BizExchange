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

  if (loading) return <p className="p-10 text-white">Loading...</p>;
  if (error) return <p className="p-10 text-red-500">{error}</p>;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-8 text-white">
        Pending Businesses</h1>

      {businesses.length === 0 ? (
        <p className="text-slate-400">No pending businesses right now.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-slate-900">
            <thead className="bg-slate-600">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Seller</th>
                <th className="p-3">Location</th>
                <th className="p-3">Asking Price</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="p-3">{b.title}</td>
                  <td className="p-3">{b.category}</td>
                  <td className="p-3">{b.sellerName}</td>
                  <td className="p-3">{b.location}</td>
                  <td className="p-3">{b.askingPrice}</td>
                  <td className="p-3 space-x-2">
                    <button
                      disabled={actionLoadingId === b.id}
                      onClick={() => handleApprove(b.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded-md disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={actionLoadingId === b.id}
                      onClick={() => handleReject(b.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded-md disabled:opacity-50"
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