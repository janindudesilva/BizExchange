"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      const response = await apiRequest<{ data: Business[] }>("/favorites");
      setBusinesses(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#d8e4f0] tracking-wide">
          My Favorites
        </h1>
        <p className="text-[#4f6380] mt-2 text-sm">
          Businesses you've saved for later.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-[#121c32] border border-white/5 p-6 rounded-2xl h-56 animate-pulse"
            >
              <div className="h-6 w-2/3 bg-white/5 rounded mb-4" />
              <div className="h-4 w-1/2 bg-white/5 rounded mb-2" />
              <div className="h-4 w-full bg-white/5 rounded mb-4" />
              <div className="h-8 w-1/3 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="bg-[#121c32] border border-white/5 p-8 rounded-2xl text-center">
          <p className="text-[#8092ab]">You haven't saved any businesses yet.</p>
          <button
            onClick={() => router.push("/businesses")}
            className="mt-4 bg-[#00cfa8] text-[#080c15] px-6 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm"
          >
            Browse Businesses
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </main>
  );
}
