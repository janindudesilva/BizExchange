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

interface EditForm {
    title: string;
    description: string;
    location: string;
    askingPrice: string;
    category: string;
}

export default function MyListingsPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
    const [editForm, setEditForm] = useState<EditForm | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    useEffect(() => {
        fetchMyBusinesses();
    }, []);

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

    const statusBadge = (status: string) => {
        switch (status) {
            case "APPROVED": return <span className="text-[#00cfa8]">✅ Approved</span>;
            case "REJECTED": return <span className="text-red-400">❌ Rejected</span>;
            case "PENDING_REVIEW": return <span className="text-[#f5a623]">⏳ Pending Review</span>;
            default: return <span className="text-[#8092ab]">{status}</span>;
        }
    };

    const openEdit = (b: Business) => {
        setEditingBusiness(b);
        setEditForm({
            title: b.title,
            description: b.description,
            location: b.location,
            askingPrice: String(b.askingPrice),
            category: b.category,
        });
    };

    const handleEditSave = async () => {
        if (!editingBusiness || !editForm) return;
        setSaving(true);
        try {
            await apiRequest<{ data: Business }>(`/businesses/${editingBusiness.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    title: editForm.title,
                    description: editForm.description,
                    location: editForm.location,
                    askingPrice: parseFloat(editForm.askingPrice),
                    category: editForm.category,
                }),
            });
            setEditingBusiness(null);
            setEditForm(null);
            await fetchMyBusinesses(); // refresh list
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update listing");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this listing? This cannot be undone.")) return;
        setDeleting(id);
        try {
            await apiRequest(`/businesses/${id}`, { method: "DELETE" });
            setBusinesses((prev) => prev.filter((b) => b.id !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete listing");
        } finally {
            setDeleting(null);
        }
    };

    if (loading) return <p className="p-10 text-[#4f6380]">Loading...</p>;
    if (error) return <p className="p-10 text-red-400">{error}</p>;

    const inputClass = "w-full bg-[#121c32] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] rounded-lg px-3 py-2 focus:outline-none focus:border-[#00cfa8]/50 transition-colors";

    return (
        <main className="max-w-6xl mx-auto px-6 py-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[#d8e4f0] tracking-wide">MY LISTINGS</h1>
                    <p className="text-[#4f6380] text-sm mt-1">Manage your business listings</p>
                </div>
                <Link href="/seller/businesses/create" className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm">
                    + New Listing
                </Link>
            </div>

            {businesses.length === 0 ? (
                <p className="text-[#4f6380]">You haven&apos;t submitted any business listings yet.</p>
            ) : (
                <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                        <tr className="border-b border-white/5">
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">ID</th>
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">TITLE</th>
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">CATEGORY</th>
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">LOCATION</th>
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">ASKING PRICE</th>
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">STATUS</th>
                            <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {businesses.map((b) => (
                            <tr key={b.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 text-sm text-[#4f6380]">{b.id}</td>
                                <td className="p-4 text-sm text-[#d8e4f0]">{b.title}</td>
                                <td className="p-4 text-sm text-[#8092ab]">{b.category}</td>
                                <td className="p-4 text-sm text-[#8092ab]">{b.location}</td>
                                <td className="p-4 text-sm text-[#00cfa8] font-medium">{b.askingPrice}</td>
                                <td className="p-4 text-sm">{statusBadge(b.status)}</td>
                                <td className="p-4 space-x-2">
                                    <button
                                        onClick={() => openEdit(b)}
                                        className="bg-[#00cfa8]/20 text-[#00cfa8] hover:bg-[#00cfa8]/30 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(b.id)}
                                        disabled={deleting === b.id}
                                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                    >
                                        {deleting === b.id ? "Deleting..." : "Delete"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal */}
            {editingBusiness && editForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-[#0d1220] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-xl">
                        <h2 className="text-xl font-bold text-[#d8e4f0] mb-4">Edit Listing</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[11px] tracking-[0.1em] text-[#4f6380] mb-1">TITLE</label>
                                <input
                                    className={inputClass}
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] tracking-[0.1em] text-[#4f6380] mb-1">CATEGORY</label>
                                <input
                                    className={inputClass}
                                    value={editForm.category}
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] tracking-[0.1em] text-[#4f6380] mb-1">LOCATION</label>
                                <input
                                    className={inputClass}
                                    value={editForm.location}
                                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] tracking-[0.1em] text-[#4f6380] mb-1">ASKING PRICE (LKR)</label>
                                <input
                                    type="number"
                                    className={inputClass}
                                    value={editForm.askingPrice}
                                    onChange={(e) => setEditForm({ ...editForm, askingPrice: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] tracking-[0.1em] text-[#4f6380] mb-1">DESCRIPTION</label>
                                <textarea
                                    rows={3}
                                    className={inputClass}
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-[#f5a623] mt-3">
                            ⚠️ Saving will reset the listing status to &quot;Pending Review&quot; for re-approval.
                        </p>
                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={() => { setEditingBusiness(null); setEditForm(null); }}
                                className="px-4 py-2 rounded-lg border border-white/10 text-[#8092ab] hover:bg-white/[0.04] hover:text-[#c7d2e0] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg bg-[#00cfa8] text-[#080c15] font-semibold hover:bg-[#00e6bc] disabled:opacity-50 transition-colors"
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}