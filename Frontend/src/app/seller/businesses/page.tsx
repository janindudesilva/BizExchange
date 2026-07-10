"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

interface Business {
    id: number;
    title: string;
    category: string;
    sellerName: string;
    description: string;
    location: string;
    askingPrice: number;
    status: string;
}

export default function MyListingsPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchMyBusinesses = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) {
                setError("You must be logged in to view your listings.");
                setLoading(false);
                return;
            }

            try {
                const response = await apiRequest<{ data: Business[] }>(`/businesses/seller/${userId}`);
                setBusinesses(response.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not load your listings");
            } finally {
                setLoading(false);
            }
        };

        fetchMyBusinesses();
    }, []);

    const statusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return "✅ Approved";
            case "REJECTED":
                return "❌ Rejected";
            case "PENDING_REVIEW":
                return "⏳ Pending Review";
            default:
                return status;
        }
    };

    if (loading) return <p className="p-10 text-white">Loading...</p>;
    if (error) return <p className="p-10 text-red-500">{error}</p>;

    return (
        <main className="max-w-6xl mx-auto px-6 py-10">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">My Listings</h1>
                <Link
                    href="/seller/businesses/create"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                    + New Listing
                </Link>
            </div>

            {businesses.length === 0 ? (
                <p className="text-slate-400">
                    You haven&apos;t submitted any business listings yet.
                </p>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900">
                        <tr>
                            <th className="p-3">ID</th>
                            <th className="p-3">Title</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Location</th>
                            <th className="p-3">Asking Price</th>
                            <th className="p-3">Status</th>
                            <th className="p-3"></th>
                        </tr>
                        </thead>
                        <tbody className="text-slate-900">
                        {businesses.map((b) => (
                            <tr key={b.id} className="border-t">
                                <td className="p-3">{b.id}</td>
                                <td className="p-3">{b.title}</td>
                                <td className="p-3">{b.category}</td>
                                <td className="p-3">{b.location}</td>
                                <td className="p-3">{b.askingPrice}</td>
                                <td className="p-3">{statusBadge(b.status)}</td>
                                <td className="p-3 space-x-2">
                                    <button className="bg-blue-300 text-white px-3 py-1 rounded-md disabled:opacity-50">
                                        Edit
                                    </button>
                                    <button className="bg-red-600 text-white px-3 py-1 rounded-md disabled:opacity-50">
                                        Delete
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