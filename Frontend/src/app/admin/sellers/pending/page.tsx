"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

interface Seller {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    nicOrPassport: string;
    businessOwnerType: string;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
}

export default function PendingSellersPage() {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    const fetchPending = async () => {
        try {
            setLoading(true);
            const data = await apiRequest<Seller[]>("/admin/sellers/pending");
            setSellers(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load pending sellers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (id: number) => {
        setActionLoadingId(id);
        try {
            await apiRequest(`/admin/sellers/${id}/approve`, { method: "PUT" });
            setSellers((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Approve failed");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleReject = async (id: number) => {
        setActionLoadingId(id);
        try {
            await apiRequest(`/admin/sellers/${id}/reject`, { method: "PUT" });
            setSellers((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Reject failed");
        } finally {
            setActionLoadingId(null);
        }
    };

    if (loading) return <p className="p-10 text-[#4f6380]">Loading...</p>;
    if (error) return <p className="p-10 text-red-400">{error}</p>;

    return (
        <main className="max-w-6xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">PENDING SELLER VERIFICATIONS</h1>
            <p className="text-[#4f6380] text-sm mb-8">Review and approve or reject seller profiles</p>

            {sellers.length === 0 ? (
                <p className="text-[#4f6380]">No pending sellers right now.</p>
            ) : (
                <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                        <tr className="border-b border-white/5">
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">NAME</th>
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">EMAIL</th>
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">PHONE</th>
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">NIC/PASSPORT</th>
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">ACTIONS</th>
                        </tr>
                        </thead>
                        <tbody>
                        {sellers.map((s) => (
                            <tr key={s.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 text-sm text-[#d8e4f0]">{s.fullName}</td>
                                <td className="p-4 text-sm text-[#8092ab]">{s.email}</td>
                                <td className="p-4 text-sm text-[#8092ab]">{s.phone}</td>
                                <td className="p-4 text-sm text-[#8092ab]">{s.nicOrPassport}</td>
                                <td className="p-4 space-x-2">
                                    <button
                                        disabled={actionLoadingId === s.id}
                                        onClick={() => handleApprove(s.id)}
                                        className="bg-[#00cfa8] text-[#080c15] px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[#00e6bc] transition-colors"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        disabled={actionLoadingId === s.id}
                                        onClick={() => handleReject(s.id)}
                                        className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-red-500/30 transition-colors"
                                    >
                                        Reject
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}