"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";

/* ── Types ── */
interface UserProfile {
  fullName: string;
  email: string;
  phone?: string;
}

interface Inquiry {
  id: number;
  businessId: number;
  businessTitle: string;
  sellerName: string;
  initialMessage: string;
  status: string;
  createdAt: string;
}

interface SavedBusiness {
  id: number;
  businessId: number;
  title: string;
  category: string;
  sellerName: string;
  description: string;
  location: string;
  askingPrice: number;
  status: string;
  savedAt: string;
}

interface Ticket {
  id: number;
  subject: string;
  status: string;
  createdAt: string;
}

/* ── Sidebar nav ── */
const NAV_ITEMS: { label: string; href?: string; icon: string }[] = [
  { label: "Overview", href: "/buyer/dashboard", icon: "grid" },
  { label: "Browse Businesses", href: "/businesses", icon: "search" },
  { label: "My Inquiries", href: "/businesses/my-inquiries", icon: "inbox" },
  { label: "Favorites", href: "/favorites", icon: "heart" },
  { label: "Support Tickets", href: "/support/my-tickets", icon: "help" },
];

/* ── Helpers ── */
function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatLkr(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `LKR ${Number(value).toLocaleString()}`;
}

function statusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    case "ACTIVE":
    case "APPROVED":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    case "REJECTED":
      return "bg-red-500/15 text-red-400 border-red-500/20";
    case "CLOSED":
      return "bg-slate-500/15 text-slate-400 border-slate-500/20";
    default:
      return "bg-white/5 text-[#8092ab] border-white/10";
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  // Normalize bare ISO strings (no timezone offset) to UTC so all browsers parse them consistently
  const normalized = /Z|[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : dateStr + "Z";
  const then = new Date(normalized).getTime();
  // Clamp to zero: minor clock drift between server and client must never produce negative results
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(normalized).toLocaleDateString();
}

/* ── SVG Icons ── */
function NavIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "grid":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "search":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      );
    case "inbox":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M22 12h-6l-2 3H10l-2-3H2" />
          <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
        </svg>
      );
    case "heart":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      );
    case "help":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    default:
      return null;
  }
}

function StatIcon({ type }: { type: string }) {
  const cls = "w-5 h-5";
  switch (type) {
    case "inquiries":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      );
    case "active":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "saved":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      );
    case "tickets":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── Main Component ── */
export default function BuyerDashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [savedBusinesses, setSavedBusinesses] = useState<SavedBusiness[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loaded, setLoaded] = useState(() => typeof window !== "undefined" && !localStorage.getItem("token"));
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Close dropdown on outside click */
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

  /* Fetch all dashboard data */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    let ignore = false;
    Promise.allSettled([
      apiRequest<{ data: UserProfile }>("/users/me"),
      apiRequest<{ data: Inquiry[] }>("/inquiries/sent"),
      apiRequest<{ data: SavedBusiness[] }>("/favorites"),
      apiRequest<{ data: Ticket[] }>("/tickets/my"),
    ]).then(([profileRes, inquiriesRes, favoritesRes, ticketsRes]) => {
      if (ignore) return;
      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value.data ?? (profileRes.value as unknown as UserProfile));
      }
      if (inquiriesRes.status === "fulfilled") {
        setInquiries(inquiriesRes.value.data ?? []);
      }
      if (favoritesRes.status === "fulfilled") {
        setSavedBusinesses(favoritesRes.value.data ?? []);
      }
      if (ticketsRes.status === "fulfilled") {
        setTickets(ticketsRes.value.data ?? []);
      }
      setLoaded(true);
    });

    return () => {
      ignore = true;
    };
  }, []);

  /* Computed stats */
  const totalInquiries = inquiries.length;
  const activeInquiries = inquiries.filter(
    (i) => i.status?.toUpperCase() === "ACTIVE" || i.status?.toUpperCase() === "APPROVED"
  ).length;
  const totalSaved = savedBusinesses.length;
  const totalTickets = tickets.length;

  const recentInquiries = [...inquiries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentSaved = [...savedBusinesses]
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 4);

  const STAT_CARDS = [
    {
      label: "TOTAL INQUIRIES",
      value: totalInquiries,
      icon: "inquiries",
      color: "#6366f1",
      bgTint: "rgba(99,102,241,0.08)",
    },
    {
      label: "ACTIVE CONVERSATIONS",
      value: activeInquiries,
      icon: "active",
      color: "#00cfa8",
      bgTint: "rgba(0,207,168,0.08)",
    },
    {
      label: "SAVED BUSINESSES",
      value: totalSaved,
      icon: "saved",
      color: "#f5a623",
      bgTint: "rgba(245,166,35,0.08)",
    },
    {
      label: "SUPPORT TICKETS",
      value: totalTickets,
      icon: "tickets",
      color: "#ec4899",
      bgTint: "rgba(236,72,153,0.08)",
    },
  ];

  return (
    <div
      className="min-h-screen bg-[#080c15] text-[#c7d2e0] flex relative overflow-x-hidden"
    >
      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-30 lg:hidden transition-opacity"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`w-[248px] shrink-0 fixed inset-y-0 left-0 bg-[#0d1220] border-r border-white/5 flex flex-col justify-between z-40 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          <div className="px-5 py-5 border-b border-white/[0.07] flex items-center justify-between">
            <div>
              <div className="text-[#00cfa8] font-bold tracking-tight text-base leading-tight">
                BizExchange
              </div>
              <div className="text-[#4f6380] text-[11px] tracking-wider mt-0.5 uppercase">
                Buyer Portal
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#4f6380] hover:text-white p-1"
            >
              ✕
            </button>
          </div>

          <nav className="py-3">
            {NAV_ITEMS.map((item) => {
              const isActive = item.label === "Overview";
              return (
                <Link
                  key={item.label}
                  href={item.href ?? "#"}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className={`sidebar-nav-item mx-2 ${isActive ? "active" : ""}`}>
                    <NavIcon type={item.icon} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile footer */}
        <div className="px-4 py-5 border-t border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#60a5fa] to-[#3b82f6] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              {initials(profile?.fullName)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#d8e4f0] truncate">
                {profile?.fullName ?? "Buyer"}
              </div>
              <div className="text-[11px] text-[#4f6380] truncate">
                {profile?.email ?? "buyer@bizexchange.lk"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 ml-0 lg:ml-[248px] flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-8 lg:px-10 py-4 sm:py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-[#8092ab] hover:text-white hover:bg-white/5 touch-target"
              aria-label="Toggle Sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <div className="text-[10px] sm:text-[11px] tracking-[0.15em] text-[#4f6380]">
                BUYER DASHBOARD
              </div>
              <div className="text-xs sm:text-sm text-[#8092ab] mt-0.5 truncate max-w-[170px] sm:max-w-none">
                Welcome back, {profile?.fullName?.split(" ")[0] ?? "Buyer"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Notifications bell */}
            <Link
              href="/businesses"
              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[#8092ab] hover:text-[#00cfa8] hover:border-[#00cfa8]/30 transition-colors"
              title="Browse Businesses"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </Link>

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-[#057a6b] text-white text-xs font-semibold flex items-center justify-center">
                  {initials(profile?.fullName)}
                </div>
                <span className="text-sm text-[#d8e4f0]">
                  {profile?.fullName ?? "Buyer"}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-56 bg-[#121c32] border border-white/10 rounded-xl shadow-lg overflow-hidden z-10">
                  <Link
                    href="/businesses"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-[#c7d2e0] hover:bg-white/[0.04] hover:text-[#00cfa8] transition-colors"
                  >
                    Browse Businesses
                  </Link>
                  <Link
                    href="/support/my-tickets"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-[#c7d2e0] hover:bg-white/[0.04] hover:text-[#00cfa8] transition-colors border-t border-white/5"
                  >
                    Support
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

        <main className="px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
          <h1 className="text-xl sm:text-2xl font-bold text-[#d8e4f0] tracking-wide">
            DASHBOARD OVERVIEW
          </h1>
          <p className="text-[#4f6380] text-xs sm:text-sm mt-1 mb-6 sm:mb-8">
            Your business acquisition activity at a glance
          </p>

          {/* Loading skeleton */}
          {!loaded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-[#121c32] border border-white/5 rounded-2xl p-5 animate-pulse h-[120px]"
                />
              ))}
            </div>
          )}

          {loaded && (
            <>
              {/* ── Stat Cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {STAT_CARDS.map((card) => (
                  <div
                    key={card.label}
                    className="bg-[#121c32] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] tracking-[0.1em] text-[#4f6380]">
                        {card.label}
                      </div>
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: card.bgTint, color: card.color }}
                      >
                        <StatIcon type={card.icon} />
                      </div>
                    </div>
                    <div
                      className="text-3xl font-bold mt-3"
                      style={{ color: card.color }}
                    >
                      {loaded ? card.value : "—"}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Main content grid ── */}
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 mt-5">
                {/* Recent Inquiries */}
                <div className="bg-[#121c32] border border-white/5 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="text-[11px] tracking-[0.1em] text-[#4f6380]">
                      RECENT INQUIRIES
                    </div>
                    <Link
                      href="/businesses/my-inquiries"
                      className="text-xs text-[#00cfa8] hover:underline"
                    >
                      View all →
                    </Link>
                  </div>

                  {recentInquiries.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="text-[#4f6380] mb-3">
                        <svg
                          className="w-12 h-12 mx-auto opacity-40"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={1}
                        >
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                      </div>
                      <p className="text-sm text-[#4f6380]">No inquiries yet</p>
                      <Link
                        href="/businesses"
                        className="text-sm text-[#00cfa8] hover:underline mt-2 inline-block"
                      >
                        Browse businesses to get started →
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto no-scrollbar">
                      <div className="min-w-[480px]">
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_120px_100px_80px] gap-3 text-[10px] tracking-[0.1em] text-[#4f6380] pb-3 border-b border-white/5">
                          <span>BUSINESS</span>
                          <span>SELLER</span>
                          <span>STATUS</span>
                          <span className="text-right">TIME</span>
                        </div>
                        {recentInquiries.map((inq) => (
                          <Link
                            key={inq.id}
                            href="/businesses/my-inquiries"
                            className="grid grid-cols-[1fr_120px_100px_80px] gap-3 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-center"
                          >
                            <div className="min-w-0">
                              <div className="text-sm text-[#d8e4f0] truncate">
                                {inq.businessTitle}
                              </div>
                              <div className="text-[11px] text-[#4f6380] truncate mt-0.5">
                                {inq.initialMessage}
                              </div>
                            </div>
                            <span className="text-sm text-[#8092ab] truncate">
                              {inq.sellerName}
                            </span>
                            <span>
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(
                                  inq.status
                                )}`}
                              >
                                {inq.status}
                              </span>
                            </span>
                            <span className="text-[11px] text-[#4f6380] text-right">
                              {timeAgo(inq.createdAt)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-5">
                  {/* Saved Businesses */}
                  <div className="bg-[#121c32] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[11px] tracking-[0.1em] text-[#4f6380]">
                        SAVED BUSINESSES
                      </div>
                      <Link
                        href="/favorites"
                        className="text-xs text-[#00cfa8] hover:underline"
                      >
                        View all →
                      </Link>
                    </div>

                    {recentSaved.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="text-[#4f6380] mb-2">
                          <svg
                            className="w-10 h-10 mx-auto opacity-40"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={1}
                          >
                            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                          </svg>
                        </div>
                        <p className="text-xs text-[#4f6380]">
                          No saved businesses yet
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentSaved.map((biz) => (
                          <Link
                            key={biz.id}
                            href={`/businesses/${biz.businessId}`}
                            className="block p-3 bg-[#0d1220] rounded-xl border border-white/5 hover:border-[#00cfa8]/20 transition-all duration-300 group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-[#d8e4f0] font-medium truncate group-hover:text-[#00cfa8] transition-colors">
                                  {biz.title}
                                </div>
                                <div className="text-[11px] text-[#4f6380] mt-1">
                                  {biz.category} · {biz.location}
                                </div>
                              </div>
                              <div className="text-sm text-[#00cfa8] font-semibold ml-3 shrink-0">
                                {formatLkr(biz.askingPrice)}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-[#121c32] border border-white/5 rounded-2xl p-6">
                    <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-4">
                      QUICK ACTIONS
                    </div>
                    <div className="flex flex-col gap-3 text-sm">
                      <Link
                        href="/businesses"
                        className="flex items-center gap-2 text-[#00cfa8] hover:underline transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <circle cx="11" cy="11" r="8" />
                          <path d="M21 21l-4.35-4.35" />
                        </svg>
                        Browse businesses
                      </Link>
                      <Link
                        href="/businesses/my-inquiries"
                        className="flex items-center gap-2 text-[#00cfa8] hover:underline transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        View my inquiries
                      </Link>
                      <Link
                        href="/favorites"
                        className="flex items-center gap-2 text-[#00cfa8] hover:underline transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                        </svg>
                        Saved businesses
                      </Link>
                      <Link
                        href="/support/my-tickets"
                        className="flex items-center gap-2 text-[#00cfa8] hover:underline transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Contact support
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
        <footer className="py-6 px-4 sm:px-8 border-t border-white/5 text-center text-xs text-[#4f6380]">
          © {new Date().getFullYear()} BizExchange Buyer Portal. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
