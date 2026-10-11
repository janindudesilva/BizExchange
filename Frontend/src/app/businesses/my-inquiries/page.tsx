"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Inquiry, InquiryApiResponse } from "@/types/inquiry";

export default function MyInquiriesPage() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {
        let ignore = false;
        async function loadInquiries() {
            try {
                const response = await apiRequest<InquiryApiResponse>("/inquiries/sent");
                if (!ignore) {
                    setInquiries(response.data);
                }
            } catch (err) {
                if (!ignore) {
                    setError(err instanceof Error ? err.message : "Could not load your inquiries");
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        loadInquiries();
        return () => {
            ignore = true;
        };
    }, []);

    const statusBadge = (status: string) => {
        switch (status) {
            case "PENDING_APPROVAL": return <span className="text-[#f5a623]">● Waiting for seller</span>;
            case "ACTIVE": return <span className="text-[#00cfa8]">● Active</span>;
            case "REJECTED": return <span className="text-red-400">● Declined</span>;
            case "CLOSED": return <span className="text-[#4f6380]">● Closed</span>;
            default: return status;
        }
    };

    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            <h1 className="text-xl sm:text-2xl font-bold text-[#d8e4f0] mb-6">My Inquiries</h1>

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
                            To <span className="text-[#d8e4f0]">{inquiry.sellerName}</span>
                            {inquiry.sellerRating !== undefined && inquiry.sellerRating !== null && (
                                <span className="ml-2 inline-flex items-center gap-1">
                                    <span className="text-yellow-500">★</span>
                                    <span className="text-[#d8e4f0]">{inquiry.sellerRating.toFixed(1)}</span>
                                    <span className="text-[#4f6380]">({inquiry.sellerReviewCount})</span>
                                </span>
                            )}
                        </p>
                        <p className="text-[#8092ab] text-sm leading-6 break-words">{inquiry.initialMessage}</p>
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
                                className="inline-flex items-center text-sm text-[#00cfa8] hover:underline min-h-[40px]"
                            >
                                {inquiry.status === "ACTIVE" ? "Open chat →" : "View conversation →"}
                            </Link>
                        )}

                        {inquiry.status === "CLOSED" && (
                            <div className="mt-4 pt-3 border-t border-white/5 text-xs text-[#8092ab] flex items-center justify-between">
                                <span>
                                    {inquiry.hasReviewed
                                        ? "✓ Seller reviewed"
                                        : "Seller reviews require a completed acquisition deal."}
                                </span>
                                {!inquiry.hasReviewed && (
                                    <Link
                                        href="/buyer/deals"
                                        className="text-[#00cfa8] hover:underline font-semibold"
                                    >
                                        My Deals Room →
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </main>
    );
}
