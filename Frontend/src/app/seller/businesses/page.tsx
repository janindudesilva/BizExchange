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
            case "APPROVED": return "✅ Approved";
            case "REJECTED": return "❌ Rejected";
            case "PENDING_REVIEW": return "⏳ Pending Review";
            default: return status;
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

    if (loading) return <p className="p-10 text-white">Loading...</p>;
    if (error) return <p className="p-10 text-red-500">{error}</p>;

    return (
        <main className="max-w-6xl mx-auto px-6 py-10">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">My Listings</h1>
                <Link href="/seller/businesses/create" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                    + New Listing
                </Link>
            </div>

            {businesses.length === 0 ? (
                <p className="text-slate-400">You haven&apos;t submitted any business listings yet.</p>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white">
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
                                    <button
                                        onClick={() => openEdit(b)}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(b.id)}
                                        disabled={deleting === b.id}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md disabled:opacity-50"
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
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Edit Listing</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input
                                    className="w-full border rounded-md px-3 py-2 text-slate-900"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                <input
                                    className="w-full border rounded-md px-3 py-2 text-slate-900"
                                    value={editForm.category}
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                <input
                                    className="w-full border rounded-md px-3 py-2 text-slate-900"
                                    value={editForm.location}
                                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Asking Price (LKR)</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-md px-3 py-2 text-slate-900"
                                    value={editForm.askingPrice}
                                    onChange={(e) => setEditForm({ ...editForm, askingPrice: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    className="w-full border rounded-md px-3 py-2 text-slate-900"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-amber-600 mt-3">
                            ⚠️ Saving will reset the listing status to &quot;Pending Review&quot; for re-approval.
                        </p>
                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={() => { setEditingBusiness(null); setEditForm(null); }}
                                className="px-4 py-2 rounded-md border text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={saving}
                                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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