"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

interface SellerProfile {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  nicOrPassport: string | null;
  address: string | null;
  businessOwnerType: string | null;
  verificationStatus: string;
  reviewNotes: string | null;
  flaggedSuspicious: boolean;
  reviewedByName: string | null;
  rejectionReason: string | null;
}

interface Document {
  id: number;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

export default function OfficerSellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = Number(params.id);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showSuspiciousModal, setShowSuspiciousModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [suspiciousReason, setSuspiciousReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSellerDetails();
    fetchDocuments();
  }, [sellerId]);

  const fetchSellerDetails = async () => {
    try {
      const response = await apiRequest<{ data: SellerProfile }>(`/admin/sellers/${sellerId}`);
      setSeller(response.data);
    } catch (err) {
      console.error("Failed to fetch seller", err);
      setMessage("Failed to load seller details");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await apiRequest<{ data: Document[] }>(`/admin/sellers/${sellerId}/documents`);
      setDocuments(response.data || []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  };

  const handleAddNotes = async () => {
    try {
      await apiRequest(`/admin/sellers/${sellerId}/notes`, {
        method: "PUT",
        body: JSON.stringify({ notes }),
      });
      setMessage("Review notes added successfully");
      setShowNotesModal(false);
      setNotes("");
      fetchSellerDetails();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add notes");
    }
  };

  const handleReportSuspicious = async () => {
    try {
      await apiRequest(`/admin/sellers/${sellerId}/report-suspicious`, {
        method: "PUT",
        body: JSON.stringify({ reason: suspiciousReason }),
      });
      setMessage("Seller flagged as suspicious");
      setShowSuspiciousModal(false);
      setSuspiciousReason("");
      fetchSellerDetails();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to flag seller");
    }
  };

  const handleReject = async () => {
    try {
      await apiRequest(`/admin/sellers/${sellerId}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason: rejectionReason }),
      });
      setMessage("Seller rejected successfully");
      setShowRejectModal(false);
      setRejectionReason("");
      fetchSellerDetails();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to reject seller");
    }
  };

  const handleApprove = async () => {
    try {
      await apiRequest(`/admin/sellers/${sellerId}/approve`, {
        method: "PUT",
      });
      setMessage("Seller approved successfully");
      fetchSellerDetails();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to approve seller");
    }
  };

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-[#4f6380]">Loading seller details...</div>
      </main>
    );
  }

  if (!seller) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-[#4f6380]">Seller not found</div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#d8e4f0] tracking-wide">SELLER DETAILS</h1>
          <p className="text-[#4f6380] text-sm">Review seller profile and documents</p>
        </div>
        <button
          onClick={() => router.back()}
          className="bg-[#4f6380] text-[#d8e4f0] px-4 py-2 rounded-lg font-semibold hover:bg-[#8092ab] transition-colors"
        >
          Back
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-[#0d1220] border border-white/10 rounded-lg text-[#8092ab] text-sm">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold mb-4 text-[#d8e4f0]">Personal Information</h2>
          <div className="space-y-3">
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">FULL NAME</div>
              <div className="text-[#d8e4f0]">{seller.fullName}</div>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">EMAIL</div>
              <div className="text-[#c7d2e0]">{seller.email}</div>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">PHONE</div>
              <div className="text-[#c7d2e0]">{seller.phone || "—"}</div>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">NIC/PASSPORT</div>
              <div className="text-[#c7d2e0]">{seller.nicOrPassport || "—"}</div>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">ADDRESS</div>
              <div className="text-[#c7d2e0]">{seller.address || "—"}</div>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">BUSINESS OWNER TYPE</div>
              <div className="text-[#c7d2e0]">{seller.businessOwnerType || "—"}</div>
            </div>
          </div>
        </div>

        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold mb-4 text-[#d8e4f0]">Verification Status</h2>
          <div className="space-y-3">
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">STATUS</div>
              <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                seller.verificationStatus === "APPROVED" ? "bg-[#10b981]/20 text-[#10b981]" :
                seller.verificationStatus === "PENDING" ? "bg-[#f59e0b]/20 text-[#f59e0b]" :
                "bg-[#ef4444]/20 text-[#ef4444]"
              }`}>
                {seller.verificationStatus}
              </div>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">FLAGGED SUSPICIOUS</div>
              <div className={seller.flaggedSuspicious ? "text-[#ef4444]" : "text-[#10b981]"}>
                {seller.flaggedSuspicious ? "⚠️ Yes" : "✓ No"}
              </div>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">REVIEWED BY</div>
              <div className="text-[#c7d2e0]">{seller.reviewedByName || "—"}</div>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">REJECTION REASON</div>
              <div className="text-[#c7d2e0]">{seller.rejectionReason || "—"}</div>
            </div>
            {seller.reviewNotes && (
              <div>
                <div className="text-[#4f6380] text-xs tracking-wider mb-1">REVIEW NOTES</div>
                <div className="text-[#c7d2e0] bg-[#0d1220] p-3 rounded-lg">{seller.reviewNotes}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl mb-8">
        <h2 className="text-lg font-semibold mb-4 text-[#d8e4f0]">Documents</h2>
        {documents.length === 0 ? (
          <div className="text-[#4f6380]">No documents uploaded</div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex justify-between items-center p-3 bg-[#0d1220] rounded-lg">
                <div>
                  <div className="text-[#d8e4f0]">{doc.fileName}</div>
                  <div className="text-[#4f6380] text-xs">{new Date(doc.uploadedAt).toLocaleString()}</div>
                </div>
                <span className="text-xs px-2 py-1 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded">
                  {doc.fileType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowNotesModal(true)}
          className="bg-[#3b82f6] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#60a5fa] transition-colors"
        >
          Add Review Notes
        </button>
        <button
          onClick={() => setShowSuspiciousModal(true)}
          className="bg-[#f59e0b] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#fbbf24] transition-colors"
        >
          Flag Suspicious
        </button>
        {seller.verificationStatus === "PENDING" && (
          <>
            <button
              onClick={handleApprove}
              className="bg-[#10b981] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#34d399] transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="bg-[#ef4444] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#f87171] transition-colors"
            >
              Reject
            </button>
          </>
        )}
      </div>

      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#121c32] border border-white/10 p-6 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-[#d8e4f0]">Add Review Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter your review notes..."
              className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 h-32 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAddNotes}
                className="flex-1 bg-[#00cfa8] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors"
              >
                Save Notes
              </button>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotes("");
                }}
                className="flex-1 bg-[#4f6380] text-[#d8e4f0] p-3 rounded-lg font-semibold hover:bg-[#8092ab] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuspiciousModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#121c32] border border-white/10 p-6 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-[#d8e4f0]">Flag as Suspicious</h2>
            <textarea
              value={suspiciousReason}
              onChange={(e) => setSuspiciousReason(e.target.value)}
              placeholder="Enter the reason for flagging..."
              className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 h-32 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReportSuspicious}
                className="flex-1 bg-[#f59e0b] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#fbbf24] transition-colors"
              >
                Flag Seller
              </button>
              <button
                onClick={() => {
                  setShowSuspiciousModal(false);
                  setSuspiciousReason("");
                }}
                className="flex-1 bg-[#4f6380] text-[#d8e4f0] p-3 rounded-lg font-semibold hover:bg-[#8092ab] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#121c32] border border-white/10 p-6 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-[#d8e4f0]">Reject Seller</h2>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter the rejection reason..."
              className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 h-32 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                className="flex-1 bg-[#ef4444] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#f87171] transition-colors"
              >
                Reject Seller
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                className="flex-1 bg-[#4f6380] text-[#d8e4f0] p-3 rounded-lg font-semibold hover:bg-[#8092ab] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
