"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { SingleInquiryApiResponse, InquiryApiResponse } from "@/types/inquiry";

interface SendInquiryButtonProps {
  businessId: number;
}

export default function SendInquiryButton({ businessId }: SendInquiryButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [existingInquiryId, setExistingInquiryId] = useState<number | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    setRole(storedRole);
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);

    if (storedToken && storedRole === "BUYER") {
      apiRequest<InquiryApiResponse>("/inquiries/sent")
        .then((res) => {
          const match = res.data?.find((i) => i.businessId === businessId);
          if (match) {
            setExistingInquiryId(match.id);
          }
        })
        .catch((err) => console.error("Error fetching sent inquiries", err));
    }
  }, [businessId]);

  const handleOpen = () => {
    if (!token) {
      router.push("/login");
      return;
    }
    if (role !== "BUYER") {
      alert("Only registered buyers can send inquiries. Please register or switch to a Buyer account.");
      return;
    }
    if (existingInquiryId) {
      router.push(`/inquiries/${existingInquiryId}`);
      return;
    }
    setIsOpen(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<SingleInquiryApiResponse>("/inquiries", {
        method: "POST",
        body: JSON.stringify({
          businessId,
          message: message.trim(),
        }),
      });

      setIsOpen(false);
      setMessage("");
      router.push(`/inquiries/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send inquiry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-2 bg-[#00cfa8] hover:bg-[#00e6bc] text-[#070b14] font-bold py-3.5 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(0,207,168,0.25)] hover:shadow-[0_0_28px_rgba(0,207,168,0.4)] text-sm cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>{existingInquiryId ? "Open Active Conversation" : "Initiate Confidential Inquiry"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity overflow-y-auto">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative max-h-[92dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5 sm:mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cfa8] block mb-1">
                  Confidential Inquiry
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">Contact Business Owner</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#627288] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors touch-target"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8493a8] mb-2">
                  Introduce yourself & describe your acquisition interest
                </label>
                <textarea
                  className="input-premium min-h-[140px] resize-none leading-relaxed"
                  placeholder="State your background, financing capability, and any specific questions about business operations, financial records, or transition timeline..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] text-[#52637a] flex items-start gap-2">
                <svg className="w-4 h-4 text-[#00cfa8] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Your inquiry message will be routed confidentially to the verified seller. You can chat directly and share diligence records once connected.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#8493a8] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00cfa8] text-[#070b14] hover:bg-[#00e6bc] transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_12px_rgba(0,207,168,0.2)]"
                >
                  {loading && <div className="w-3.5 h-3.5 border-2 border-[#070b14] border-t-transparent rounded-full animate-spin" />}
                  <span>{loading ? "Sending..." : "Submit Inquiry"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
