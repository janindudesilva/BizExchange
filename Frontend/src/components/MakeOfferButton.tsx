"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Offer } from "@/types/offer";

interface MakeOfferButtonProps {
  businessId: number;
  businessTitle: string;
  askingPrice: number;
  currency?: string;
  isSold?: boolean;
}

export default function MakeOfferButton({
  businessId,
  businessTitle,
  askingPrice,
  currency = "LKR",
  isSold = false,
}: MakeOfferButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>(askingPrice ? askingPrice.toString() : "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOffer, setSuccessOffer] = useState<Offer | null>(null);

  const [role] = useState<string | null>(() => (typeof window !== "undefined" ? localStorage.getItem("role") : null));
  const [token] = useState<string | null>(() => (typeof window !== "undefined" ? localStorage.getItem("token") : null));
  const [existingPendingOffer, setExistingPendingOffer] = useState<Offer | null>(null);

  useEffect(() => {
    if (token && role === "BUYER") {
      apiRequest<{ data: Offer[] }>("/offers/sent")
        .then((res) => {
          const match = res.data?.find(
            (o) => o.businessId === businessId && o.status === "PENDING"
          );
          if (match) {
            setExistingPendingOffer(match);
          }
        })
        .catch(() => {});
    }
  }, [businessId, role, token]);

  const handleOpen = () => {
    if (!token) {
      router.push("/login");
      return;
    }
    if (role !== "BUYER") {
      alert("Only registered buyers can submit offers. Please sign in with a Buyer account.");
      return;
    }
    if (existingPendingOffer) {
      router.push("/buyer/offers");
      return;
    }
    setIsOpen(true);
    setError("");
    setSuccessOffer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive offer amount.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<{ data: Offer }>("/offers", {
        method: "POST",
        body: JSON.stringify({
          businessId,
          amount: parsedAmount,
          currency,
          message: message.trim() || undefined,
        }),
      });

      setSuccessOffer(response.data);
      setExistingPendingOffer(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit offer.");
    } finally {
      setLoading(false);
    }
  };

  if (isSold) {
    return (
      <div className="w-full text-center py-3 px-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs font-semibold">
        Listing Marked as Sold — Offers Closed
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-2 bg-[#14233c] hover:bg-[#1a2d4d] text-[#00cfa8] hover:text-[#00e6bc] border border-[#00cfa8]/30 hover:border-[#00cfa8]/60 font-bold py-3.5 px-6 rounded-xl transition-all shadow-[0_0_16px_rgba(0,207,168,0.12)] hover:shadow-[0_0_24px_rgba(0,207,168,0.22)] text-sm cursor-pointer"
      >
        <svg className="w-4 h-4 text-[#00cfa8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          {existingPendingOffer ? "View Your Pending Offer" : "Make an Acquisition Offer"}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity overflow-y-auto">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative max-h-[92dvh] overflow-y-auto my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cfa8] block mb-1">
                  Formal Acquisition Offer
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {businessTitle}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-[#8493a8] hover:text-white flex items-center justify-center text-sm transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {successOffer ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[#00cfa8] flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <h4 className="text-lg font-bold text-white">Offer Submitted Successfully!</h4>
                <p className="text-xs text-[#8493a8] max-w-sm mx-auto leading-relaxed">
                  Your offer of <strong className="text-white">{currency} {Number(successOffer.amount).toLocaleString()}</strong> has been delivered to the seller. You can track, manage, or withdraw this offer in your dashboard.
                </p>
                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/buyer/offers"
                    className="bg-[#00cfa8] hover:bg-[#00e6bc] text-[#070b14] font-bold py-2.5 px-5 rounded-xl text-xs transition-colors"
                  >
                    View in My Offers →
                  </Link>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-xs text-[#8493a8] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Asking Price Comparison */}
                <div className="bg-[#0e1626] border border-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
                  <span className="text-[#8493a8]">Certified Asking Price:</span>
                  <span className="text-white font-semibold tabular-nums">
                    {currency} {askingPrice.toLocaleString()}
                  </span>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-semibold text-[#c7d2e0] mb-1.5">
                    Your Offer Amount ({currency}) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#00cfa8]">
                      {currency}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 4500000"
                      className="w-full bg-[#0a101d] border border-white/10 rounded-xl pl-14 pr-4 py-3 text-sm text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8] transition-colors"
                    />
                  </div>
                </div>

                {/* Optional Message */}
                <div>
                  <label className="block text-xs font-semibold text-[#c7d2e0] mb-1.5">
                    Proposal Terms / Optional Message
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Include terms of payment, diligence timeframe, or reasons for this valuation..."
                    className="w-full bg-[#0a101d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8] transition-colors resize-none"
                  />
                </div>

                {/* Terms Disclaimer */}
                <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-[11px] text-[#e0b571] leading-relaxed">
                  <strong>Binding Foundation:</strong> If the seller accepts your offer, an active Deal will be created at this agreed price. Offline completion requires separate confirmation by both parties.
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !amount}
                    className="flex-1 bg-[#00cfa8] hover:bg-[#00e6bc] disabled:opacity-50 text-[#070b14] font-bold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-[#070b14] border-t-transparent rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Formal Offer</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
