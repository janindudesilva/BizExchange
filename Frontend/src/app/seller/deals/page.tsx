"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Deal, DealStatus } from "@/types/deal";
import SellerSidebar from "@/components/SellerSidebar";

export default function SellerDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | DealStatus>("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserId] = useState<number | null>(() =>
    typeof window !== "undefined" && localStorage.getItem("userId")
      ? parseInt(localStorage.getItem("userId")!, 10)
      : null
  );

  // Modals state
  const [confirmingDeal, setConfirmingDeal] = useState<Deal | null>(null);
  const [cancelRequestDeal, setCancelRequestDeal] = useState<Deal | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [respondCancelDeal, setRespondCancelDeal] = useState<{ deal: Deal; agree: boolean } | null>(null);

  // Action execution state
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchDeals = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ data: Deal[] }>("/deals/my");
      setDeals(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    apiRequest<{ data: Deal[] }>("/deals/my")
      .then((res) => {
        if (!ignore) {
          setDeals(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load deals");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleConfirmCompletion = async (dealId: number) => {
    setSubmittingAction(true);
    setActionError("");
    try {
      await apiRequest(`/deals/${dealId}/confirm`, { method: "POST" });
      setConfirmingDeal(null);
      await fetchDeals();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to confirm completion");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRequestCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelRequestDeal || !cancelReason.trim()) return;

    setSubmittingAction(true);
    setActionError("");
    try {
      await apiRequest(`/deals/${cancelRequestDeal.id}/request-cancellation`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      setCancelRequestDeal(null);
      setCancelReason("");
      await fetchDeals();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to request cancellation");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRespondCancellation = async () => {
    if (!respondCancelDeal) return;

    setSubmittingAction(true);
    setActionError("");
    try {
      await apiRequest(`/deals/${respondCancelDeal.deal.id}/respond-cancellation`, {
        method: "POST",
        body: JSON.stringify({ agree: respondCancelDeal.agree }),
      });
      setRespondCancelDeal(null);
      await fetchDeals();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to process cancellation response");
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredDeals = deals.filter((d) => {
    if (filter === "ALL") return true;
    return d.status === filter;
  });

  const activeDealsCount = deals.filter((d) => d.status === "IN_PROGRESS").length;

  const statusBadge = (status: DealStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            ● In Progress
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            ✓ Completed & Sold
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            ✕ Cancelled
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#080c15] text-[#c7d2e0] flex relative overflow-x-hidden">
      <SellerSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        badges={{ deals: activeDealsCount }}
      />

      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-12 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cfa8] block mb-1">
              Seller Escrow & Transition Desk
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Deals
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/seller/offers"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              ← View Received Offers
            </Link>
          </div>
        </div>

        {/* Platform Disclaimer */}
        <div className="p-3.5 rounded-2xl bg-blue-500/[0.08] border border-blue-500/20 text-xs text-[#9cc4ff] leading-relaxed flex items-start gap-2.5">
          <span className="text-base leading-none">ℹ️</span>
          <div>
            <strong>Mutual Offline Completion:</strong> A deal reaches COMPLETED status only when both the seller and buyer independently confirm that the offline business handover is completed. This automatically marks your listing as SOLD.
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#0d1424] border border-white/5 rounded-2xl overflow-x-auto no-scrollbar">
          {(["ALL", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((tab) => {
            const count = tab === "ALL" ? deals.length : deals.filter((d) => d.status === tab).length;
            const active = filter === tab;
            const labelMap: Record<string, string> = {
              ALL: "All Deals",
              IN_PROGRESS: "In Progress",
              COMPLETED: "Completed",
              CANCELLED: "Cancelled",
            };
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? "bg-[#00cfa8] text-[#070b14] shadow-[0_0_12px_rgba(0,207,168,0.25)]"
                    : "text-[#8493a8] hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{labelMap[tab]}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? "bg-[#070b14]/20 text-[#070b14]" : "bg-white/10 text-[#c7d2e0]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchDeals} className="text-xs underline font-semibold hover:text-rose-300">
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#8493a8]">Loading deals...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredDeals.length === 0 && (
          <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-[#8493a8]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">No Deals Found</h3>
            <p className="text-xs text-[#8493a8] max-w-sm mx-auto leading-relaxed">
              When you accept an acquisition offer, an active Deal will open here for closing coordination.
            </p>
          </div>
        )}

        {/* Deals List */}
        {!loading && filteredDeals.length > 0 && (
          <div className="space-y-6">
            {filteredDeals.map((deal) => {
              const buyerConfirmed = Boolean(deal.buyerConfirmedAt);
              const sellerConfirmed = Boolean(deal.sellerConfirmedAt);
              const isRequesterOfCancellation =
                deal.cancellationPending &&
                currentUserId !== null &&
                deal.cancellationRequestedBy === currentUserId;

              return (
                <div
                  key={deal.id}
                  className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/5 hover:border-white/10 transition-all space-y-5"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#627288]">
                          Deal #{deal.id} • Offer #{deal.offerId}
                        </span>
                        {statusBadge(deal.status)}
                      </div>
                      <Link
                        href={`/businesses/${deal.businessId}`}
                        className="text-lg font-bold text-white hover:text-[#00cfa8] transition-colors"
                      >
                        {deal.businessTitle}
                      </Link>
                      <p className="text-xs text-[#8493a8] mt-0.5">
                        Buyer: <strong className="text-[#c7d2e0]">{deal.buyerName}</strong>
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-[#627288] block">
                        Agreed Price
                      </span>
                      <div className="text-xl sm:text-2xl font-black text-[#00cfa8] tabular-nums">
                        {deal.currency} {Number(deal.agreedPrice).toLocaleString()}
                      </div>
                      <span className="text-[10px] text-[#52637a]">
                        Agreed closing amount
                      </span>
                    </div>
                  </div>

                  {/* Confirmation Progress Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        sellerConfirmed
                          ? "bg-emerald-500/[0.06] border-emerald-500/25 text-emerald-300"
                          : "bg-[#0d1424] border-white/5 text-[#8493a8]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-white">Your Confirmation (Seller)</span>
                        <span>{sellerConfirmed ? "✓ Confirmed" : "⏳ Pending"}</span>
                      </div>
                      <p className="text-[11px] opacity-80">
                        {sellerConfirmed
                          ? `Confirmed on ${new Date(deal.sellerConfirmedAt!).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}`
                          : "You have not yet confirmed offline asset handover."}
                      </p>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        buyerConfirmed
                          ? "bg-emerald-500/[0.06] border-emerald-500/25 text-emerald-300"
                          : "bg-[#0d1424] border-white/5 text-[#8493a8]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-white">Buyer Confirmation</span>
                        <span>{buyerConfirmed ? "✓ Confirmed" : "⏳ Pending"}</span>
                      </div>
                      <p className="text-[11px] opacity-80">
                        {buyerConfirmed
                          ? `Confirmed on ${new Date(deal.buyerConfirmedAt!).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}`
                          : "Awaiting buyer confirmation of completion."}
                      </p>
                    </div>
                  </div>

                  {/* Pending Cancellation Banner */}
                  {deal.cancellationPending && (
                    <div className="p-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/25 text-xs text-amber-200 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <span>⚠️ Cancellation Request Pending</span>
                        <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full">
                          Blocks Completion
                        </span>
                      </div>
                      <p className="text-[11px] text-[#e3caa2]">
                        Requested by{" "}
                        <strong className="text-white">
                          {isRequesterOfCancellation ? "You" : deal.cancellationRequestedByName || "Buyer"}
                        </strong>
                        : &quot;{deal.cancellationReason}&quot;
                      </p>
                      {!isRequesterOfCancellation && deal.status === "IN_PROGRESS" && (
                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => setRespondCancelDeal({ deal, agree: true })}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors cursor-pointer"
                          >
                            Agree to Cancel Deal
                          </button>
                          <button
                            onClick={() => setRespondCancelDeal({ deal, agree: false })}
                            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Decline & Continue Deal
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes / Record */}
                  {deal.notes && deal.status === "CANCELLED" && (
                    <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-white/5 text-xs text-[#8493a8]">
                      <strong className="text-white block mb-0.5">Cancellation Record:</strong>
                      {deal.notes}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-[#627288]">
                      Created: {new Date(deal.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Confirm completion button */}
                      {deal.status === "IN_PROGRESS" && !sellerConfirmed && (
                        <button
                          onClick={() => setConfirmingDeal(deal)}
                          disabled={deal.cancellationPending}
                          title={deal.cancellationPending ? "Completion blocked while cancellation is pending" : undefined}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00cfa8] hover:bg-[#00e6bc] disabled:opacity-50 disabled:cursor-not-allowed text-[#070b14] transition-all cursor-pointer shadow-[0_0_12px_rgba(0,207,168,0.2)]"
                        >
                          Confirm Offline Completion
                        </button>
                      )}

                      {/* Request cancellation trigger */}
                      {deal.status === "IN_PROGRESS" && !deal.cancellationPending && (
                        <button
                          onClick={() => {
                            setCancelRequestDeal(deal);
                            setCancelReason("");
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
                        >
                          Request Cancellation
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation Modal for Seller Deal Completion */}
      {confirmingDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Confirm Deal Completion</h3>
            <p className="text-xs text-[#8493a8] leading-relaxed">
              By confirming, you acknowledge that you have finalized the handover of{" "}
              <strong className="text-white">{confirmingDeal.businessTitle}</strong> to{" "}
              <strong className="text-white">{confirmingDeal.buyerName}</strong> for the agreed price of{" "}
              <strong className="text-[#00cfa8]">
                {confirmingDeal.currency} {Number(confirmingDeal.agreedPrice).toLocaleString()}
              </strong>
              .
            </p>
            <div className="p-3 rounded-xl bg-blue-500/[0.08] border border-blue-500/20 text-[11px] text-[#9cc4ff]">
              <strong>Notice:</strong> Once both you and the buyer confirm, the listing status will automatically be set to SOLD.
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                {actionError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setConfirmingDeal(null);
                  setActionError("");
                }}
                disabled={submittingAction}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmCompletion(confirmingDeal.id)}
                disabled={submittingAction}
                className="flex-1 py-2.5 rounded-xl bg-[#00cfa8] hover:bg-[#00e6bc] disabled:opacity-50 text-[#070b14] font-bold text-xs transition-colors cursor-pointer"
              >
                {submittingAction ? "Confirming..." : "Yes, Confirm Completion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Seller Requesting Cancellation */}
      {cancelRequestDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Request Deal Cancellation</h3>
            <p className="text-xs text-[#8493a8] leading-relaxed">
              Cancellation requires mutual agreement from the buyer. Please state why you are requesting to cancel this deal for{" "}
              <strong className="text-white">{cancelRequestDeal.businessTitle}</strong>.
            </p>

            <form onSubmit={handleRequestCancellation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c7d2e0] mb-1.5">
                  Cancellation Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Failure of buyer to meet closing timelines, regulatory impediments..."
                  className="w-full bg-[#0a101d] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-[#4f6380] focus:outline-none focus:border-rose-400 transition-colors resize-none"
                />
              </div>

              {actionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                  {actionError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancelRequestDeal(null);
                    setActionError("");
                  }}
                  disabled={submittingAction}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !cancelReason.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {submittingAction ? "Submitting..." : "Send Cancellation Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Seller Responding to Cancellation */}
      {respondCancelDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {respondCancelDeal.agree ? "Agree to Cancel Deal?" : "Decline Cancellation Request?"}
            </h3>
            <p className="text-xs text-[#8493a8] leading-relaxed">
              {respondCancelDeal.agree
                ? "Both parties will have agreed to cancel. The deal will transition to CANCELLED and your listing will be released for new offers."
                : "You are declining the buyer's cancellation request. The deal will remain IN_PROGRESS."}
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                {actionError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setRespondCancelDeal(null);
                  setActionError("");
                }}
                disabled={submittingAction}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/5 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleRespondCancellation}
                disabled={submittingAction}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  respondCancelDeal.agree
                    ? "bg-rose-500 hover:bg-rose-600 text-white"
                    : "bg-[#00cfa8] hover:bg-[#00e6bc] text-[#070b14]"
                }`}
              >
                {submittingAction ? "Processing..." : respondCancelDeal.agree ? "Confirm Cancellation" : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
