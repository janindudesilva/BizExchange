"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

interface SellerProfile {
    id: number;
    userId: number;
    fullName: string;
    email: string;
    phone: string | null;
    nicOrPassport: string | null;
    address: string | null;
    businessOwnerType: string | null;
    verificationStatus: VerificationStatus;
    accountStatus: string | null;
    emailVerified: boolean | null;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface EditFormState {
    fullName: string;
    phone: string;
    nicOrPassport: string;
    address: string;
    businessOwnerType: string;
}

const NAV_ITEMS: {
    label: string;
    href?: string;
    badge?: number;
}[] = [
    { label: "Overview", href: "/seller/dashboard" },
    { label: "My Listing", href: "/seller/businesses" },
    { label: "Inquiries", href: "/seller/inquiries" },
    { label: "Offers" },
    { label: "Active Deals" },
    { label: "Payments" },
    { label: "Reviews" },
    { label: "Support" },
    { label: "Notifications" },
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

function verificationBadgeClasses(status: VerificationStatus | null): string {
    if (status === "APPROVED") return "bg-[#0c2a20] text-[#00cfa8] border border-[#00cfa8]/20";
    if (status === "PENDING") return "bg-[#1c1608] text-[#f5a623] border border-[#f5a623]/20";
    if (status === "REJECTED") return "bg-[#1c0c0c] text-red-400 border border-red-500/20";
    return "bg-white/5 text-[#8092ab] border border-white/10";
}

function formatDate(value: string | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function toFormState(profile: SellerProfile): EditFormState {
    return {
        fullName: profile.fullName ?? "",
        phone: profile.phone ?? "",
        nicOrPassport: profile.nicOrPassport ?? "",
        address: profile.address ?? "",
        businessOwnerType: profile.businessOwnerType ?? "",
    };
}

export default function SellerProfilePage() {
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<EditFormState | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    function loadProfile() {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            setLoaded(true);
            return;
        }

        apiRequest<SellerProfile>(`/seller/profile/${userId}`)
            .then((data) => setProfile(data))
            .catch((err) => setError(err.message || "Failed to load profile"))
            .finally(() => setLoaded(true));
    }

    useEffect(() => {
        loadProfile();
    }, []);

    const verificationStatus = profile?.verificationStatus ?? null;

    function startEditing() {
        if (!profile) return;
        setForm(toFormState(profile));
        setSaveError(null);
        setIsEditing(true);
    }

    function cancelEditing() {
        setIsEditing(false);
        setForm(null);
        setSaveError(null);
    }

    function handleChange(field: keyof EditFormState, value: string) {
        setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    }

    async function handleSave() {
        if (!form || !profile) return;
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        setSaving(true);
        setSaveError(null);

        try {
            await Promise.all([
                apiRequest(`/users/me`, {
                    method: "PUT",
                    body: JSON.stringify({
                        fullName: form.fullName,
                        phone: form.phone,
                    }),
                }),
                apiRequest(`/seller/profile/${userId}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        nicOrPassport: form.nicOrPassport,
                        address: form.address,
                        businessOwnerType: form.businessOwnerType,
                    }),
                }),
            ]);

            setIsEditing(false);
            setForm(null);
            loadProfile();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to save profile");
        } finally {
            setSaving(false);
        }
    }

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
                            const content = (
                                <div
                                    className="flex items-center justify-between px-6 py-3 text-sm border-l-2 border-transparent text-[#8092ab] hover:text-[#c7d2e0] hover:bg-white/[0.02] transition-colors"
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
                <header className="flex items-center justify-between px-10 py-5 border-b border-white/5">
                    <div>
                        <div className="text-[11px] tracking-[0.15em] text-[#4f6380]">
                            ACCOUNT
                        </div>
                        <div className="text-sm text-[#8092ab] mt-1">
                            Profile &amp; Verification
                        </div>
                    </div>

                    {loaded && !error && profile && !isEditing && (
                        <button
                            onClick={startEditing}
                            className="text-sm bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors"
                        >
                            Edit Profile
                        </button>
                    )}
                </header>

                <main className="flex-1 px-10 py-8 max-w-7xl mx-auto w-full">
                    <h1 className="text-2xl font-bold text-[#d8e4f0] tracking-wide">
                        PROFILE &amp; VERIFICATION
                    </h1>
                    <p className="text-[#4f6380] text-sm mt-2 mb-8">
                        Your seller account details on file with BizExchange
                    </p>

                    {!loaded && (
                        <div className="bg-[#121c32] border border-white/5 rounded-2xl p-6 text-sm text-[#8092ab]">
                            Loading profile…
                        </div>
                    )}

                    {loaded && error && (
                        <div className="bg-[#1c0c0c] border border-red-500/20 text-red-400 rounded-2xl px-5 py-4 text-sm">
                            Couldn&apos;t load your profile: {error}
                        </div>
                    )}

                    {loaded && !error && !profile && (
                        <div className="bg-[#121c32] border border-white/5 rounded-2xl p-6 text-sm text-[#8092ab]">
                            No profile found for this account.
                        </div>
                    )}

                    {loaded && !error && profile && (
                        <div className="flex flex-col gap-5">
                            {/* Identity card */}
                            <div className="bg-[#121c32] border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-[#057a6b] text-white text-lg font-semibold flex items-center justify-center shrink-0">
                                        {initials(profile.fullName)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-lg text-[#d8e4f0] font-medium truncate">
                                            {profile.fullName}
                                        </div>
                                        <div className="text-sm text-[#4f6380] truncate">
                                            {profile.email}
                                        </div>
                                    </div>
                                    <span
                                        className={`ml-auto shrink-0 text-xs px-3 py-1.5 rounded-full ${verificationBadgeClasses(
                                            verificationStatus
                                        )}`}
                                    >
                    {verificationLabel(verificationStatus)}
                  </span>
                                </div>

                                {verificationStatus === "PENDING" && (
                                    <div className="mt-5 bg-[#1c1608] border border-[#f5a623]/20 text-[#f5a623] rounded-xl px-4 py-3 text-sm">
                                        An admin needs to approve your seller profile before your
                                        listings go live.
                                    </div>
                                )}
                                {verificationStatus === "REJECTED" && (
                                    <div className="mt-5 bg-[#1c0c0c] border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
                                        Your seller verification was rejected. Please contact
                                        support for more details.
                                    </div>
                                )}
                            </div>

                            {/* Details / Edit card */}
                            <div className="bg-[#121c32] border border-white/5 rounded-2xl p-6">
                                <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-4">
                                    {isEditing ? "EDIT ACCOUNT DETAILS" : "ACCOUNT DETAILS"}
                                </div>

                                {!isEditing && (
                                    <div className="space-y-4 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#8092ab]">Phone</span>
                                            <span className="text-[#d8e4f0] font-medium">
                          {profile.phone || "—"}
                        </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#8092ab]">NIC / Passport</span>
                                            <span className="text-[#d8e4f0] font-medium">
                          {profile.nicOrPassport || "—"}
                        </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#8092ab]">Business Owner Type</span>
                                            <span className="text-[#d8e4f0] font-medium">
                          {profile.businessOwnerType || "—"}
                        </span>
                                        </div>
                                        <div className="flex items-start justify-between gap-6">
                                            <span className="text-[#8092ab] shrink-0">Address</span>
                                            <span className="text-[#d8e4f0] font-medium text-right">
                          {profile.address || "—"}
                        </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#8092ab]">Account Status</span>
                                            <span className="text-[#d8e4f0] font-medium">
                          {profile.accountStatus || "—"}
                        </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#8092ab]">Email</span>
                                            <span className="text-[#d8e4f0] font-medium">
                          {profile.email}
                        </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#8092ab]">Last Login</span>
                                            <span className="text-[#d8e4f0] font-medium">
                          {formatDate(profile.lastLoginAt ?? undefined)}
                        </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                            <span className="text-[#8092ab]">Member Since</span>
                                            <span className="text-[#d8e4f0] font-medium">
                          {formatDate(profile.createdAt)}
                        </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#8092ab]">Last Updated</span>
                                            <span className="text-[#d8e4f0] font-medium">
                          {formatDate(profile.updatedAt)}
                        </span>
                                        </div>
                                    </div>
                                )}

                                {isEditing && form && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-[#8092ab] block mb-1.5">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={form.fullName}
                                                onChange={(e) => handleChange("fullName", e.target.value)}
                                                className="w-full bg-[#0d1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#d8e4f0] focus:outline-none focus:border-[#00cfa8]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-[#8092ab] block mb-1.5">
                                                Phone
                                            </label>
                                            <input
                                                type="text"
                                                value={form.phone}
                                                onChange={(e) => handleChange("phone", e.target.value)}
                                                className="w-full bg-[#0d1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#d8e4f0] focus:outline-none focus:border-[#00cfa8]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-[#8092ab] block mb-1.5">
                                                NIC / Passport
                                            </label>
                                            <input
                                                type="text"
                                                value={form.nicOrPassport}
                                                onChange={(e) => handleChange("nicOrPassport", e.target.value)}
                                                className="w-full bg-[#0d1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#d8e4f0] focus:outline-none focus:border-[#00cfa8]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-[#8092ab] block mb-1.5">
                                                Business Owner Type
                                            </label>
                                            <input
                                                type="text"
                                                value={form.businessOwnerType}
                                                onChange={(e) => handleChange("businessOwnerType", e.target.value)}
                                                className="w-full bg-[#0d1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#d8e4f0] focus:outline-none focus:border-[#00cfa8]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-[#8092ab] block mb-1.5">
                                                Address
                                            </label>
                                            <textarea
                                                value={form.address}
                                                onChange={(e) => handleChange("address", e.target.value)}
                                                rows={3}
                                                className="w-full bg-[#0d1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#d8e4f0] focus:outline-none focus:border-[#00cfa8]/50 resize-none"
                                            />
                                        </div>

                                        {saveError && (
                                            <div className="bg-[#1c0c0c] border border-red-500/20 text-red-400 rounded-lg px-3 py-2 text-xs">
                                                {saveError}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 pt-2">
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="text-sm bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {saving ? "Saving…" : "Save Changes"}
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                disabled={saving}
                                                className="text-sm text-[#8092ab] px-4 py-2 rounded-lg hover:text-[#d8e4f0] transition-colors disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}