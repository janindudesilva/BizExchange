"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest, openAuthenticatedFile } from "@/lib/api";

interface Business {
  id: number;
  title: string;
  category: string;
  description: string;
  location: string;
  askingPrice: number;
  sellerName?: string;
  verificationStatus: string;
}

interface VerificationRequest {
  id: number;
  businessId: number;
  status: string;
  remarks: string | null;
  officerId: number | null;
  officerName: string | null;
}

interface Document {
  id: number;
  originalName?: string;
  fileName?: string;
  fileType: string;
  uploadedAt: string;
}

export default function VerificationOfficerReviewPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = Number(params.businessId);
  const [business, setBusiness] = useState<Business | null>(null);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "VERIFICATION_OFFICER" && role !== "ADMIN") {
      router.push("/login");
      return;
    }

    let ignore = false;
    async function loadAll() {
      try {
        const [bizRes, reqRes, docRes] = await Promise.allSettled([
          apiRequest<{ data: Business }>(`/businesses/${businessId}`),
          apiRequest<{ data: VerificationRequest }>(`/verification/business/${businessId}`),
          apiRequest<{ data: Document[] }>(`/verification/${businessId}/documents`),
        ]);
        if (ignore) return;
        if (bizRes.status === "fulfilled") setBusiness(bizRes.value.data);
        if (reqRes.status === "fulfilled") setVerificationRequest(reqRes.value.data);
        if (docRes.status === "fulfilled") setDocuments(docRes.value.data || []);
      } catch (err) {
        console.error("Failed to load verification review data", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadAll();
    return () => {
      ignore = true;
    };
  }, [businessId, router]);

  const handleApprove = async () => {
    const requestId = verificationRequest?.id;
    if (!requestId) {
      alert("No verification request found for this business.");
      return;
    }
    if (!confirm("Are you confident to approve this business verification?")) return;
    setActionLoading(true);
    try {
      await apiRequest(`/verification/${requestId}/approve`, {
        method: "POST",
      });
      setMessage("Business verified successfully. It is now awaiting administrator publication.");
      setMessageType("success");
      setTimeout(() => router.push("/verification-officer/dashboard"), 1200);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to approve business");
      setMessageType("error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const requestId = verificationRequest?.id;
    if (!requestId) {
      alert("No verification request found for this business.");
      return;
    }
    if (!remarks.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }
    setActionLoading(true);
    try {
      await apiRequest(`/verification/${requestId}/reject`, {
        method: "POST",
        body: JSON.stringify({ remarks: remarks.trim() }),
      });
      setMessage("Business rejected");
      setMessageType("success");
      setShowRejectModal(false);
      setTimeout(() => router.push("/verification-officer/dashboard"), 1200);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to reject business");
      setMessageType("error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestMoreInfo = async () => {
    const requestId = verificationRequest?.id;
    if (!requestId) {
      alert("No verification request found for this business.");
      return;
    }
    if (!remarks.trim()) {
      alert("Please provide the specific information requested.");
      return;
    }
    setActionLoading(true);
    try {
      await apiRequest(`/verification/${requestId}/request-info`, {
        method: "POST",
        body: JSON.stringify({ remarks: remarks.trim() }),
      });
      setMessage("Request for more information sent to seller");
      setMessageType("success");
      setShowInfoModal(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to request more info");
      setMessageType("error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center text-xs text-[#8493a8]">
        <div className="w-8 h-8 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading verification case #{businessId}...
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/verification-officer/dashboard"
              className="text-xs text-[#00cfa8] hover:underline"
            >
              ← Verification Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Listing Audit: {business?.title || `Business #${businessId}`}
          </h1>
          <p className="text-xs text-[#8493a8] mt-1">
            Carefully verify financial declarations and ownership documents before approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full badge-amber font-semibold">
            Status: {business?.verificationStatus || "PENDING"}
          </span>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-2 ${
            messageType === "error"
              ? "bg-red-500/10 border border-red-500/30 text-red-400"
              : "bg-[#00cfa8]/10 border border-[#00cfa8]/20 text-[#00cfa8]"
          }`}
        >
          {messageType === "error" ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Two Column Layout: Business Details + Verification Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Listing Profile & Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Facts */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Listing Information
            </h2>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#627288] mb-1">
                  Asking Price
                </span>
                <span className="text-base font-black text-[#00cfa8] tabular-nums">
                  LKR {business?.askingPrice?.toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#627288] mb-1">
                  Category
                </span>
                <span className="text-sm font-bold text-white">
                  {business?.category || "General"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#627288] mb-1">
                  Location
                </span>
                <span className="text-sm font-bold text-white">
                  {business?.location || "Sri Lanka"}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#627288] mb-2">
                Business Description & Operations
              </span>
              <p className="text-xs text-[#8493a8] leading-relaxed whitespace-pre-line p-4 rounded-xl bg-white/[0.02] border border-white/5">
                {business?.description}
              </p>
            </div>
          </div>

          {/* Uploaded Documents */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Uploaded Verification Files ({documents.length})
              </h2>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-[#627288] py-4">No documents uploaded by seller.</p>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => {
                  const docTitle = doc.originalName || doc.fileName || `Document #${doc.id}`;
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                          📄
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{docTitle}</p>
                          <span className="text-[10px] text-[#52637a] font-mono">
                            Type: {doc.fileType} • {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            await openAuthenticatedFile(`/verification/files/${doc.id}`);
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Failed to open document");
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00cfa8] text-[#070b14] hover:bg-[#00e6bc] transition-all"
                      >
                        Inspect File ↗
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Decision Actions */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5 sticky top-24 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#00cfa8]">
              Officer Decision Drawer
            </h3>

            <p className="text-xs text-[#8493a8] leading-relaxed">
              Verify that the listed asking price aligns with the financial statements and that seller identity has been confirmed.
            </p>

            <div className="space-y-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={handleApprove}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#00cfa8] text-[#070b14] hover:bg-[#00e6bc] transition-all shadow-[0_0_16px_rgba(0,207,168,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>✓ Approve & Publish Listing</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={() => {
                  setRemarks("");
                  setShowInfoModal(true);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                Request Clarification / Documents
              </button>

              <button
                disabled={actionLoading}
                onClick={() => {
                  setRemarks("");
                  setShowRejectModal(true);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                ✕ Reject Listing Application
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Reject Listing</h3>
            <p className="text-xs text-[#8493a8] mb-4">
              Enter the rationale explaining why this business cannot be verified.
            </p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Discrepancy between stated revenue and bank statements..."
              className="input-premium h-28 resize-none text-xs"
              required
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs text-[#8493a8] hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleReject}
                className="px-4 py-2 text-xs font-bold bg-rose-500 text-white rounded-xl hover:bg-rose-600"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Request Additional Information</h3>
            <p className="text-xs text-[#8493a8] mb-4">
              State what documents or disclosures the seller must provide.
            </p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Please upload 2023-2024 P&L statements signed by your accountant..."
              className="input-premium h-28 resize-none text-xs"
              required
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 text-xs text-[#8493a8] hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleRequestMoreInfo}
                className="px-4 py-2 text-xs font-bold bg-blue-500 text-white rounded-xl hover:bg-blue-600"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
