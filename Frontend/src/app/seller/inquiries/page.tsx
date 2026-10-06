"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Inquiry, InquiryApiResponse, SingleInquiryApiResponse } from "@/types/inquiry";
import SellerSidebar from "@/components/SellerSidebar";

type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

interface SellerProfile {
    fullName: string;
    verificationStatus: VerificationStatus;
}

const NAV_ITEMS: {
    label: string;
    href?: string;
    badge?: number;
}[] = [
    { label: "Overview", href: "/seller/dashboard" },
    { label: "My Listing", href: "/seller/businesses" },
    { label: "Inquiries", href: "/seller/inquiries" },
    { label: "Offers", href: "/seller/inquiries" },
    { label: "Active Deals", href: "/seller/inquiries" },
    { label: "Support", href: "/support/my-tickets" },
];

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

export default function SellerInquiriesPage() {
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actingId, setActingId] = useState<number | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
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
            setLoading(false);
            return;
        }

        Promise.allSettled([
            apiRequest<SellerProfile>(`/seller/profile/${userId}`),
            apiRequest<InquiryApiResponse>("/inquiries/received"),
        ]).then(([profileResult, inquiriesResult]) => {
            if (profileResult.status === "fulfilled") {
                setProfile(profileResult.value);
            }
            if (inquiriesResult.status === "fulfilled") {
                setInquiries(inquiriesResult.value.data ?? []);
            } else {
                setError("Could not load inquiries");
            }
            setLoading(false);
        });
    }, []);

    const respond = async (id: number, action: "approve" | "reject") => {
        setActingId(id);
        try {
            const res = await apiRequest<SingleInquiryApiResponse>(`/inquiries/${id}/${action}`, {
                method: "PUT",
            });
            setInquiries((prev) => prev.map((i) => (i.id === id ? res.data : i)));
        } catch (err) {
            setError(err instanceof Error ? err.message : `Could not ${action} inquiry`);
        } finally {
            setActingId(null);
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case "PENDING_APPROVAL": return <span className="text-[#f5a623]">● Pending Approval</span>;
            case "ACTIVE": return <span className="text-[#00cfa8]">● Active</span>;
            case "REJECTED": return <span className="text-red-400">● Rejected</span>;
            case "CLOSED": return <span className="text-[#4f6380]">● Closed</span>;
            default: return status;
        }
    };

    const verificationStatus = profile?.verificationStatus ?? null;

    return (
        <div className="min-h-screen bg-[#080c15] text-[#c7d2e0] flex relative overflow-x-hidden">
            <SellerSidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                profile={profile ? { fullName: profile.fullName, verificationStatus: verificationStatus || undefined } : null}
            />

            {/* ── Main column ── */}
            <div className="flex-1 ml-0 lg:ml-[248px] flex flex-col min-w-0">
                {/* Top bar */}
                <header className="flex items-center justify-between px-4 sm:px-8 lg:px-10 py-4 sm:py-5 border-b border-white/5 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 text-[#8092ab] hover:text-white rounded-lg border border-white/10 shrink-0"
                            aria-label="Open menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="min-w-0">
                            <div className="text-[11px] tracking-[0.15em] text-[#4f6380]">
                                INQUIRIES
                            </div>
                            <div className="text-xs sm:text-sm text-[#8092ab] mt-0.5 truncate">
                                Manage buyer inquiries on your listings
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[#8092ab]">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </div>

                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setMenuOpen((open) => !open)}
                                className="flex items-center gap-2 touch-target"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#057a6b] text-white text-xs font-semibold flex items-center justify-center">
                                    {initials(profile?.fullName)}
                                </div>
                                <span className="hidden sm:inline text-sm text-[#d8e4f0]">
                                    {profile?.fullName ?? "Seller"}
                                </span>
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-[calc(100%+10px)] w-56 bg-[#121c32] border border-white/10 rounded-xl shadow-lg overflow-hidden z-20">
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

                <main className="px-4 sm:px-8 lg:px-10 py-6 sm:py-8 max-w-4xl w-full">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#d8e4f0] tracking-wide mb-6">
                        INCOMING INQUIRIES
                    </h1>

                    {loading && <p className="text-[#4f6380]">Loading inquiries...</p>}
                    {error && <p className="text-red-400 mb-4">{error}</p>}

                    {!loading && inquiries.length === 0 && (
                        <p className="text-[#4f6380]">No inquiries yet.</p>
                    )}

                    <div className="flex flex-col gap-4">
                        {inquiries.map((inquiry) => (
                            <div
                                key={inquiry.id}
                                className="bg-[#121c32] border border-white/5 rounded-2xl p-4 sm:p-5"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                    <Link
                                        href={`/businesses/${inquiry.businessId}`}
                                        className="text-[#d8e4f0] font-semibold hover:text-[#00cfa8] break-words"
                                    >
                                        {inquiry.businessTitle}
                                    </Link>
                                    <div className="shrink-0">{statusBadge(inquiry.status)}</div>
                                </div>
                                <p className="text-[#8092ab] text-sm mb-2">
                                    From <span className="text-[#d8e4f0]">{inquiry.buyerName}</span>
                                </p>
                                <p className="text-[#8092ab] text-sm leading-6 break-words">{inquiry.initialMessage}</p>
                                <p className="text-[#4f6380] text-xs mt-3 mb-4">
                                    {new Date(inquiry.createdAt).toLocaleString()}
                                </p>

                                {inquiry.status === "PENDING_APPROVAL" ? (
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={() => respond(inquiry.id, "approve")}
                                            disabled={actingId === inquiry.id}
                                            className="flex-1 bg-[#00cfa8] hover:bg-[#00e6bc] disabled:opacity-50 text-[#080c15] font-semibold py-2.5 rounded-xl text-sm min-h-[44px] transition-colors"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => respond(inquiry.id, "reject")}
                                            disabled={actingId === inquiry.id}
                                            className="flex-1 border border-white/10 text-[#8092ab] hover:text-white py-2.5 rounded-xl text-sm min-h-[44px] transition-colors"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                ) : (
                                    <Link
                                        href={`/inquiries/${inquiry.id}`}
                                        className="inline-flex items-center text-sm text-[#00cfa8] hover:underline min-h-[40px]"
                                    >
                                        {inquiry.status === "ACTIVE" ? "Open chat →" : "View conversation →"}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
