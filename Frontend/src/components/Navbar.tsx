"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiRequest } from "@/lib/api";

interface Notification {
    id: number;
    title: string;
    message: string;
    status: string;
    createdAt: string;
}

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        setToken(localStorage.getItem("token"));
        setRole(localStorage.getItem("role"));
    }, []);

    useEffect(() => {
        if (token) {
            fetchUnreadCount();
            const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
            return () => clearInterval(interval);
        }
    }, [token]);

    const fetchUnreadCount = async () => {
        try {
            const response = await apiRequest<{ data: number }>("/notifications/unread/count");
            setUnreadCount(response.data || 0);
        } catch (err) {
            console.error("Failed to fetch unread count", err);
        }
    };

    const fetchNotifications = async () => {
        try {
            const response = await apiRequest<{ data: Notification[] }>("/notifications");
            setNotifications(response.data || []);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await apiRequest(`/notifications/${id}/read`, { method: "PUT" });
            setNotifications(notifications.map(n => n.id === id ? { ...n, status: "READ" } : n));
            setUnreadCount(Math.max(0, unreadCount - 1));
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await apiRequest("/notifications/read-all", { method: "PUT" });
            setNotifications(notifications.map(n => ({ ...n, status: "READ" })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    const toggleNotifications = () => {
        if (!showNotifications) {
            fetchNotifications();
        }
        setShowNotifications(!showNotifications);
    };

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");

        setToken(null);
        setRole(null);

        router.push("/");
    }

    // The seller portal ships its own full-screen portal shell (sidebar + top bar),
    // so the site-wide navbar would be redundant there.
    if (pathname?.startsWith("/seller/")) {
        return null;
    }

    return (
        <nav className="bg-[#0d1220] text-[#c7d2e0] px-8 py-4 flex items-center justify-between border-b border-white/5">
            <Link href="/" className="text-xl font-bold text-[#00cfa8] tracking-wide">
                BIZEXCHANGE
            </Link>

            <div className="flex gap-6 items-center text-sm">
                <Link href="/businesses" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                    Businesses
                </Link>

                {token && role === "BUYER" && (
                    <>
                        <Link href="/businesses/my-inquiries" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                            My Inquiries
                        </Link>
                        <Link href="/favorites" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                            Favorites
                        </Link>
                    </>
                )}

                {token && role === "SELLER" && (
                    <Link href="/seller/dashboard" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                        Seller Dashboard
                    </Link>
                )}

                {token && role === "ADMIN" && (
                    <>
                        <Link href="/admin/dashboard" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                            Admin Dashboard
                        </Link>
                        <Link href="/admin/categories" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                            Categories
                        </Link>
                    </>
                )}

                {token && (
                    <div className="relative">
                        <button
                            onClick={toggleNotifications}
                            className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors relative"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-[#121c32] border border-white/10 rounded-lg shadow-xl z-50">
                                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                    <h3 className="font-semibold text-[#d8e4f0]">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-[#00cfa8] hover:text-[#00e6bc] transition-colors"
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-[#8092ab]">
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                                                    notification.status === "UNREAD" ? "bg-white/[0.02]" : ""
                                                }`}
                                                onClick={() => markAsRead(notification.id)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {notification.status === "UNREAD" && (
                                                        <div className="w-2 h-2 rounded-full bg-[#00cfa8] mt-2 flex-shrink-0" />
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="font-medium text-[#d8e4f0] text-sm">
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-[#8092ab] text-sm mt-1">
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-[#4f6380] text-xs mt-2">
                                                            {new Date(notification.createdAt).toLocaleString()}
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

                {!token && (
                    <>
                        <Link href="/login" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                            Login
                        </Link>
                        <Link href="/register" className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors">
                            Register
                        </Link>
                    </>
                )}

                {token && (
                    <button onClick={logout} className="text-[#8092ab] hover:text-red-400 transition-colors">
                        Logout
                    </button>
                )}
            </div>
        </nav>
    );
}