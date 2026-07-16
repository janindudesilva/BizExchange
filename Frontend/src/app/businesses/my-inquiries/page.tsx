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
                    </div>
                ))}
            </div>
        </main>
    );
}
