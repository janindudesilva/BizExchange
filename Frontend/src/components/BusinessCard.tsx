"use client";

import Link from "next/link";
import { useState } from "react";
import { Business } from "@/types/business";
import { apiRequest } from "@/lib/api";

interface Props {
  business: Business;
}

export default function BusinessCard({ business }: Props) {
  const [isFavorited, setIsFavorited] = useState(business.isFavorited || false);
  const [loading, setLoading] = useState(false);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    
    if (!token || role !== "BUYER") {
      return;
    }

    setLoading(true);
    try {
      if (isFavorited) {
        await apiRequest(`/favorites/${business.id}`, { method: "DELETE" });
      } else {
        await apiRequest(`/favorites/${business.id}`, { method: "POST" });
      }
      setIsFavorited(!isFavorited);
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl transition-colors hover:border-white/10 relative">
      <button
        onClick={toggleFavorite}
        disabled={loading}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50"
        title={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <svg
          className={`w-6 h-6 transition-colors ${
            isFavorited ? "text-rose-500 fill-rose-500" : "text-[#8092ab]"
          }`}
          fill={isFavorited ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      <h2 className="text-xl font-semibold mb-2 text-[#d8e4f0] pr-10">{business.title}</h2>

      <p className="text-sm text-[#4f6380] mb-2">
        {business.category} • {business.location}
      </p>

      <p className="text-[#8092ab] text-sm mb-4 line-clamp-3">
        {business.description}
      </p>

      <p className="text-[#00cfa8] font-bold mb-4">
        LKR {business.askingPrice.toLocaleString()}
      </p>

      <p className="text-sm text-[#4f6380] mb-4">
        Seller: {business.sellerName}
      </p>

      <Link
        href={`/businesses/${business.id}`}
        className="inline-block bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm"
      >
        View Details
      </Link>
    </div>
  );
}
