"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import BusinessCard from "@/components/BusinessCard";
import { Business } from "@/types/business";

export default function FavoritesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "BUYER") {
      router.push("/login");
      return;
    }

    fetchFavorites();
  }, [router]);

  const fetchFavorites = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<{ data: any[] }>("/favorites");
      const mapped: Business[] = (response.data || []).map((item: any) => ({
        ...item,
        // Ensure businessId is used for correct routing to /businesses/[id]
        id: item.businessId ?? item.id,
        isFavorited: true,
      }));
      setBusinesses(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved businesses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#00cfa8] mb-1 block">
            Investor Watchlist
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Saved Businesses
          </h1>
          <p className="text-xs text-[#8493a8] mt-1">
            Track price updates, status changes, and review your confidential acquisition targets.
          </p>
        </div>

        <Link
          href="/businesses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00cfa8] hover:text-[#00e6bc] transition-colors"
        >
          <span>Discover more businesses</span>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="glass-panel p-6 rounded-2xl border border-white/5 h-64 animate-pulse flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-2 mb-4">
                  <div className="h-5 w-20 bg-white/5 rounded-full" />
                </div>
                <div className="h-5 w-3/4 bg-white/5 rounded mb-3" />
                <div className="h-3 w-full bg-white/5 rounded mb-2" />
                <div className="h-3 w-4/5 bg-white/5 rounded" />
              </div>
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <div className="h-6 w-24 bg-white/5 rounded" />
                <div className="h-8 w-20 bg-white/5 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 text-rose-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Your Watchlist is Empty</h3>
          <p className="text-xs text-[#8493a8] mb-6 leading-relaxed">
            Click the heart icon on any business card across the marketplace to add it to your confidential diligence watchlist.
          </p>
          <Link
            href="/businesses"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00cfa8] text-[#070b14] hover:bg-[#00e6bc] transition-all shadow-[0_0_14px_rgba(0,207,168,0.25)]"
          >
            Browse Marketplace Listings
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </main>
  );
}
