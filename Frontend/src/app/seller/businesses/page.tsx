"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiRequest, apiUpload } from "@/lib/api";

interface Business {
    id: number;
    title: string;
    category: string;
    sellerName: string;
    description: string;
    location: string;
    askingPrice: number;
    status: string;
    rejectionReason?: string;
}

interface EditForm {
    title: string;
    description: string;
    location: string;
    askingPrice: string;
    category: string;
}

interface BusinessFile {
    id: number;
    fileType: "IMAGE" | "DOCUMENT" | "FINANCIAL_REPORT";
    originalName: string;
    url: string;
    uploadedAt: string;
}

const API = "http://localhost:8080/api";

function fmtSize(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeIcon(type: string): string {
    if (type === "IMAGE") return "📷";
    if (type === "DOCUMENT") return "📄";
    return "📊";
}

function fileTypeLabel(type: string): string {
    if (type === "IMAGE") return "Photo";
    if (type === "DOCUMENT") return "Document";
    return "Financial Report";
}

export default function MyListingsPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
    const [editForm, setEditForm] = useState<EditForm | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

    // File management state for edit modal
    const [existingFiles, setExistingFiles] = useState<BusinessFile[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [newDocFiles, setNewDocFiles] = useState<File[]>([]);
    const [newFinancialFiles, setNewFinancialFiles] = useState<File[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const finInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMyBusinesses();
        fetchCats();
    }, []);

    const fetchCats = async () => {
        try {
            const response = await apiRequest<{ data: { id: number; name: string }[] }>("/categories");
            setCategories(response.data || []);
        } catch (err) {
            console.error("Failed to load categories", err);
        }
    };

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

    const fetchExistingFiles = async (businessId: number) => {
        setFilesLoading(true);
        try {
            const response = await apiRequest<{ data: BusinessFile[] }>(`/businesses/${businessId}/files`);
            setExistingFiles(response.data || []);
        } catch (err) {
            console.error("Failed to load files", err);
            setExistingFiles([]);
        } finally {
            setFilesLoading(false);
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
        setNewImageFiles([]);
        setNewDocFiles([]);
        setNewFinancialFiles([]);
        fetchExistingFiles(b.id);
    };

    const closeEdit = () => {
        setEditingBusiness(null);
        setEditForm(null);
        setExistingFiles([]);
        setNewImageFiles([]);
        setNewDocFiles([]);
        setNewFinancialFiles([]);
    };

    const handleDeleteFile = async (fileId: number) => {
        if (!editingBusiness) return;
        if (!confirm("Delete this file? This cannot be undone.")) return;
        setDeletingFileId(fileId);
        try {
            await apiRequest(`/businesses/${editingBusiness.id}/files/${fileId}`, { method: "DELETE" });
            setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete file");
        } finally {
            setDeletingFileId(null);
        }
    };

    const handleEditSave = async () => {
        if (!editingBusiness || !editForm) return;
        setSaving(true);
        try {
            // 1. Save listing metadata
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

            // 2. Upload any new files
            const hasNewFiles = newImageFiles.length > 0 || newDocFiles.length > 0 || newFinancialFiles.length > 0;
            if (hasNewFiles) {
                setUploadingFiles(true);
                const formData = new FormData();
                newImageFiles.forEach((f) => formData.append("images", f));
                newDocFiles.forEach((f) => formData.append("documents", f));
                newFinancialFiles.forEach((f) => formData.append("financialReports", f));
                await apiUpload(`/businesses/${editingBusiness.id}/files`, formData);
            }

            closeEdit();
            await fetchMyBusinesses();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update listing");
        } finally {
            setSaving(false);
            setUploadingFiles(false);
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

    const inputClass = "w-full bg-[#121c32] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] rounded-lg px-3 py-2 focus:outline-none focus:border-[#00cfa8]/50 transition-colors text-sm";

    const FilePickerRow = ({
        label, icon, accept, files, onAdd, onRemove, inputRef,
    }: {
        label: string; icon: string; accept: string;
        files: File[]; onAdd: (f: File[]) => void;
        onRemove: (i: number) => void;
        inputRef: React.RefObject<HTMLInputElement | null>;
    }) => (
        <div>
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">{icon}</span>
                <span className="text-[11px] tracking-widest text-[#4f6380] font-bold uppercase">{label}</span>
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="ml-auto text-xs bg-[#00cfa8]/10 text-[#00cfa8] hover:bg-[#00cfa8]/20 px-2.5 py-1 rounded font-semibold transition-colors"
                >
                    + Add Files
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        const incoming = Array.from(e.target.files ?? []);
                        const unique = incoming.filter(f => !files.find(x => x.name === f.name && x.size === f.size));
                        if (unique.length) onAdd(unique);
                        e.target.value = "";
                    }}
                />
            </div>
            {files.length > 0 && (
                <ul className="space-y-1">
                    {files.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 bg-[#0d1220] border border-white/10 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-[#c7d2e0] flex-1 truncate">{f.name}</span>
                            <span className="text-[10px] text-[#4f6380] flex-shrink-0">{fmtSize(f.size)}</span>
                            <button
                                type="button"
                                onClick={() => onRemove(i)}
                                className="w-4 h-4 flex items-center justify-center text-[#4f6380] hover:text-red-400 transition-colors flex-shrink-0 text-xs"
                            >
                                ✕
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

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
                                <td className="p-4 text-sm text-[#00cfa8] font-medium">{b.askingPrice.toLocaleString()}</td>
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

            {/* ── Enhanced Edit Modal ── */}
            {editingBusiness && editForm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0d1220] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-[#d8e4f0]">Edit Listing</h2>
                                <p className="text-xs text-[#4f6380] mt-0.5">{editingBusiness.title}</p>
                            </div>
                            <button
                                onClick={closeEdit}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#4f6380] hover:text-[#c7d2e0] hover:bg-white/[0.05] transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Scrollable Body */}
                        <div className="overflow-y-auto flex-1 p-6 space-y-5">

                            {/* ── Listing Details ── */}
                            <section>
                                <h3 className="text-[10px] tracking-widest text-[#4f6380] font-bold mb-3 uppercase">
                                    Listing Details
                                </h3>
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
                                        <select
                                            className={inputClass}
                                            value={editForm.category}
                                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
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
                            </section>

                            <div className="border-t border-white/5" />

                            {/* ── Existing Attachments ── */}
                            <section>
                                <h3 className="text-[10px] tracking-widest text-[#4f6380] font-bold mb-3 uppercase">
                                    Existing Attachments
                                </h3>
                                {filesLoading ? (
                                    <p className="text-sm text-[#4f6380]">Loading files...</p>
                                ) : existingFiles.length === 0 ? (
                                    <p className="text-sm text-[#4f6380] italic">No attachments uploaded yet.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {existingFiles.map((file) => (
                                            <li
                                                key={file.id}
                                                className="flex items-center gap-3 bg-[#080c15] border border-white/5 rounded-xl px-3 py-2.5 group"
                                            >
                                                <span className="text-lg flex-shrink-0">{fileTypeIcon(file.fileType)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-[#c7d2e0] truncate">{file.originalName}</p>
                                                    <p className="text-[10px] text-[#4f6380]">{fileTypeLabel(file.fileType)}</p>
                                                </div>
                                                {/* Preview link */}
                                                <a
                                                    href={`${API}${file.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#4f6380] hover:text-[#00cfa8] transition-colors flex-shrink-0"
                                                    title="Preview file"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                                {/* Delete button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteFile(file.id)}
                                                    disabled={deletingFileId === file.id}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[#4f6380] hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-all flex-shrink-0"
                                                    title="Delete file"
                                                >
                                                    {deletingFileId === file.id ? (
                                                        <span className="text-[10px]">…</span>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <div className="border-t border-white/5" />

                            {/* ── Upload New Files ── */}
                            <section>
                                <h3 className="text-[10px] tracking-widest text-[#4f6380] font-bold mb-3 uppercase">
                                    Add New Attachments
                                </h3>
                                <div className="space-y-4 bg-[#080c15] border border-white/5 rounded-xl p-4">
                                    <FilePickerRow
                                        label="Business Photos"
                                        icon="📷"
                                        accept="image/*"
                                        files={newImageFiles}
                                        onAdd={(f) => setNewImageFiles((p) => [...p, ...f])}
                                        onRemove={(i) => setNewImageFiles((p) => p.filter((_, idx) => idx !== i))}
                                        inputRef={imageInputRef}
                                    />
                                    <FilePickerRow
                                        label="Business Documents"
                                        icon="📄"
                                        accept=".pdf,.doc,.docx,application/pdf,application/msword"
                                        files={newDocFiles}
                                        onAdd={(f) => setNewDocFiles((p) => [...p, ...f])}
                                        onRemove={(i) => setNewDocFiles((p) => p.filter((_, idx) => idx !== i))}
                                        inputRef={docInputRef}
                                    />
                                    <FilePickerRow
                                        label="Financial Reports"
                                        icon="📊"
                                        accept=".pdf,.xlsx,.xls"
                                        files={newFinancialFiles}
                                        onAdd={(f) => setNewFinancialFiles((p) => [...p, ...f])}
                                        onRemove={(i) => setNewFinancialFiles((p) => p.filter((_, idx) => idx !== i))}
                                        inputRef={finInputRef}
                                    />
                                </div>
                            </section>

                            <p className="text-xs text-[#f5a623]">
                                ⚠️ Saving will reset the listing status to &quot;Pending Review&quot; for re-approval.
                            </p>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-white/5 flex-shrink-0">
                            <button
                                onClick={closeEdit}
                                className="px-4 py-2 rounded-lg border border-white/10 text-[#8092ab] hover:bg-white/[0.04] hover:text-[#c7d2e0] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={saving || uploadingFiles}
                                className="px-5 py-2 rounded-lg bg-[#00cfa8] text-[#080c15] font-semibold hover:bg-[#00e6bc] disabled:opacity-50 transition-colors"
                            >
                                {uploadingFiles ? "Uploading files..." : saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}