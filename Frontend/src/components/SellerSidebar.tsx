"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

interface SellerProfile {
  fullName?: string;
  verificationStatus?: string;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  link?: string;
  status: string;
  createdAt: string;
}

interface SellerSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  profile?: SellerProfile | null;
  badges?: {
    inquiries?: number;
    deals?: number;
    tickets?: number;
    notifications?: number;
  };
  onNotificationClick?: () => void;
}

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function verificationLabel(status: string | null | undefined): string {
  if (status === "APPROVED") return "Verified Seller";
  if (status === "PENDING") return "Verification Pending";
  if (status === "REJECTED") return "Verification Rejected";
  return "Seller";
}

export default function SellerSidebar({
  sidebarOpen,
  setSidebarOpen,
  profile: propProfile,
  badges: propBadges,
  onNotificationClick,
}: SellerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<SellerProfile | null | undefined>(propProfile);
  const [fetchedInquiriesCount, setFetchedInquiriesCount] = useState(0);
  const [fetchedTicketsCount, setFetchedTicketsCount] = useState(0);
  const [fetchedNotifCount, setFetchedNotifCount] = useState(0);

  const inquiriesCount = propBadges?.inquiries ?? fetchedInquiriesCount;
  const ticketsCount = propBadges?.tickets ?? fetchedTicketsCount;
  const [unreadNotifCountOverride, setUnreadNotifCountOverride] = useState<number | null>(null);
  const unreadNotifCount = unreadNotifCountOverride ?? (propBadges?.notifications ?? fetchedNotifCount);

  // Notification slide-over state
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  useEffect(() => {
    if (propProfile) {
      setProfile(propProfile);
      return;
    }
    let ignore = false;
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (userId) {
      apiRequest<SellerProfile>(`/seller/profile/${userId}`)
        .then((res) => {
          if (!ignore && res) setProfile(res);
        })
        .catch(() => {});
    }
    return () => {
      ignore = true;
    };
  }, [propProfile]);

  useEffect(() => {
    if (propBadges) return;
    let ignore = false;

    // Auto-fetch badge counts if not passed
    apiRequest<{ data: { status: string }[] }>("/inquiries/received")
      .then((res) => {
        if (ignore) return;
        const inqs = res.data || [];
        setFetchedInquiriesCount(inqs.filter((i) => i.status === "PENDING_APPROVAL").length);
      })
      .catch(() => {});

    apiRequest<{ data: { status: string }[] }>("/tickets/my")
      .then((res) => {
        if (ignore) return;
        const t = res.data || [];
        setFetchedTicketsCount(
          t.filter((item) => item.status !== "RESOLVED" && item.status !== "CLOSED").length
        );
      })
      .catch(() => {});

    apiRequest<{ data: number }>("/notifications/unread/count")
      .then((res) => {
        if (ignore) return;
        setFetchedNotifCount(res.data || 0);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [propBadges]);

  const fetchNotificationsList = async () => {
    setLoadingNotifs(true);
    try {
      const res = await apiRequest<{ data: NotificationItem[] }>("/notifications");
      setNotifications(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingNotifs(false);
    }
  };

  const openNotifications = () => {
    if (onNotificationClick) {
      onNotificationClick();
    } else {
      setNotifDrawerOpen(true);
      fetchNotificationsList();
    }
  };

  const markNotificationAsRead = async (id: number, link?: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n))
      );
      setUnreadNotifCountOverride((prev) =>
        Math.max(0, (prev ?? (propBadges?.notifications ?? fetchedNotifCount)) - 1)
      );
      if (link) {
        setNotifDrawerOpen(false);
        router.push(link);
      }
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ" })));
      setUnreadNotifCountOverride(0);
    } catch {
      // ignore
    }
  };

  const navItems = [
    {
      label: "Overview",
      href: "/seller/dashboard",
      isActive: pathname === "/seller/dashboard",
    },
    {
      label: "My Listing",
      href: "/seller/businesses",
      isActive: pathname === "/seller/businesses" || pathname === "/seller/businesses/create",
    },
    {
      label: "Inquiries",
      href: "/seller/inquiries",
      badge: inquiriesCount > 0 ? inquiriesCount : undefined,
      isActive: pathname === "/seller/inquiries",
    },
    {
      label: "Support",
      href: "/seller/support",
      badge: ticketsCount > 0 ? ticketsCount : undefined,
      isActive: pathname.startsWith("/seller/support") || pathname.startsWith("/support"),
    },
    {
      label: "Profile & Verification",
      href: "/seller/profile",
      isActive: pathname === "/seller/profile",
    },
    {
      label: "Notifications",
      href: "#notifications",
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
      isActive: false,
      action: openNotifications,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-30 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`w-[248px] shrink-0 fixed inset-y-0 left-0 bg-[#0d1220] border-r border-white/5 flex flex-col justify-between z-40 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="px-5 py-5 border-b border-white/[0.07] flex items-center justify-between">
            <div>
              <div className="text-[#00cfa8] font-bold tracking-tight text-base leading-tight">
                BizExchange
              </div>
              <div className="text-[#4f6380] text-[11px] tracking-wider mt-0.5 uppercase">
                Seller Portal
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#4f6380] hover:text-white p-1"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Nav Items */}
          <nav className="py-3">
            {navItems.map((item) => {
              const content = (
                <div className={`sidebar-nav-item mx-2 ${item.isActive ? "active" : ""}`}>
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="text-[10px] bg-[#00cfa8] text-[#070b14] rounded-full px-1.5 py-0.2 min-w-[18px] text-center font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              );

              if (item.action) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      item.action();
                    }}
                    className="w-full text-left"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                >
                  {content}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile Card Footer */}
        <div className="px-4 py-5 border-t border-white/[0.07]">
          <Link
            href="/seller/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00cfa8] to-[#00957b] text-[#070b14] text-xs font-bold flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,207,168,0.2)]">
              {initials(profile?.fullName)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#d8e4f0] truncate">
                {profile?.fullName ?? "Seller"}
              </div>
              <div className="text-[11px] text-[#4f6380] truncate">
                {verificationLabel(profile?.verificationStatus)}
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* ── Notification Slide-over Drawer ── */}
      {notifDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setNotifDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />
          <div className="relative w-full max-w-md bg-[#0d1220] border-l border-white/10 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#d8e4f0] tracking-wide">Notifications</h3>
                {unreadNotifCount > 0 && (
                  <span className="text-xs bg-[#00cfa8] text-[#070b14] px-2 py-0.5 rounded-full font-bold">
                    {unreadNotifCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadNotifCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#00cfa8] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setNotifDrawerOpen(false)}
                  className="p-1.5 text-[#4f6380] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  aria-label="Close drawer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Notifications Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingNotifs ? (
                <div className="text-center py-12 text-[#4f6380] text-sm">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-full bg-[#121c32] flex items-center justify-center mx-auto mb-3 text-[#4f6380] text-xl">
                    🔔
                  </div>
                  <div className="text-sm font-medium text-[#d8e4f0]">All caught up!</div>
                  <div className="text-xs text-[#4f6380] mt-1">
                    You have no notifications right now.
                  </div>
                </div>
              ) : (
                notifications.map((n) => {
                  const isUnread = n.status !== "READ";
                  return (
                    <div
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id, n.link)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isUnread
                          ? "bg-[#121c32] border-[#00cfa8]/30 hover:border-[#00cfa8]/60"
                          : "bg-[#090d16] border-white/5 hover:border-white/10 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-[#00cfa8] shrink-0" />
                          )}
                          <div className="text-sm font-semibold text-[#d8e4f0] truncate">
                            {n.title}
                          </div>
                        </div>
                        <span className="text-[10px] text-[#4f6380] shrink-0">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#8092ab] mt-1.5 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
