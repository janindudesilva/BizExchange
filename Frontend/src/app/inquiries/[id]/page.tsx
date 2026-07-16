"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import {
    Inquiry,
    Message,
    MessageApiResponse,
    SingleInquiryApiResponse,
    SingleMessageApiResponse,
} from "@/types/inquiry";

export default function InquiryThreadPage() {
    const params = useParams();
    const router = useRouter();
    const inquiryId = params.id as string;

    const [inquiry, setInquiry] = useState<Inquiry | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [acting, setActing] = useState(false);

    const currentUserId = typeof window !== "undefined" ? Number(localStorage.getItem("userId")) : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchThread();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inquiryId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchThread = async () => {
        try {
            const [inquiryRes, msgRes] = await Promise.all([
                apiRequest<SingleInquiryApiResponse>(`/inquiries/${inquiryId}`),
                apiRequest<MessageApiResponse>(`/inquiries/${inquiryId}/messages`),
            ]);
            setInquiry(inquiryRes.data);
            setMessages(msgRes.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load this conversation");
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!draft.trim()) return;
        setSending(true);
        setError("");
        try {
            const res = await apiRequest<SingleMessageApiResponse>(`/inquiries/${inquiryId}/messages`, {
                method: "POST",
                body: JSON.stringify({ message: draft }),
            });
            setMessages((prev) => [...prev, res.data]);
            setDraft("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not send message");
        } finally {
            setSending(false);
        }
    };

    const handleApprove = async () => {
        setActing(true);
        try {
            const res = await apiRequest<SingleInquiryApiResponse>(`/inquiries/${inquiryId}/approve`, {
                method: "PUT",
            });
            setInquiry(res.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not approve inquiry");
        } finally {
            setActing(false);
        }
    };

    const handleReject = async () => {
        setActing(true);
        try {
            const res = await apiRequest<SingleInquiryApiResponse>(`/inquiries/${inquiryId}/reject`, {
                method: "PUT",
            });
            setInquiry(res.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not reject inquiry");
        } finally {
            setActing(false);
        }
    };

    const handleClose = async () => {
        setActing(true);
        try {
            const res = await apiRequest<SingleInquiryApiResponse>(`/inquiries/${inquiryId}/close`, {
                method: "PUT",
            });
            setInquiry(res.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not close conversation");
        } finally {
            setActing(false);
        }
    };

    if (loading) {
        return <main className="max-w-3xl mx-auto px-6 py-10"><p className="text-[#4f6380]">Loading conversation...</p></main>;
    }

    if (!inquiry) {
        return (
            <main className="max-w-3xl mx-auto px-6 py-10">
                <p className="text-red-400">{error || "Inquiry not found."}</p>
                <button onClick={() => router.back()} className="text-[#00cfa8] mt-4">← Back</button>
            </main>
        );
    }

    const isSeller = role === "SELLER" && currentUserId === inquiry.sellerId;
    const canChat = inquiry.status === "ACTIVE";

    return (
        <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col h-[85vh]">
            <div className="mb-4">
                <Link href={`/businesses/${inquiry.businessId}`} className="text-[#d8e4f0] font-semibold hover:text-[#00cfa8]">
                    {inquiry.businessTitle}
                </Link>
                <p className="text-[#8092ab] text-sm mt-1">
                    {inquiry.buyerName} ↔ {inquiry.sellerName}
                    <span className="ml-3 text-[#4f6380]">Status: {inquiry.status.replace("_", " ")}</span>
                </p>
            </div>

            {/* Seller approval banner */}
            {isSeller && inquiry.status === "PENDING_APPROVAL" && (
                <div className="bg-[#121c32] border border-white/5 rounded-2xl p-5 mb-4">
                    <p className="text-[#d8e4f0] mb-3">This buyer wants to start a conversation. Approve to open the chat.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={handleApprove}
                            disabled={acting}
                            className="flex-1 bg-[#00cfa8] hover:bg-[#00e6bc] disabled:opacity-50 text-[#080c15] font-semibold py-2 rounded-xl"
                        >
                            Approve
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={acting}
                            className="flex-1 border border-white/10 text-[#8092ab] py-2 rounded-xl"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            )}

            {!isSeller && inquiry.status === "PENDING_APPROVAL" && (
                <div className="bg-[#121c32] border border-white/5 rounded-2xl p-5 mb-4">
                    <p className="text-[#f5a623]">Waiting for the seller to approve your inquiry before you can continue chatting.</p>
                </div>
            )}

            {inquiry.status === "REJECTED" && (
                <div className="bg-[#121c32] border border-white/5 rounded-2xl p-5 mb-4">
                    <p className="text-red-400">This inquiry was declined by the seller.</p>
                </div>
            )}

            {inquiry.status === "CLOSED" && (
                <div className="bg-[#121c32] border border-white/5 rounded-2xl p-5 mb-4">
                    <p className="text-[#4f6380]">This conversation is closed.</p>
                </div>
            )}

            {/* Message thread */}
            <div className="flex-1 overflow-y-auto bg-[#0c1524] border border-white/5 rounded-2xl p-4 mb-4 flex flex-col gap-3">
                {messages.map((m) => {
                    const mine = m.senderId === currentUserId;
                    return (
                        <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                            <div
                                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                                    mine ? "bg-[#00cfa8] text-[#080c15]" : "bg-[#121c32] text-[#d8e4f0] border border-white/5"
                                }`}
                            >
                                {m.message}
                            </div>
                            <span className="text-[10px] text-[#4f6380] mt-1">
                                {mine ? "You" : m.senderName} · {new Date(m.createdAt).toLocaleTimeString()}
                            </span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

            {/* Composer */}
            {canChat ? (
                <div className="flex gap-3">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-[#0c1524] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#d8e4f0] focus:outline-none focus:border-[#00cfa8]"
                    />
                    <button
                        onClick={handleSend}
                        disabled={sending || !draft.trim()}
                        className="bg-[#00cfa8] hover:bg-[#00e6bc] disabled:opacity-50 text-[#080c15] font-semibold px-6 rounded-xl"
                    >
                        Send
                    </button>
                </div>
            ) : (
                <p className="text-[#4f6380] text-sm text-center">Messaging is disabled for this conversation.</p>
            )}

            {canChat && (
                <button onClick={handleClose} disabled={acting} className="text-[#4f6380] text-xs mt-3 self-end hover:text-[#8092ab]">
                    Close conversation
                </button>
            )}
        </main>
    );
}
