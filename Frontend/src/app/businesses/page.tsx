"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import BusinessCard from "@/components/BusinessCard";
import { Business } from "@/types/business";

interface Category {
  id: number;
  name: string;
}

interface PaginatedData<T> {
  content: T[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
}

function BusinessesContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("categoryId") || "";

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter States
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState("");

  // Pagination States
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const size = 9;

  // Mobile Filter Accordion State
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync categoryId if URL param changes
  useEffect(() => {
    const urlCat = searchParams.get("categoryId");
    if (urlCat) {
      setCategoryId(urlCat);
      setPage(0);
    }
  }, [searchParams]);

  // Debounce search keyword
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(0);
    }, 350);
    return () => clearTimeout(handler);
  }, [keyword]);

  // Load categories once
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await apiRequest<{ data: Category[] }>("/categories");
        setCategories(response.data || []);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    loadCategories();
  }, []);

  // Fetch businesses when filters change
  useEffect(() => {
    fetchFilteredBusinesses();
  }, [debouncedKeyword, categoryId, minPrice, maxPrice, location, page]);

  const fetchFilteredBusinesses = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedKeyword) params.append("keyword", debouncedKeyword);
      if (categoryId) params.append("categoryId", categoryId);
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (location) params.append("location", location);
      params.append("page", String(page));
      params.append("size", String(size));

      const response = await apiRequest<{ data: PaginatedData<Business> }>(
        `/businesses?${params.toString()}`
      );
      setBusinesses(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);
      setTotalElements(response.data.totalElements || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setKeyword("");
    setCategoryId("");
    setMinPrice("");
    setMaxPrice("");
    setLocation("");
    setPage(0);
  };

  const hasActiveFilters = Boolean(
    keyword || categoryId || minPrice || maxPrice || location
  );

  return (
    <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10">
      {/* Directory Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#00cfa8] mb-1 block">
            Marketplace Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Verified Businesses for Sale
          </h1>
          <p className="text-xs text-[#8493a8] mt-1.5">
            Institutional due-diligence ready listings audited by verification officers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!loading && (
            <span className="text-xs font-medium text-[#8493a8] glass-panel px-3 py-1.5 rounded-lg border border-white/5">
              <span className="text-white font-bold tabular-nums">{totalElements}</span> opportunities found
            </span>
          )}
        </div>
      </div>

      {/* Quick Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          <button
            onClick={() => {
              setCategoryId("");
              setPage(0);
            }}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-target ${
              categoryId === ""
                ? "bg-[#00cfa8] text-[#070b14] shadow-[0_0_12px_rgba(0,207,168,0.25)]"
                : "glass-panel text-[#8493a8] hover:text-white border border-white/5 hover:border-white/15"
            }`}
          >
            All Sectors
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryId(String(cat.id));
                setPage(0);
              }}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-target ${
                categoryId === String(cat.id)
                  ? "bg-[#00cfa8] text-[#070b14] shadow-[0_0_12px_rgba(0,207,168,0.25)]"
                  : "glass-panel text-[#8493a8] hover:text-white border border-white/5 hover:border-white/15"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Mobile Filter Toggle Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="w-full flex items-center justify-between p-3 rounded-xl glass-panel border border-white/10 text-xs font-semibold text-white touch-target"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#00cfa8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filters & Search</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#00cfa8]" />
            )}
          </div>
          <span className="text-[#00cfa8] text-xs font-bold">{mobileFiltersOpen ? "Hide Filters ▲" : "Show Filters ▼"}</span>
        </button>
      </div>

      {/* Main Grid: Sidebar + Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Left Filter Sidebar */}
        <aside className={`lg:col-span-1 ${mobileFiltersOpen ? "block" : "hidden lg:block"}`}>
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/5 space-y-6 sticky top-24">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#00cfa8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <h2 className="text-xs font-bold tracking-wider uppercase text-white">
                  Refine Search
                </h2>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-[#00cfa8] hover:text-[#00e6bc] transition-colors font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Keyword Search */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#627288] mb-1.5">
                  Keyword or Title
                </label>
                <div className="relative">
                  <input
                    className="input-premium pl-8"
                    placeholder="e.g. SaaS, Bakery, Colombo..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  <svg className="w-3.5 h-3.5 text-[#627288] absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#627288] mb-1.5">
                  Industry Sector
                </label>
                <select
                  className="input-premium cursor-pointer"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="" className="bg-[#0c1322]">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-[#0c1322]">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Input */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#627288] mb-1.5">
                  Location / Region
                </label>
                <input
                  className="input-premium"
                  placeholder="e.g. Western Province, Kandy..."
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setPage(0);
                  }}
                />
              </div>

              {/* Asking Price Range */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-[#627288] mb-1.5">
                  Asking Price Range (LKR)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min Price"
                    className="input-premium tabular-nums"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      setPage(0);
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Max Price"
                    className="input-premium tabular-nums"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Listings Grid */}
        <section className="lg:col-span-3 space-y-6">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/[0.06] flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="skeleton h-5 w-20 rounded-full" />
                      <div className="skeleton h-5 w-16 rounded-md" />
                    </div>
                    <div className="skeleton h-5 w-4/5 rounded" />
                    <div className="skeleton h-4 w-full rounded" />
                    <div className="skeleton h-4 w-3/4 rounded" />
                  </div>
                  <div className="pt-4 border-t border-white/[0.05] flex justify-between items-center">
                    <div className="skeleton h-7 w-28 rounded" />
                    <div className="skeleton h-9 w-24 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border border-white/5 text-center max-w-md mx-auto my-12">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4 text-[#8493a8]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">No businesses found</h3>
              <p className="text-sm text-[#8493a8] mb-5 leading-relaxed">
                No active listings match your current filters. Try relaxing your search criteria or resetting filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#00cfa8] text-[#070b14] hover:bg-[#00e6bc] transition-all"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {businesses.map((business) => (
                  <BusinessCard key={business.id} business={business} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3.5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:hover:bg-transparent transition-all touch-target min-h-[40px]"
                  >
                    ← Prev
                  </button>

                  <div className="flex flex-wrap gap-1 text-xs">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-semibold transition-all touch-target ${
                          page === i
                            ? "bg-[#00cfa8] text-[#070b14] shadow-[0_0_10px_rgba(0,207,168,0.3)]"
                            : "border border-white/10 text-[#8493a8] hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.max(0, Math.min(totalPages - 1, p + 1)))}
                    disabled={page >= totalPages - 1 || totalPages <= 1}
                    className="px-3.5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#8493a8] hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:hover:bg-transparent transition-all touch-target min-h-[40px]"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function BusinessesPageFallback() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.05]">
        <div className="space-y-2">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-8 w-72 rounded" />
          <div className="skeleton h-4 w-56 rounded" />
        </div>
        <div className="skeleton h-8 w-36 rounded-lg" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/[0.06] flex flex-col gap-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-5 w-16 rounded-md" />
              </div>
              <div className="skeleton h-5 w-4/5 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
            <div className="pt-4 border-t border-white/[0.05] flex justify-between items-center">
              <div className="skeleton h-7 w-28 rounded" />
              <div className="skeleton h-9 w-24 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  return (
    <Suspense fallback={<BusinessesPageFallback />}>
      <BusinessesContent />
    </Suspense>
  );
}