"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Offer, OfferStatus } from "@/types/offer";

export default function BuyerOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | OfferStatus>("ALL");

  // Withdrawal state
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const [confirmWithdrawOffer, setConfirmWithdrawOffer] = useState<Offer | null>(null);
  const [actionError, setActionError] = useState("");

  const fetchOffers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ data: Offer[] }>("/offers/sent");
      setOffers(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    apiRequest<{ data: Offer[] }>("/offers/sent")
      .then((res) => {
        if (!ignore) {
          setOffers(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load offers");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleWithdraw = async (offerId: number) => {
    setWithdrawingId(offerId);
    setActionError("");
    try {
      await apiRequest(`/offers/${offerId}/withdraw`, {
        method: "PUT",
      });
      setConfirmWithdrawOffer(null);
      await fetchOffers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to withdraw offer");
    } finally {
      setWithdrawingId(null);
    }
  };

  const filteredOffers = offers.filter((o) => {
    if (filter === "ALL") return true;
    return o.status === filter;
  });

  const statusBadge = (status: OfferStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            ⏳ Pending Response
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
    <main className="min-h-screen bg-[#080c15] text-[#c7d2e0] py-8 sm:py-12 px-4 sm:px-6 lg:px-12">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-xs text-[#627288]">
            <Link href="/buyer/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-white font-medium">My Offers</span>
          </nav>
          <div className="flex gap-2">
            <Link
              href="/buyer/deals"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              View My Deals →
            </Link>
            <Link
              href="/businesses"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#00cfa8] hover:bg-[#00e6bc] text-[#070b14] transition-colors"
            >
              Browse Listings
            </Link>
          </div>
        </div>

        {/* Page Title & Intro */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="max-w-2xl">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cfa8] block mb-1">
              Buyer Acquisition Portfolio
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Sent Offers
            </h1>
            <p className="text-xs sm:text-sm text-[#8493a8] mt-2 leading-relaxed">
              Track your formal proposals submitted to sellers. If a seller accepts your offer, an active Deal is initiated automatically. Pending offers can be withdrawn at any time before acceptance.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#0d1424] border border-white/5 rounded-2xl overflow-x-auto no-scrollbar">
          {(["ALL", "PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const).map((tab) => {
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
            <button
              onClick={fetchOffers}
              className="text-xs underline font-semibold hover:text-rose-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#8493a8]">Loading your offers...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOffers.length === 0 && (
          <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-[#8493a8]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">No Offers Found</h3>
            <p className="text-xs text-[#8493a8] max-w-sm mx-auto leading-relaxed">
              {filter === "ALL"
                ? "You haven't submitted any offers yet. Browse verified listings to make an acquisition proposal."
                : `No offers currently under status "${filter}".`}
            </p>
            <Link
              href="/businesses"
              className="inline-flex items-center gap-1.5 bg-[#00cfa8] text-[#070b14] px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#00e6bc] transition-all"
            >
              Browse Marketplace →
            </Link>
          </div>
        )}

        {/* Offers List */}
        {!loading && filteredOffers.length > 0 && (
          <div className="space-y-4">
            {filteredOffers.map((offer) => (
              <div
                key={offer.id}
                className="glass-panel p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 hover:border-white/10 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                  <div>
                    <Link
                      href={`/businesses/${offer.businessId}`}
                      className="text-base font-bold text-white hover:text-[#00cfa8] transition-colors"
                    >
                      {offer.businessTitle}
                    </Link>
                    <p className="text-xs text-[#8493a8] mt-0.5">
                      Seller: <span className="text-[#c7d2e0] font-medium">{offer.sellerName}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(offer.status)}
                    <span className="text-lg sm:text-xl font-black text-[#00cfa8] tabular-nums">
                      {offer.currency} {Number(offer.amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {offer.message && (
                  <div className="p-3.5 rounded-xl bg-[#0a101d] border border-white/5 text-xs text-[#9eb1ca] leading-relaxed">
                    <strong className="text-white block mb-0.5">Your Proposal Message:</strong>
                    {offer.message}
                  </div>
                )}

                {offer.rejectionReason && (
                  <div className="p-3.5 rounded-xl bg-rose-500/[0.07] border border-rose-500/20 text-xs text-rose-300">
                    <strong>Rejection Reason:</strong> {offer.rejectionReason}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#627288] pt-1">
                  <span>
                    Submitted: {new Date(offer.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    {offer.status === "PENDING" && (
                      <button
                        onClick={() => setConfirmWithdrawOffer(offer)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
                      >
                        Withdraw Offer
                      </button>
                    )}

                    {offer.status === "ACCEPTED" && (
                      <Link
                        href="/buyer/deals"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#00cfa8] hover:bg-[#00e6bc] text-[#070b14] transition-colors inline-flex items-center gap-1"
                      >
                        Go to Deal Room →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Withdrawal */}
      {confirmWithdrawOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Confirm Offer Withdrawal</h3>
            <p className="text-xs text-[#8493a8] leading-relaxed">
              Are you sure you want to withdraw your offer of{" "}
              <strong className="text-white">
                {confirmWithdrawOffer.currency} {Number(confirmWithdrawOffer.amount).toLocaleString()}
              </strong>{" "}
              for <strong className="text-white">{confirmWithdrawOffer.businessTitle}</strong>? The seller will be notified that this offer was retracted.
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                {actionError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setConfirmWithdrawOffer(null);
                  setActionError("");
                }}
                disabled={withdrawingId !== null}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/5 transition-colors"
              >
                Keep Offer
              </button>
              <button
                onClick={() => handleWithdraw(confirmWithdrawOffer.id)}
                disabled={withdrawingId !== null}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                {withdrawingId ? "Withdrawing..." : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
