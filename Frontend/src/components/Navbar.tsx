"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiRequest } from "@/lib/api";

interface Notification {
  id: number;
  title: string;
  message: string;
  link?: string;
  status: string;
  createdAt: string;
}

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

const MenuIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [token, setToken] = useState<string | null>(() => typeof window !== "undefined" ? localStorage.getItem("token") : null);
  const [role, setRole] = useState<string | null>(() => typeof window !== "undefined" ? localStorage.getItem("role") : null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [scrolled, setScrolled] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setShowNotifications(false);
  }

  // Track scroll for border opacity
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const response = await apiRequest<{ data: number }>("/notifications/unread/count");
      setUnreadCount(response.data || 0);
    } catch (err: unknown) {
      const errObj = err as { status?: number; message?: string };
      if (errObj?.status === 401 || errObj?.message?.includes("Unauthorized")) {
        setToken(null);
        setRole(null);
        setUnreadCount(0);
        return;
      }
      if (err instanceof TypeError && err.message === "Failed to fetch") return;
      console.error("Failed to fetch unread count", err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const response = await apiRequest<{ data: Notification[] }>("/notifications");
      setNotifications(response.data || []);
    } catch (err: unknown) {
      const errObj = err as { status?: number; message?: string };
      if (errObj?.status === 401 || errObj?.message?.includes("Unauthorized")) {
        setToken(null);
        setRole(null);
        setNotifications([]);
        return;
      }
      console.error("Failed to fetch notifications", err);
    }
  }, []);

  useEffect(() => {
    const handleAuthChange = () => {
      const currentToken = localStorage.getItem("token");
      setToken(currentToken);
      setRole(localStorage.getItem("role"));
      if (!currentToken) {
        setUnreadCount(0);
        setNotifications([]);
      }
    };

    window.addEventListener("auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    async function loadInitialCount() {
      if (!localStorage.getItem("token")) return;
      try {
        const response = await apiRequest<{ data: number }>("/notifications/unread/count");
        if (!ignore) {
          setUnreadCount(response.data || 0);
        }
      } catch (err: unknown) {
        const errObj = err as { status?: number; message?: string };
        if (errObj?.status === 401 || errObj?.message?.includes("Unauthorized")) {
          if (!ignore) {
            setToken(null);
            setRole(null);
            setUnreadCount(0);
          }
          return;
        }
        if (err instanceof TypeError && err.message === "Failed to fetch") return;
        console.error("Failed to fetch unread count", err);
      }
    }

    loadInitialCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [token, fetchUnreadCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ" })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) fetchNotifications();
    setShowNotifications(!showNotifications);
  };

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    setToken(null);
    setRole(null);
    setUnreadCount(0);
    setNotifications([]);
    window.dispatchEvent(new Event("auth-change"));
    router.push("/");
  }

  // Seller portal and Buyer dashboard ship their own bespoke sidebar shell
  if (pathname?.startsWith("/seller/") || pathname?.startsWith("/buyer/dashboard")) {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  const navLinkClass = (path: string) =>
    `relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? "text-white"
        : "text-[#8493a8] hover:text-white"
    }`;

  const activeDot = (path: string) =>
    isActive(path) ? (
      <span className="absolute inset-x-0 -bottom-0.5 h-px bg-[#00cfa8] rounded-full" />
    ) : null;

  const roleColors: Record<string, string> = {
    ADMIN: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    SELLER: "text-[#00cfa8] border-[#00cfa8]/30 bg-[#00cfa8]/10",
    BUYER: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    SUPPORT_AGENT: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    VERIFICATION_OFFICER: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full backdrop-blur-xl transition-all duration-300 ${
        scrolled
          ? "bg-[#070b14]/92 border-b border-white/[0.09] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]"
          : "bg-[#070b14]/80 border-b border-white/[0.05]"
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00cfa8] to-[#00b28e] flex items-center justify-center font-black text-[#070b14] text-base shadow-[0_0_16px_rgba(0,207,168,0.3)] group-hover:shadow-[0_0_22px_rgba(0,207,168,0.45)] transition-all">
              B
            </div>
            <span className="text-base font-bold tracking-tight text-white flex items-center">
              Biz<span className="text-[#00cfa8]">Exchange</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-0.5">
            <Link href="/businesses" className={navLinkClass("/businesses")}>
              Browse
              {activeDot("/businesses")}
            </Link>

            {token && role === "BUYER" && (
              <>
                <Link href="/buyer/dashboard" className={navLinkClass("/buyer/dashboard")}>
                  Dashboard
                  {activeDot("/buyer/dashboard")}
                </Link>
                <Link href="/businesses/my-inquiries" className={navLinkClass("/businesses/my-inquiries")}>
                  Inquiries
                  {activeDot("/businesses/my-inquiries")}
                </Link>
                <Link href="/favorites" className={navLinkClass("/favorites")}>
                  Favorites
                  {activeDot("/favorites")}
                </Link>
              </>
            )}

            {token && role === "SELLER" && (
              <Link
                href="/seller/dashboard"
                className="ml-1 px-3 py-1.5 rounded-md text-sm font-semibold text-[#00cfa8] hover:bg-[#00cfa8]/10 transition-colors flex items-center gap-1"
              >
                Seller Portal
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}

            {token && role === "ADMIN" && (
              <>
                <Link href="/admin/dashboard" className={navLinkClass("/admin/dashboard")}>
                  Admin
                  {activeDot("/admin/dashboard")}
                </Link>
                <Link href="/admin/sellers/pending" className={navLinkClass("/admin/sellers/pending")}>
                  Pending Sellers
                  {activeDot("/admin/sellers/pending")}
                </Link>
                <Link href="/admin/categories" className={navLinkClass("/admin/categories")}>
                  Categories
                  {activeDot("/admin/categories")}
                </Link>
              </>
            )}

            {token && role === "VERIFICATION_OFFICER" && (
              <>
                <Link href="/verification-officer/dashboard" className={navLinkClass("/verification-officer/dashboard")}>
                  Listings Queue
                  {activeDot("/verification-officer/dashboard")}
                </Link>
                <Link href="/officer/dashboard" className={navLinkClass("/officer/dashboard")}>
                  Seller Approvals
                  {activeDot("/officer/dashboard")}
                </Link>
              </>
            )}

            {token && role === "SUPPORT_AGENT" && (
              <Link href="/support-agent/dashboard" className={navLinkClass("/support-agent/dashboard")}>
                Support Queue
                {activeDot("/support-agent/dashboard")}
              </Link>
            )}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {token && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={toggleNotifications}
                className="p-2 rounded-lg text-[#8493a8] hover:text-white hover:bg-white/[0.06] transition-all relative touch-target"
                aria-label="Notifications"
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-96 max-w-sm glass-panel rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden">
                  <div className="p-3.5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#e2e8f0]">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-[#00cfa8]/15 text-[#00cfa8] text-xs font-semibold px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-[#00cfa8] hover:text-[#00e6bc] transition-colors font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="py-10 px-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
                          <BellIcon />
                        </div>
                        <p className="text-xs text-[#627288]">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3.5 hover:bg-white/[0.04] cursor-pointer transition-colors ${
                            notification.status === "UNREAD" ? "bg-[#00cfa8]/[0.03]" : ""
                          }`}
                          onClick={() => {
                            markAsRead(notification.id);
                            if (notification.link) {
                              setShowNotifications(false);
                              router.push(notification.link);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            {notification.status === "UNREAD" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00cfa8] mt-1.5 flex-shrink-0" />
                            )}
                            <div className={`flex-1 min-w-0 ${notification.status !== "UNREAD" ? "pl-4" : ""}`}>
                              <p className="font-medium text-xs text-[#e2e8f0]">{notification.title}</p>
                              <p className="text-xs text-[#8493a8] mt-0.5 line-clamp-2">{notification.message}</p>
                              <p className="text-[10px] text-[#52637a] mt-1.5">
                                {new Date(notification.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!token ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-[#8493a8] hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn-primary !py-1.5 !px-4 !text-sm !rounded-lg"
              >
                Get Started
              </Link>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              {role && (
                <span
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border ${
                    roleColors[role] || "text-[#8493a8] border-white/10 bg-white/5"
                  }`}
                >
                  {role.replace("_", " ")}
                </span>
              )}
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#8493a8] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              >
                Logout
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#8493a8] hover:text-white hover:bg-white/[0.06] transition-all touch-target"
            aria-label="Toggle Menu"
          >
            <MenuIcon open={mobileMenuOpen} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#070b14]/98 backdrop-blur-2xl px-4 py-4 space-y-1">
          <Link
            href="/businesses"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium touch-target ${
              isActive("/businesses") ? "text-[#00cfa8] bg-[#00cfa8]/08" : "text-[#8493a8] hover:text-white hover:bg-white/5"
            }`}
          >
            Browse Businesses
          </Link>

          {token && role === "BUYER" && (
            <>
              <Link href="/buyer/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#8493a8] hover:text-white hover:bg-white/5 touch-target">
                Dashboard
              </Link>
              <Link href="/businesses/my-inquiries" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#8493a8] hover:text-white hover:bg-white/5 touch-target">
                My Inquiries
              </Link>
              <Link href="/favorites" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#8493a8] hover:text-white hover:bg-white/5 touch-target">
                Saved Watchlist
              </Link>
            </>
          )}

          {token && role === "SELLER" && (
            <Link href="/seller/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#00cfa8] bg-[#00cfa8]/10 hover:bg-[#00cfa8]/15 touch-target">
              Seller Dashboard →
            </Link>
          )}

          {token && role === "ADMIN" && (
            <>
              <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#8493a8] hover:text-white hover:bg-white/5 touch-target">Admin Dashboard</Link>
              <Link href="/admin/sellers/pending" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#8493a8] hover:text-white hover:bg-white/5 touch-target">Pending Sellers</Link>
              <Link href="/admin/categories" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#8493a8] hover:text-white hover:bg-white/5 touch-target">Manage Categories</Link>
            </>
          )}

          {token && role === "VERIFICATION_OFFICER" && (
            <>
              <Link href="/verification-officer/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#8493a8] hover:text-white hover:bg-white/5 touch-target">Listings Queue</Link>
              <Link href="/officer/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#8493a8] hover:text-white hover:bg-white/5 touch-target">Seller Approvals</Link>
            </>
          )}

          {token && role === "SUPPORT_AGENT" && (
            <Link href="/support-agent/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#8493a8] hover:text-white hover:bg-white/5 touch-target">Support Queue</Link>
          )}

          {/* Mobile Auth */}
          <div className="pt-3 border-t border-white/[0.08] mt-3 flex flex-col gap-2">
            {!token ? (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 rounded-xl text-sm font-medium text-[#8493a8] hover:text-white bg-white/[0.03] border border-white/[0.07] touch-target">
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="btn-primary w-full justify-center !rounded-xl">
                  Get Started
                </Link>
              </>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${role && roleColors[role] ? roleColors[role] : "text-[#8493a8] border-white/10 bg-white/5"}`}>
                  {role?.replace("_", " ")}
                </span>
                <button
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 touch-target"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}