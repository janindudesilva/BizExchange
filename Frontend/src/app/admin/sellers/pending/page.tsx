"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

interface Seller {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  nicOrPassport: string;
  address: string;
  businessOwnerType: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
}

export default function PendingSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any>("/admin/sellers/pending");
      const list: Seller[] = Array.isArray(res) ? res : (res?.data || []);
      setSellers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load pending sellers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: number) => {
    if (!confirm("Approve this seller for verified marketplace access?")) return;
    setActionLoadingId(id);
    try {
      await apiRequest(`/admin/sellers/${id}/approve`, { method: "PUT" });
      setSellers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectModal = (seller: Seller) => {
    setSelectedSeller(seller);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller) return;

    setActionLoadingId(selectedSeller.id);
    try {
      await apiRequest(`/admin/sellers/${selectedSeller.id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason: rejectionReason.trim() || "Verification requirements not met" }),
      });
      setSellers((prev) => prev.filter((s) => s.id !== selectedSeller.id));
      setRejectModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#00cfa8] mb-1 block">
            Verification Queue
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Pending Seller Verifications
          </h1>
          <p className="text-xs text-[#8493a8] mt-1">
            Review identity documents and approve trusted seller accounts.
          </p>
        </div>

        <Link
          href="/admin/sellers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8493a8] hover:text-white transition-colors touch-target"
        >
          <span>View All Registered Sellers</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 mb-6">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-panel rounded-2xl border border-white/5 p-8 text-center text-xs text-[#8493a8]">
          <div className="w-8 h-8 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading pending verifications...
        </div>
      ) : sellers.length === 0 ? (
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-white/5 text-center max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-[#00cfa8]/10 border border-[#00cfa8]/20 flex items-center justify-center mx-auto mb-4 text-[#00cfa8]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Queue Clean & Clear</h3>
          <p className="text-xs text-[#8493a8]">
            There are currently no seller applications awaiting verification.
          </p>
        </div>
      ) : (
        <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="p-4 font-bold uppercase tracking-wider text-[#627288]">Applicant</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[#627288]">Contact</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[#627288]">NIC / Passport</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[#627288]">Structure</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[#627288] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{s.fullName}</div>
                      <div className="text-[11px] text-[#52637a] font-mono mt-0.5">ID: #{s.id}</div>
                    </td>
                    <td className="p-4 text-[#8493a8]">
                      <div>{s.email}</div>
                      <div className="font-mono text-[11px] text-[#52637a]">{s.phone}</div>
                    </td>
                    <td className="p-4 font-mono text-white font-medium">{s.nicOrPassport}</td>
                    <td className="p-4 text-[#8493a8]">{s.businessOwnerType || "Owner"}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        disabled={actionLoadingId === s.id}
                        onClick={() => handleApprove(s.id)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#00cfa8] text-[#070b14] hover:bg-[#00e6bc] transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(0,207,168,0.2)]"
                      >
                        Approve
                      </button>
                      <button
                        disabled={actionLoadingId === s.id}
                        onClick={() => openRejectModal(s)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal with Reason */}
      {rejectModalOpen && selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-2">
              Reject Seller: {selectedSeller.fullName}
            </h3>
            <p className="text-xs text-[#8493a8] mb-4">
              Please specify the rejection rationale so the seller can address the requirements.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                className="input-premium h-28 resize-none text-xs"
                placeholder="e.g. Incomplete NIC document; please re-upload clear front & back copy..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#8493a8] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === selectedSeller.id}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}