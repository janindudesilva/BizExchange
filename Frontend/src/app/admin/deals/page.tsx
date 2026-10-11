"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Deal, DealStatus } from "@/types/deal";

const ITEMS_PER_PAGE = 10;

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | DealStatus>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Inspection & Cancellation modal
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [adminCancelReason, setAdminCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchDeals = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ data: Deal[] }>("/deals/admin/all");
      setDeals(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platform deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    apiRequest<{ data: Deal[] }>("/deals/admin/all")
      .then((res) => {
        if (!ignore) {
          setDeals(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load platform deals");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        d.businessTitle.toLowerCase().includes(q) ||
        d.buyerName.toLowerCase().includes(q) ||
        d.sellerName.toLowerCase().includes(q) ||
        d.id.toString().includes(q) ||
        (d.offerId && d.offerId.toString().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [deals, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / ITEMS_PER_PAGE));
  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDeals.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDeals, currentPage]);

  const handleAdminCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeal || !adminCancelReason.trim()) return;

    setCancelling(true);
    setCancelError("");
    try {
      await apiRequest(`/deals/${selectedDeal.id}/admin-cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: adminCancelReason.trim() }),
      });
      setShowCancelModal(false);
      setSelectedDeal(null);
      setAdminCancelReason("");
      setSuccessMessage(`Deal #${selectedDeal.id} successfully cancelled by administrator.`);
      await fetchDeals();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel deal");
    } finally {
      setCancelling(false);
    }
  };

  const statusBadge = (status: DealStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">In Progress</span>;
      case "COMPLETED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Completed</span>;
      case "CANCELLED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/20">Cancelled</span>;
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <main className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#627288] mb-1">
            <Link href="/admin/dashboard" className="hover:text-white transition-colors">Admin Dashboard</Link>
            <span>/</span>
            <span className="text-white font-medium">Deals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Platform Deals Audit</h1>
          <p className="text-xs text-[#8493a8] mt-1">Supervise closing workflows, monitor mutual confirmations, and intervene when required.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/offers"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
          >
            ← View Offers Desk
          </Link>
        </div>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex justify-between items-center">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by business, buyer, seller, deal ID..."
            className="w-full bg-[#0a101d] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
          {(["ALL", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((tab) => {
            const active = statusFilter === tab;
            const labelMap: Record<string, string> = {
              ALL: "All Deals",
              IN_PROGRESS: "In Progress",
              COMPLETED: "Completed",
              CANCELLED: "Cancelled",
            };
            return (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-[#00cfa8] text-[#070b14]"
                    : "text-[#8493a8] hover:text-white hover:bg-white/5"
                }`}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={fetchDeals} className="underline font-semibold">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#8493a8]">Loading deals...</p>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8493a8]">No deals matching current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1626] border-b border-white/5 text-[#627288] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Deal ID</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Buyer</th>
                  <th className="py-3 px-4">Seller</th>
                  <th className="py-3 px-4">Agreed Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Buyer Confirmed</th>
                  <th className="py-3 px-4">Seller Confirmed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#c7d2e0]">
                {paginatedDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">#{deal.id}</td>
                    <td className="py-3.5 px-4 max-w-xs truncate font-medium text-white">
                      {deal.businessTitle}
                    </td>
                    <td className="py-3.5 px-4">{deal.buyerName}</td>
                    <td className="py-3.5 px-4">{deal.sellerName}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#00cfa8] tabular-nums">
                      {deal.currency} {Number(deal.agreedPrice).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">{statusBadge(deal.status)}</td>
                    <td className="py-3.5 px-4">
                      {deal.buyerConfirmedAt ? (
                        <span className="text-emerald-400 font-medium">✓ Confirmed</span>
                      ) : (
                        <span className="text-[#627288]">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {deal.sellerConfirmedAt ? (
                        <span className="text-emerald-400 font-medium">✓ Confirmed</span>
                      ) : (
                        <span className="text-[#627288]">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedDeal(deal);
                          setShowCancelModal(false);
                          setAdminCancelReason("");
                          setCancelError("");
                        }}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition-colors cursor-pointer"
                      >
                        Inspect / Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && filteredDeals.length > 0 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-[#8493a8]">
            <span>
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredDeals.length)} of {filteredDeals.length} deals
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-white font-semibold">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details & Admin Action Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#627288] block">Administrative Inspection</span>
                <h3 className="text-base font-bold text-white">Deal #{selectedDeal.id}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedDeal(null);
                  setShowCancelModal(false);
                }}
                className="w-7 h-7 rounded-lg bg-white/5 text-[#8493a8] hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#0a101d] rounded-xl border border-white/5">
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Business</span>
                  <Link href={`/businesses/${selectedDeal.businessId}`} className="text-white hover:underline font-semibold">
                    {selectedDeal.businessTitle}
                  </Link>
                </div>
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Agreed Price</span>
                  <span className="text-[#00cfa8] font-bold text-sm">
                    {selectedDeal.currency} {Number(selectedDeal.agreedPrice).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Buyer</span>
                  <span className="text-[#c7d2e0] font-medium">{selectedDeal.buyerName} ({selectedDeal.buyerEmail || `ID: ${selectedDeal.buyerId}`})</span>
                </div>
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Seller</span>
                  <span className="text-[#c7d2e0] font-medium">{selectedDeal.sellerName} ({selectedDeal.sellerEmail || `ID: ${selectedDeal.sellerId}`})</span>
                </div>
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Buyer Confirmation</span>
                  <span className={selectedDeal.buyerConfirmedAt ? "text-emerald-400 font-semibold" : "text-[#627288]"}>
                    {selectedDeal.buyerConfirmedAt ? new Date(selectedDeal.buyerConfirmedAt).toLocaleString() : "Not Confirmed"}
                  </span>
                </div>
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Seller Confirmation</span>
                  <span className={selectedDeal.sellerConfirmedAt ? "text-emerald-400 font-semibold" : "text-[#627288]"}>
                    {selectedDeal.sellerConfirmedAt ? new Date(selectedDeal.sellerConfirmedAt).toLocaleString() : "Not Confirmed"}
                  </span>
                </div>
              </div>

              {selectedDeal.cancellationPending && (
                <div className="p-3 bg-amber-500/[0.08] rounded-xl border border-amber-500/25 text-amber-200">
                  <span className="block text-[10px] uppercase font-bold text-amber-400 mb-1">
                    Pending Cancellation Request
                  </span>
                  <p>
                    Requested by: <strong>{selectedDeal.cancellationRequestedByName || "Participant"}</strong>
                  </p>
                  <p className="mt-1 text-[11px] text-[#e3caa2]">&quot;{selectedDeal.cancellationReason}&quot;</p>
                </div>
              )}

              {selectedDeal.notes && (
                <div className="p-3 bg-[#0a101d] rounded-xl border border-white/5">
                  <span className="text-[#627288] block text-[10px] uppercase font-bold mb-1">Deal Log / Notes</span>
                  <p className="text-[#c7d2e0] leading-relaxed">{selectedDeal.notes}</p>
                </div>
              )}

              <div className="text-[11px] text-[#627288] pt-1 space-y-0.5">
                <p>Created: {new Date(selectedDeal.createdAt).toLocaleString()}</p>
                {selectedDeal.closedAt && <p>Closed At: {new Date(selectedDeal.closedAt).toLocaleString()}</p>}
              </div>
            </div>

            {/* Admin Cancellation Trigger / Form */}
            {selectedDeal.status === "IN_PROGRESS" && (
              <div className="pt-2 border-t border-white/10 space-y-3">
                {!showCancelModal ? (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    Administrative Cancellation (Enforce Stop)
                  </button>
                ) : (
                  <form onSubmit={handleAdminCancel} className="space-y-3 p-3.5 bg-rose-500/[0.05] border border-rose-500/20 rounded-xl">
                    <span className="block text-xs font-bold text-rose-400">
                      Mandatory Reason for Admin Cancellation:
                    </span>
                    <textarea
                      required
                      rows={2}
                      value={adminCancelReason}
                      onChange={(e) => setAdminCancelReason(e.target.value)}
                      placeholder="e.g. Fraud report verified, KYC non-compliance, terms violation..."
                      className="w-full bg-[#0a101d] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-[#4f6380] focus:outline-none focus:border-rose-400 transition-colors resize-none"
                    />

                    {cancelError && (
                      <div className="text-xs text-rose-400">{cancelError}</div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(false)}
                        disabled={cancelling}
                        className="flex-1 py-1.5 rounded-lg border border-white/10 text-xs text-[#8493a8] hover:text-white"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={cancelling || !adminCancelReason.trim()}
                        className="flex-1 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs"
                      >
                        {cancelling ? "Cancelling..." : "Confirm Admin Cancel"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
