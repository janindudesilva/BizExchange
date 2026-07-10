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

    if (loading) return <p className="p-10 text-white">Loading...</p>;
    if (error) return <p className="p-10 text-red-500">{error}</p>;

    return (
        <main className="max-w-6xl mx-auto px-6 py-10">
            <h1 className="text-3xl font-bold mb-8 text-white">Pending Seller Verifications</h1>

            {sellers.length === 0 ? (
                <p className="text-slate-100">No pending sellers right now.</p>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left text-white">
                        <thead className="bg-slate-900">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">NIC/Passport</th>
                            <th className="p-3">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="text-slate-900">
                        {sellers.map((s) => (
                            <tr key={s.id} className="border-t">
                                <td className="p-3">{s.fullName}</td>
                                <td className="p-3">{s.email}</td>
                                <td className="p-3">{s.phone}</td>
                                <td className="p-3">{s.nicOrPassport}</td>
                                <td className="p-3 space-x-2">
                                    <button
                                        disabled={actionLoadingId === s.id}
                                        onClick={() => handleApprove(s.id)}
                                        className="bg-green-600 text-white px-3 py-1 rounded-md disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        disabled={actionLoadingId === s.id}
                                        onClick={() => handleReject(s.id)}
                                        className="bg-red-600 text-white px-3 py-1 rounded-md disabled:opacity-50"
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