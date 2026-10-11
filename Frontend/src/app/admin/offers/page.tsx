"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Offer, OfferStatus } from "@/types/offer";

const ITEMS_PER_PAGE = 10;

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OfferStatus>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ data: Offer[] }>("/offers/admin/all");
      setOffers(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platform offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    apiRequest<{ data: Offer[] }>("/offers/admin/all")
      .then((res) => {
        if (!ignore) {
          setOffers(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load platform offers");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        o.businessTitle.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.sellerName.toLowerCase().includes(q) ||
        o.id.toString().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [offers, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / ITEMS_PER_PAGE));
  const paginatedOffers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOffers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOffers, currentPage]);

  const handleStatusChange = (status: "ALL" | OfferStatus) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const statusBadge = (status: OfferStatus) => {
    switch (status) {
      case "PENDING":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">Pending</span>;
      case "ACCEPTED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Accepted</span>;
      case "REJECTED":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/20">Rejected</span>;
      case "WITHDRAWN":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/20">Withdrawn</span>;
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
            <span className="text-white font-medium">Offers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Platform Offers Desk</h1>
          <p className="text-xs text-[#8493a8] mt-1">Audit, monitor, and filter all acquisition offers submitted across BizExchange.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/deals"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00cfa8] hover:bg-[#00e6bc] text-[#070b14] transition-colors"
          >
            View Platform Deals →
          </Link>
        </div>
      </div>

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
            placeholder="Search by business, buyer, seller, ID..."
            className="w-full bg-[#0a101d] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
          {(["ALL", "PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const).map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => handleStatusChange(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-[#00cfa8] text-[#070b14]"
                    : "text-[#8493a8] hover:text-white hover:bg-white/5"
                }`}
              >
                {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={fetchOffers} className="underline font-semibold">Retry</button>
        </div>
      )}

      {/* Table Container */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#8493a8]">Loading offers...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8493a8]">No offers matching your filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1626] border-b border-white/5 text-[#627288] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Offer ID</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Buyer</th>
                  <th className="py-3 px-4">Seller</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#c7d2e0]">
                {paginatedOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">#{offer.id}</td>
                    <td className="py-3.5 px-4 max-w-xs truncate font-medium text-white">
                      {offer.businessTitle}
                    </td>
                    <td className="py-3.5 px-4">{offer.buyerName}</td>
                    <td className="py-3.5 px-4">{offer.sellerName}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#00cfa8] tabular-nums">
                      {offer.currency} {Number(offer.amount).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">{statusBadge(offer.status)}</td>
                    <td className="py-3.5 px-4 text-[#8493a8]">
                      {new Date(offer.createdAt).toLocaleDateString(undefined, { dateStyle: "short" })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedOffer(offer)}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && filteredOffers.length > 0 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-[#8493a8]">
            <span>
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredOffers.length)} of {filteredOffers.length} offers
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

      {/* Details Modal */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#627288] block">Offer Details</span>
                <h3 className="text-base font-bold text-white">Offer #{selectedOffer.id}</h3>
              </div>
              <button
                onClick={() => setSelectedOffer(null)}
                className="w-7 h-7 rounded-lg bg-white/5 text-[#8493a8] hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#0a101d] rounded-xl border border-white/5">
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Business</span>
                  <Link href={`/businesses/${selectedOffer.businessId}`} className="text-white hover:underline font-semibold">
                    {selectedOffer.businessTitle}
                  </Link>
                </div>
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Offer Amount</span>
                  <span className="text-[#00cfa8] font-bold text-sm">
                    {selectedOffer.currency} {Number(selectedOffer.amount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Buyer</span>
                  <span className="text-[#c7d2e0] font-medium">{selectedOffer.buyerName} (ID: {selectedOffer.buyerId})</span>
                </div>
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Seller</span>
                  <span className="text-[#c7d2e0] font-medium">{selectedOffer.sellerName} (ID: {selectedOffer.sellerId})</span>
                </div>
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Status</span>
                  <div>{statusBadge(selectedOffer.status)}</div>
                </div>
                <div>
                  <span className="text-[#627288] block text-[10px] uppercase font-bold">Associated Deal</span>
                  <span className="text-[#c7d2e0] font-mono">
                    {selectedOffer.dealId ? `#${selectedOffer.dealId}` : "None"}
                  </span>
                </div>
              </div>

              {selectedOffer.message && (
                <div className="p-3 bg-[#0a101d] rounded-xl border border-white/5">
                  <span className="text-[#627288] block text-[10px] uppercase font-bold mb-1">Buyer Message</span>
                  <p className="text-[#c7d2e0] leading-relaxed">{selectedOffer.message}</p>
                </div>
              )}

              {selectedOffer.rejectionReason && (
                <div className="p-3 bg-rose-500/[0.07] rounded-xl border border-rose-500/20 text-rose-300">
                  <span className="block text-[10px] uppercase font-bold mb-1">Rejection Reason</span>
                  <p>{selectedOffer.rejectionReason}</p>
                </div>
              )}

              <div className="text-[11px] text-[#627288] pt-1 space-y-0.5">
                <p>Created: {new Date(selectedOffer.createdAt).toLocaleString()}</p>
                <p>Last Updated: {new Date(selectedOffer.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedOffer(null)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
