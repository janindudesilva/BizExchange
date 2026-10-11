"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Deal, DealStatus } from "@/types/deal";

export default function BuyerDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | DealStatus>("ALL");

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

  // Review modal state
  const [reviewingDeal, setReviewingDeal] = useState<Deal | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmittedDeals, setReviewSubmittedDeals] = useState<number[]>([]);

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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingDeal) return;

    setSubmittingAction(true);
    setActionError("");
    try {
      await apiRequest(`/reviews/seller/${reviewingDeal.sellerId}`, {
        method: "POST",
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      setReviewSubmittedDeals((prev) => [...prev, reviewingDeal.id]);
      setReviewingDeal(null);
      setReviewComment("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredDeals = deals.filter((d) => {
    if (filter === "ALL") return true;
    return d.status === filter;
  });

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
            ✓ Completed
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
    <main className="min-h-screen bg-[#080c15] text-[#c7d2e0] py-8 sm:py-12 px-4 sm:px-6 lg:px-12">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumbs & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-xs text-[#627288]">
            <Link href="/buyer/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-white font-medium">My Deals</span>
          </nav>
          <div className="flex gap-2">
            <Link
              href="/buyer/offers"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              ← My Sent Offers
            </Link>
            <Link
              href="/businesses"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#00cfa8] hover:bg-[#00e6bc] text-[#070b14] transition-colors"
            >
              Browse Listings
            </Link>
          </div>
        </div>

        {/* Title & Platform Disclaimer */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden space-y-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cfa8] block mb-1">
              Active Transactions & Acquisition Closings
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Deals Room
            </h1>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-500/[0.08] border border-blue-500/20 text-xs text-[#9cc4ff] leading-relaxed flex items-start gap-2.5">
            <span className="text-base leading-none">ℹ️</span>
            <div>
              <strong>Mutual Offline Completion:</strong> A deal reaches COMPLETED status only when both the buyer and seller independently confirm completion of the offline asset transition. This platform does not process escrow or verified financial payments.
            </div>
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

        {/* Loading State */}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">No Deals in this View</h3>
            <p className="text-xs text-[#8493a8] max-w-sm mx-auto leading-relaxed">
              When a seller accepts one of your offers, a deal is generated here with mutual confirmation workflows.
            </p>
          </div>
        )}

        {/* Deals Cards */}
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
                  {/* Top Bar: Title & Status */}
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
                        Seller: <strong className="text-[#c7d2e0]">{deal.sellerName}</strong>
                      </p>
                    </div>

                    {/* Agreed Price independently of listing edits */}
                    <div className="sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-[#627288] block">
                        Agreed Acquisition Price
                      </span>
                      <div className="text-xl sm:text-2xl font-black text-[#00cfa8] tabular-nums">
                        {deal.currency} {Number(deal.agreedPrice).toLocaleString()}
                      </div>
                      <span className="text-[10px] text-[#52637a]">
                        Locked at offer acceptance
                      </span>
                    </div>
                  </div>

                  {/* Confirmation Progress Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        buyerConfirmed
                          ? "bg-emerald-500/[0.06] border-emerald-500/25 text-emerald-300"
                          : "bg-[#0d1424] border-white/5 text-[#8493a8]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-white">Your Confirmation (Buyer)</span>
                        <span>{buyerConfirmed ? "✓ Confirmed" : "⏳ Pending"}</span>
                      </div>
                      <p className="text-[11px] opacity-80">
                        {buyerConfirmed
                          ? `Confirmed on ${new Date(deal.buyerConfirmedAt!).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}`
                          : "You have not yet confirmed offline completion."}
                      </p>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        sellerConfirmed
                          ? "bg-emerald-500/[0.06] border-emerald-500/25 text-emerald-300"
                          : "bg-[#0d1424] border-white/5 text-[#8493a8]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-white">Seller Confirmation</span>
                        <span>{sellerConfirmed ? "✓ Confirmed" : "⏳ Pending"}</span>
                      </div>
                      <p className="text-[11px] opacity-80">
                        {sellerConfirmed
                          ? `Confirmed on ${new Date(deal.sellerConfirmedAt!).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}`
                          : "Awaiting seller confirmation of asset transition."}
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
                          {isRequesterOfCancellation ? "You" : deal.cancellationRequestedByName || "Seller"}
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

                  {/* Notes / Admin cancellation explanation */}
                  {deal.notes && deal.status === "CANCELLED" && (
                    <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-white/5 text-xs text-[#8493a8]">
                      <strong className="text-white block mb-0.5">Cancellation Record:</strong>
                      {deal.notes}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-[#627288]">
                      Deal created: {new Date(deal.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Confirm completion button */}
                      {deal.status === "IN_PROGRESS" && !buyerConfirmed && (
                        <button
                          onClick={() => setConfirmingDeal(deal)}
                          disabled={deal.cancellationPending}
                          title={deal.cancellationPending ? "Completion blocked while cancellation is pending" : undefined}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00cfa8] hover:bg-[#00e6bc] disabled:opacity-50 disabled:cursor-not-allowed text-[#070b14] transition-all cursor-pointer shadow-[0_0_12px_rgba(0,207,168,0.2)]"
                        >
                          Confirm Offline Completion
                        </button>
                      )}

                      {/* Cancellation Request trigger */}
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

                      {/* Review Seller Trigger on Completed Deal */}
                      {deal.status === "COMPLETED" && (
                        <div>
                          {reviewSubmittedDeals.includes(deal.id) ? (
                            <span className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#00cfa8] bg-[#00cfa8]/10 border border-[#00cfa8]/20">
                              ✓ Review Submitted
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setReviewingDeal(deal);
                                setReviewRating(5);
                                setReviewComment("");
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f5a623] hover:bg-[#ffb43b] text-[#070b14] transition-all cursor-pointer"
                            >
                              ★ Review Seller
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Deal Completion */}
      {confirmingDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Confirm Deal Completion</h3>
            <p className="text-xs text-[#8493a8] leading-relaxed">
              By confirming, you acknowledge that the offline transaction and asset transition for{" "}
              <strong className="text-white">{confirmingDeal.businessTitle}</strong> (Agreed Price:{" "}
              <strong className="text-[#00cfa8]">
                {confirmingDeal.currency} {Number(confirmingDeal.agreedPrice).toLocaleString()}
              </strong>
              ) has been finalized outside the platform.
            </p>
            <div className="p-3 rounded-xl bg-blue-500/[0.08] border border-blue-500/20 text-[11px] text-[#9cc4ff]">
              <strong>Notice:</strong> Once both you and the seller confirm, the listing will be marked permanently as SOLD and closed.
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

      {/* Modal for Requesting Cancellation */}
      {cancelRequestDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Request Deal Cancellation</h3>
            <p className="text-xs text-[#8493a8] leading-relaxed">
              Cancellation requires mutual agreement from the seller. Please state why you are requesting to cancel this deal for{" "}
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
                  placeholder="e.g. Due diligence uncovered material liabilities, inability to secure funding..."
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

      {/* Modal for Responding to Cancellation */}
      {respondCancelDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {respondCancelDeal.agree ? "Agree to Cancel Deal?" : "Decline Cancellation Request?"}
            </h3>
            <p className="text-xs text-[#8493a8] leading-relaxed">
              {respondCancelDeal.agree
                ? "Both parties will have agreed to cancel. The deal will transition to CANCELLED and the business will be released for new offers."
                : "You are declining the seller's cancellation request. The deal will remain IN_PROGRESS."}
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

      {/* Modal for Reviewing Seller (Allowed only after COMPLETED deal) */}
      {reviewingDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Review Seller: {reviewingDeal.sellerName}</h3>
              <button
                onClick={() => setReviewingDeal(null)}
                className="w-7 h-7 rounded-lg bg-white/5 text-[#8493a8] hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#8493a8]">
              Your deal for <strong className="text-white">{reviewingDeal.businessTitle}</strong> is completed. Share your feedback on the seller&apos;s diligence and communication.
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c7d2e0] mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl transition-colors ${
                        star <= reviewRating ? "text-yellow-400" : "text-[#394a63]"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c7d2e0] mb-1.5">
                  Review Comment (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Describe your closing experience..."
                  className="w-full bg-[#0a101d] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8] transition-colors resize-none"
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
                  onClick={() => setReviewingDeal(null)}
                  disabled={submittingAction}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex-1 py-2.5 rounded-xl bg-[#00cfa8] hover:bg-[#00e6bc] disabled:opacity-50 text-[#070b14] font-bold text-xs transition-colors cursor-pointer"
                >
                  {submittingAction ? "Submitting..." : "Submit Verified Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
