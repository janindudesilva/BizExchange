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

    if (!token || role !== "BUYER") return;

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

  const sellerInitials = (business.sellerName || "Seller")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="group glass-panel rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.45)] hover:border-[#00cfa8]/18">
      {/* Left-border accent on hover */}
      <div className="absolute left-0 top-4 bottom-4 w-[2px] rounded-r-full bg-[#00cfa8]/0 group-hover:bg-[#00cfa8]/60 transition-all duration-300" />

      <div>
        {/* Top Badges & Favorite Button */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full badge-emerald">
              {business.category || "Business"}
            </span>
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium text-[#8493a8] bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
              <svg className="w-3 h-3 mr-1 text-[#52637a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate max-w-[110px] sm:max-w-none">{business.location || "Confidential"}</span>
            </span>
          </div>

          <button
            onClick={toggleFavorite}
            disabled={loading}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              isFavorited
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "bg-white/[0.04] text-[#627288] hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.06]"
            }`}
            title={isFavorited ? "Remove from favorites" : "Add to favorites"}
            aria-label="Favorite button"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isFavorited ? "scale-110" : ""}`}
              fill={isFavorited ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>

        {/* Business Title */}
        <Link href={`/businesses/${business.id}`}>
          <h2 className="text-lg font-bold text-white group-hover:text-[#00cfa8] transition-colors leading-snug tracking-tight mb-2 line-clamp-2">
            {business.title}
          </h2>
        </Link>

        {/* Description */}
        <p className="text-[#8493a8] text-sm leading-relaxed line-clamp-2 mb-4">
          {business.description || "Verified business opportunity available on BizExchange."}
        </p>
      </div>

      <div>
        {/* Seller Info */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0e1e38] to-[#162238] border border-[#00cfa8]/20 flex items-center justify-center text-[10px] font-bold text-[#00cfa8] flex-shrink-0">
              {sellerInitials}
            </div>
            <span className="text-sm text-[#8493a8] font-medium truncate max-w-[130px]">
              {business.sellerName}
            </span>
          </div>

          <span className="inline-flex items-center text-[10px] text-[#00cfa8] bg-[#00cfa8]/10 px-2 py-0.5 rounded-full border border-[#00cfa8]/20 font-medium flex-shrink-0">
            <svg className="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Verified
          </span>
        </div>

        {/* Price & CTA */}
        <div className="flex flex-wrap sm:flex-nowrap items-end justify-between gap-3">
          <div>
            <span className="block text-[10px] font-semibold tracking-wider uppercase text-[#52637a] mb-0.5">
              Asking Price
            </span>
            <div className="text-xl font-black text-[#00cfa8] tabular-nums tracking-tight">
              LKR {business.askingPrice?.toLocaleString()}
            </div>
          </div>

          <Link
            href={`/businesses/${business.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#070b14] bg-[#00cfa8] hover:bg-[#00e6bc] transition-all shadow-[0_0_12px_rgba(0,207,168,0.2)] hover:shadow-[0_0_18px_rgba(0,207,168,0.38)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <span>View Details</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
