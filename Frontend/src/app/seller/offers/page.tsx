"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Offer, OfferStatus } from "@/types/offer";
import SellerSidebar from "@/components/SellerSidebar";

export default function SellerOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | OfferStatus>("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Accept/Reject modals
  const [acceptingOffer, setAcceptingOffer] = useState<Offer | null>(null);
  const [rejectingOffer, setRejectingOffer] = useState<Offer | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ data: Offer[] }>("/offers/received");
      setOffers(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load received offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    apiRequest<{ data: Offer[] }>("/offers/received")
      .then((res) => {
        if (!ignore) {
          setOffers(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load received offers");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleAcceptOffer = async () => {
    if (!acceptingOffer) return;

    setSubmittingAction(true);
    setActionError("");
    try {
      const res = await apiRequest<{ data: Offer }>(`/offers/${acceptingOffer.id}/accept`, {
        method: "PUT",
      });
      setAcceptingOffer(null);
      setActionSuccess(
        `Offer for ${acceptingOffer.businessTitle} accepted! Deal #${res.data.dealId || ""} has been created and is now in progress.`
      );
      await fetchOffers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to accept offer");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOffer) return;

    setSubmittingAction(true);
    setActionError("");
    try {
      await apiRequest(`/offers/${rejectingOffer.id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      });
      setRejectingOffer(null);
      setRejectReason("");
      await fetchOffers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reject offer");
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredOffers = offers.filter((o) => {
    if (filter === "ALL") return true;
    return o.status === filter;
  });

  const pendingCount = offers.filter((o) => o.status === "PENDING").length;

  const statusBadge = (status: OfferStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            ⏳ Pending Action
          </span>
        );
      case "ACCEPTED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            ✓ Accepted
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            ✕ Rejected
          </span>
        );
      case "WITHDRAWN":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            ⊘ Withdrawn
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
        badges={{ inquiries: pendingCount }}
      />

      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-12 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cfa8] block mb-1">
              Seller Acquisitions Desk
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Received Acquisition Offers
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/seller/deals"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00cfa8] hover:bg-[#00e6bc] text-[#070b14] transition-colors"
            >
              Go to My Deals Room →
            </Link>
          </div>
        </div>

        {/* Global Success Banner */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#0d1424] border border-white/5 rounded-2xl overflow-x-auto no-scrollbar">
          {(["ALL", "PENDING", "ACCEPTED", "REJECTED"] as const).map((tab) => {
            const count = tab === "ALL" ? offers.length : offers.filter((o) => o.status === tab).length;
            const active = filter === tab;
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
                <span>{tab === "ALL" ? "All Offers" : tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
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
            <button onClick={fetchOffers} className="text-xs underline font-semibold hover:text-rose-300">
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#8493a8]">Loading offers...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOffers.length === 0 && (
          <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-[#8493a8]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">No Offers Received</h3>
            <p className="text-xs text-[#8493a8] max-w-sm mx-auto leading-relaxed">
              When prospective buyers submit purchase proposals for your listings, they will appear here for your review and acceptance.
            </p>
          </div>
        )}

        {/* Offers List */}
        {!loading && filteredOffers.length > 0 && (
          <div className="space-y-4">
            {filteredOffers.map((offer) => (
              <div
                key={offer.id}
                className="glass-panel p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#627288] block mb-1">
                      Offer #{offer.id} • {offer.businessTitle}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      From: <span className="text-[#00cfa8]">{offer.buyerName}</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {statusBadge(offer.status)}
                    <span className="text-xl sm:text-2xl font-black text-[#00cfa8] tabular-nums">
                      {offer.currency} {Number(offer.amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {offer.message && (
                  <div className="p-3.5 rounded-xl bg-[#0a101d] border border-white/5 text-xs text-[#9eb1ca] leading-relaxed">
                    <strong className="text-white block mb-0.5">Buyer Proposal Terms:</strong>
                    {offer.message}
                  </div>
                )}

                {offer.rejectionReason && (
                  <div className="p-3.5 rounded-xl bg-rose-500/[0.07] border border-rose-500/20 text-xs text-rose-300">
                    <strong>Recorded Reason:</strong> {offer.rejectionReason}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#627288] pt-1">
                  <span>
                    Received: {new Date(offer.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    {offer.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => {
                            setRejectingOffer(offer);
                            setRejectReason("");
                            setActionError("");
                          }}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setAcceptingOffer(offer);
                            setActionError("");
                          }}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#00cfa8] hover:bg-[#00e6bc] text-[#070b14] transition-all cursor-pointer shadow-[0_0_12px_rgba(0,207,168,0.2)]"
                        >
                          Accept Offer & Open Deal
                        </button>
                      </>
                    )}

                    {offer.status === "ACCEPTED" && (
                      <Link
                        href="/seller/deals"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#00cfa8] hover:bg-[#00e6bc] text-[#070b14] transition-colors inline-flex items-center gap-1"
                      >
                        Manage Active Deal →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Confirmation Modal for Accepting Offer */}
      {acceptingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Accept Acquisition Offer</h3>
            <p className="text-xs text-[#8493a8] leading-relaxed">
              You are about to accept the offer of{" "}
              <strong className="text-[#00cfa8]">
                {acceptingOffer.currency} {Number(acceptingOffer.amount).toLocaleString()}
              </strong>{" "}
              from <strong className="text-white">{acceptingOffer.buyerName}</strong> for{" "}
              <strong className="text-white">{acceptingOffer.businessTitle}</strong>.
            </p>

            <div className="p-3.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/25 text-[11px] text-[#e0b571] space-y-1">
              <strong>Workflow Automation:</strong>
              <p>
                1. An active Deal record will be generated automatically at this agreed price.
              </p>
              <p>
                2. Any other pending offers on this business listing will be automatically rejected.
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                {actionError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setAcceptingOffer(null);
                  setActionError("");
                }}
                disabled={submittingAction}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptOffer}
                disabled={submittingAction}
                className="flex-1 py-2.5 rounded-xl bg-[#00cfa8] hover:bg-[#00e6bc] disabled:opacity-50 text-[#070b14] font-bold text-xs transition-colors cursor-pointer"
              >
                {submittingAction ? "Accepting..." : "Confirm & Accept Offer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Rejecting Offer */}
      {rejectingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Reject Offer</h3>
            <p className="text-xs text-[#8493a8] leading-relaxed">
              Rejecting this offer will notify <strong className="text-white">{rejectingOffer.buyerName}</strong>. You may provide an optional reason.
            </p>

            <form onSubmit={handleRejectOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c7d2e0] mb-1.5">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Valuation is below minimum expectations, cash terms required..."
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
                    setRejectingOffer(null);
                    setActionError("");
                  }}
                  disabled={submittingAction}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {submittingAction ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
