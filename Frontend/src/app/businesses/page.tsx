"use client";

import { useEffect, useState } from "react";
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

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter States
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState("");

  // Pagination States
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const size = 9;

  // Debounce search keyword
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(0);
    }, 400);
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

  const inputClass =
    "w-full bg-[#121c32] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 transition-colors text-sm";

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#d8e4f0] tracking-wide">
          Available Businesses
        </h1>
        <p className="text-[#4f6380] mt-2 text-sm">
          Browse approved businesses available for purchase.
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl h-fit space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-sm font-bold tracking-wider text-[#d8e4f0]">
              FILTERS
            </h2>
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#00cfa8] hover:text-[#00e6bc] transition-colors font-semibold"
            >
              Reset All
            </button>
          </div>

          <div className="space-y-4">
            {/* Search Input */}
            <div>
              <label className="block text-[10px] tracking-widest text-[#4f6380] mb-1 font-bold">
                SEARCH KEYWORD
              </label>
              <input
                className={inputClass}
                placeholder="Search title, desc..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[10px] tracking-widest text-[#4f6380] mb-1 font-bold">
                CATEGORY
              </label>
              <select
                className={inputClass}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Input */}
            <div>
              <label className="block text-[10px] tracking-widest text-[#4f6380] mb-1 font-bold">
                LOCATION
              </label>
              <input
                className={inputClass}
                placeholder="Enter city or district..."
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setPage(0);
                }}
              />
            </div>

            {/* Price Inputs */}
            <div>
              <label className="block text-[10px] tracking-widest text-[#4f6380] mb-1 font-bold">
                ASKING PRICE RANGE (LKR)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={inputClass}
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(0);
                  }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={inputClass}
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

        {/* Listings Result Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center text-sm text-[#8092ab]">
            <div>
              {!loading && (
                <span>
                  Showing {businesses.length} of {totalElements} listings
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
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
              <p className="text-[#8092ab]">No businesses match your search criteria.</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-5">
                {businesses.map((business) => (
                  <BusinessCard key={business.id} business={business} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 rounded-lg border border-white/10 text-sm text-[#8092ab] hover:text-[#c7d2e0] hover:bg-white/[0.04] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1 text-sm text-[#8092ab]">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-9 h-9 rounded-lg border transition-all ${
                          page === i
                            ? "bg-[#00cfa8] border-[#00cfa8] text-[#080c15] font-bold"
                            : "border-white/10 hover:bg-white/[0.04] hover:text-[#c7d2e0]"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="px-4 py-2 rounded-lg border border-white/10 text-sm text-[#8092ab] hover:text-[#c7d2e0] hover:bg-white/[0.04] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}