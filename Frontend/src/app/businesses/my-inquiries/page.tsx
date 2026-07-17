"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Inquiry, InquiryApiResponse } from "@/types/inquiry";

export default function MyInquiriesPage() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [submittingReview, setSubmittingReview] = useState<number | null>(null);

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        try {
            const response = await apiRequest<InquiryApiResponse>("/inquiries/sent");
            setInquiries(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load your inquiries");
        } finally {
            setLoading(false);
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case "PENDING_APPROVAL": return <span className="text-[#f5a623]">● Waiting for seller</span>;
            case "ACTIVE": return <span className="text-[#00cfa8]">● Active</span>;
            case "REJECTED": return <span className="text-red-400">● Declined</span>;
            case "CLOSED": return <span className="text-[#4f6380]">● Closed</span>;
            default: return status;
        }
    };

    const submitReview = async (inquiry: Inquiry, rating: number, comment: string) => {
        setSubmittingReview(inquiry.id);
        try {
            await apiRequest(`/reviews/seller/${inquiry.sellerId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, comment })
            });
            // Refresh inquiries to update hasReviewed status
            await fetchInquiries();
        } catch (err) {
            console.error("Failed to submit review", err);
            alert("Failed to submit review. Please try again.");
        } finally {
            setSubmittingReview(null);
        }
    };

    const RatingForm = ({ inquiry }: { inquiry: Inquiry }) => {
        const [rating, setRating] = useState(5);
        const [comment, setComment] = useState("");
        const [showForm, setShowForm] = useState(false);

        if (!showForm) {
            return (
                <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm"
                >
                    Rate Seller
                </button>
            );
        }

        return (
            <div className="mt-4 bg-[#0d1220] border border-white/10 rounded-xl p-4">
                <h4 className="text-[#d8e4f0] font-semibold mb-3">Rate {inquiry.sellerName}</h4>
                <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`text-2xl transition-colors ${star <= rating ? "text-yellow-500" : "text-[#4f6380]"}`}
                        >
                            ★
                        </button>
                    ))}
                </div>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience (optional)"
                    className="w-full bg-[#121c32] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 transition-colors text-sm resize-none"
                    rows={3}
                />
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => submitReview(inquiry, rating, comment)}
                        disabled={submittingReview === inquiry.id}
                        className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm disabled:opacity-50"
                    >
                        {submittingReview === inquiry.id ? "Submitting..." : "Submit Review"}
                    </button>
                    <button
                        onClick={() => setShowForm(false)}
                        className="text-[#8092ab] px-4 py-2 rounded-lg hover:text-[#d8e4f0] transition-colors text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    };

    return (
        <main className="max-w-4xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-bold text-[#d8e4f0] mb-6">My Inquiries</h1>

            {loading && <p className="text-[#4f6380]">Loading inquiries...</p>}
            {error && <p className="text-red-400">{error}</p>}

            {!loading && !error && inquiries.length === 0 && (
                <p className="text-[#4f6380]">
                    You haven&apos;t sent any inquiries yet. Browse{" "}
                    <Link href="/businesses" className="text-[#00cfa8]">available businesses</Link>.
                </p>
            )}

            <div className="flex flex-col gap-4">
                {inquiries.map((inquiry) => (
                    <div
                        key={inquiry.id}
                        className="bg-[#121c32] border border-white/5 rounded-2xl p-5"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <Link
                                href={`/businesses/${inquiry.businessId}`}
                                className="text-[#d8e4f0] font-semibold hover:text-[#00cfa8]"
                            >
                                {inquiry.businessTitle}
                            </Link>
                            {statusBadge(inquiry.status)}
                        </div>
                        <p className="text-[#8092ab] text-sm mb-2">
                            To <span className="text-[#d8e4f0]">{inquiry.sellerName}</span>
                            {inquiry.sellerRating !== undefined && inquiry.sellerRating !== null && (
                                <span className="ml-2 flex items-center gap-1">
                                    <span className="text-yellow-500">★</span>
                                    <span className="text-[#d8e4f0]">{inquiry.sellerRating.toFixed(1)}</span>
                                    <span className="text-[#4f6380]">({inquiry.sellerReviewCount})</span>
                                </span>
                            )}
                        </p>
                        <p className="text-[#8092ab] text-sm leading-6">{inquiry.initialMessage}</p>
                        <p className="text-[#4f6380] text-xs mt-3 mb-4">
                            {new Date(inquiry.createdAt).toLocaleString()}
                        </p>

                        {inquiry.status === "PENDING_APPROVAL" ? (
                            <p className="text-xs text-[#4f6380]">
                                You can&apos;t send another message until the seller responds.
                            </p>
                        ) : (
                            <Link
                                href={`/inquiries/${inquiry.id}`}
                                className="inline-block text-sm text-[#00cfa8] hover:underline"
                            >
                                {inquiry.status === "ACTIVE" ? "Open chat →" : "View conversation →"}
                            </Link>
                        )}

                        {inquiry.status === "CLOSED" && !inquiry.hasReviewed && (
                            <RatingForm inquiry={inquiry} />
                        )}

                        {inquiry.status === "CLOSED" && inquiry.hasReviewed && (
                            <div className="mt-4 text-sm text-[#00cfa8]">
                                ✓ You have reviewed this seller
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </main>
    );
}
