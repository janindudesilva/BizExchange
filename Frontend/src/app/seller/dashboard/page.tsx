"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";

type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

interface SellerProfile {
  fullName: string;
  verificationStatus: VerificationStatus;
}

interface Business {
  id: number;
  title: string;
  askingPrice: number;
  status: string;
}

const NAV_ITEMS: {
  label: string;
  href?: string;
  badge?: number;
}[] = [
  { label: "Overview", href: "/seller/dashboard" },
  { label: "My Listing", href: "/seller/businesses" },
  { label: "Inquiries" },
  { label: "Offers" },
  { label: "Active Deals" },
  { label: "Payments" },
  { label: "Reviews" },
  { label: "Support" },
  { label: "Notifications" },
];

function formatCompactLkr(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  if (value >= 1_000_000) return `LKR ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `LKR ${(value / 1_000).toFixed(0)}K`;
  return `LKR ${value}`;
}

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
}

function verificationLabel(status: VerificationStatus | null): string {
  if (status === "APPROVED") return "Verified Seller";
  if (status === "PENDING") return "Verification Pending";
  if (status === "REJECTED") return "Verification Rejected";
  return "Seller";
}

export default function SellerDashboardPage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  }

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLoaded(true);
      return;
    }

    Promise.allSettled([
      apiRequest<SellerProfile>(`/seller/profile/${userId}`),
      apiRequest<{ data: Business[] }>(`/businesses/seller/${userId}`),
    ]).then(([profileResult, businessResult]) => {
      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value);
      }
      if (businessResult.status === "fulfilled") {
        setBusinesses(businessResult.value.data ?? []);
      }
      setLoaded(true);
    });
  }, []);

  const primaryListing = businesses[0];
  const verificationStatus = profile?.verificationStatus ?? null;

  return (
      <div
          className="min-h-screen bg-[#080c15] text-[#c7d2e0] flex"
          style={{
            fontFamily:
                'ui-monospace, "SFMono-Regular", "JetBrains Mono", Menlo, Consolas, "Liberation Mono", monospace',
          }}
      >
        {/* ── Sidebar ── */}
        <aside className="w-[248px] shrink-0 fixed inset-y-0 left-0 bg-[#0d1220] border-r border-white/5 flex flex-col justify-between">
          <div>
            <div className="px-6 py-6 border-b border-white/5">
              <div className="text-[#00cfa8] font-bold tracking-wide text-lg leading-tight">
                BIZEXCHANGE
              </div>
              <div className="text-[#4f6380] text-[11px] tracking-[0.15em] mt-1">
                SELLER PORTAL
              </div>
            </div>

            <nav className="py-3">
              {NAV_ITEMS.map((item) => {
                const isActive = item.label === "Overview";
                const content = (
                    <div
                        className={`flex items-center justify-between px-6 py-3 text-sm border-l-2 transition-colors ${
                            isActive
                                ? "border-[#00cfa8] bg-[#0c212a] text-[#00cfa8] font-medium"
                                : "border-transparent text-[#8092ab] hover:text-[#c7d2e0] hover:bg-white/[0.02]"
                        }`}
                    >
                      <span>{item.label}</span>
                      {item.badge ? (
                          <span className="text-[10px] bg-[#f5a623] text-[#1a1204] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {item.badge}
                      </span>
                      ) : null}
                    </div>
                );

                return item.href ? (
                    <Link key={item.label} href={item.href}>
                      {content}
                    </Link>
                ) : (
                    <div key={item.label} className="cursor-default">
                      {content}
                    </div>
                );
              })}
            </nav>
          </div>

          <div className="px-6 py-5 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#057a6b] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                {initials(profile?.fullName)}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-[#d8e4f0] truncate">
                  {profile?.fullName ?? "Seller"}
                </div>
                <div className="text-[11px] text-[#4f6380] truncate">
                  {verificationLabel(verificationStatus)}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex-1 ml-[248px] flex flex-col">
          {/* Top bar */}
          <header className="flex items-center justify-between px-10 py-5 border-b border-white/5">
            <div>
              <div className="text-[11px] tracking-[0.15em] text-[#4f6380]">
                OVERVIEW
              </div>
              <div className="text-sm text-[#8092ab] mt-1">
                {primaryListing
                    ? `${primaryListing.title} · BL-${primaryListing.id}`
                    : "No listing yet"}
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[#8092ab]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>

              <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen((open) => !open)}
                    className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-[#057a6b] text-white text-xs font-semibold flex items-center justify-center">
                    {initials(profile?.fullName)}
                  </div>
                  <span className="text-sm text-[#d8e4f0]">
                    {profile?.fullName ?? "Seller"}
                  </span>
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-[calc(100%+10px)] w-56 bg-[#121c32] border border-white/10 rounded-xl shadow-lg overflow-hidden z-10">
                      <Link
                          href="/seller/profile"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-3 text-sm text-[#c7d2e0] hover:bg-white/[0.04] hover:text-[#00cfa8] transition-colors"
                      >
                        Profile &amp; Verification
                      </Link>
                      <button
                          onClick={logout}
                          className="w-full text-left px-4 py-3 text-sm text-[#c7d2e0] hover:bg-white/[0.04] hover:text-red-400 transition-colors border-t border-white/5"
                      >
                        Log out
                      </button>
                    </div>
                )}
              </div>
            </div>
          </header>

          <main className="px-10 py-8">
            <h1 className="text-2xl font-bold text-[#d8e4f0] tracking-wide">
              DASHBOARD OVERVIEW
            </h1>
            <p className="text-[#4f6380] text-sm mt-2 mb-8">
              Your business exchange activity at a glance
            </p>

            {loaded && !primaryListing && (
                <div className="bg-[#121c32] border border-white/5 rounded-2xl p-6 mb-8">
                  <p className="text-[#c7d2e0] text-sm">
                    You don&apos;t have a listing yet.{" "}
                    <Link href="/seller/businesses/create" className="text-[#00cfa8] hover:underline">
                      Create your first business listing
                    </Link>{" "}
                    to see it reflected here.
                  </p>
                </div>
            )}

            {verificationStatus === "PENDING" && (
                <div className="bg-[#1c1608] border border-[#f5a623]/20 text-[#f5a623] rounded-2xl px-5 py-3 mb-8 text-sm">
                  Your account is unverified. An admin needs to approve your seller
                  profile before your listings go live.
                </div>
            )}

            {verificationStatus === "REJECTED" && (
                <div className="bg-[#1c0c0c] border border-red-500/20 text-red-400 rounded-2xl px-5 py-3 mb-8 text-sm">
                  Your seller verification was rejected. Please contact support for
                  more details.
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-5">
              <div className="bg-[#121c32] border border-white/5 rounded-2xl p-5">
                <div className="text-[11px] tracking-[0.1em] text-[#4f6380]">
                  ASKING PRICE
                </div>
                <div className="text-2xl font-bold text-[#00cfa8] mt-3">
                  {formatCompactLkr(primaryListing?.askingPrice)}
                </div>
                <div className="text-xs text-[#4f6380] mt-2">
                  {primaryListing ? `Listing BL-${primaryListing.id} · ${primaryListing.status}` : "No active listing"}
                </div>
              </div>

              <div className="bg-[#121c32] border border-white/5 rounded-2xl p-5">
                <div className="text-[11px] tracking-[0.1em] text-[#4f6380]">
                  TOTAL INQUIRIES
                </div>
                <div className="text-2xl font-bold text-[#d8e4f0] mt-3">—</div>
                <div className="text-xs text-[#4f6380] mt-2">Coming soon</div>
              </div>

              <div className="bg-[#121c32] border border-white/5 rounded-2xl p-5">
                <div className="text-[11px] tracking-[0.1em] text-[#4f6380]">
                  PENDING OFFER
                </div>
                <div className="text-2xl font-bold text-[#f5a623] mt-3">—</div>
                <div className="text-xs text-[#4f6380] mt-2">Coming soon</div>
              </div>

              <div className="bg-[#121c32] border border-white/5 rounded-2xl p-5">
                <div className="text-[11px] tracking-[0.1em] text-[#4f6380]">
                  ACTIVE DEAL
                </div>
                <div className="text-2xl font-bold text-[#00cfa8] mt-3">—</div>
                <div className="text-xs text-[#4f6380] mt-2">Coming soon</div>
              </div>
            </div>

            {/* Lower section */}
            <div className="grid grid-cols-[1fr_320px] gap-5 mt-5">
              <div className="bg-[#121c32] border border-white/5 rounded-2xl p-6">
                <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-4">
                  RECENT ACTIVITY
                </div>
                <div className="text-sm text-[#4f6380] py-6 text-center">
                  Activity from inquiries, offers, and deals will show up here once
                  those features are live.
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="bg-[#121c32] border border-white/5 rounded-2xl p-6">
                  <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-4">
                    LISTING PERFORMANCE
                  </div>
                  <div className="space-y-3">
                    {[
                      ["Profile Views", "—"],
                      ["Watchlisted By", "—"],
                      ["Total Inquiries", "—"],
                      ["Offers Received", "—"],
                      ["Avg. Response Time", "—"],
                    ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <span className="text-[#8092ab]">{label}</span>
                          <span className="text-[#d8e4f0] font-medium">{value}</span>
                        </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#121c32] border border-white/5 rounded-2xl p-6">
                  <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-4">
                    QUICK ACTIONS
                  </div>
                  <div className="flex flex-col gap-3 text-sm">
                    <Link href="/seller/businesses/create" className="text-[#00cfa8] hover:underline">
                      → Create a new listing
                    </Link>
                    <Link href="/seller/businesses" className="text-[#00cfa8] hover:underline">
                      → Manage my listings
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
  );
}