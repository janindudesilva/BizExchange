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
  const [userId, setUserId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [existingInquiryId, setExistingInquiryId] = useState<number | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    setRole(storedRole);
    const storedUserId = localStorage.getItem("userId");
    setUserId(storedUserId ? Number(storedUserId) : null);
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);

    // If buyer, fetch existing inquiries to see if they already contacted this business
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
      alert("Only registered buyers can send inquiries.");
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
      // Redirect to the newly created chat thread
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
        className="w-full bg-[#00cfa8] hover:bg-[#00e6bc] text-[#080c15] font-semibold py-3 px-6 rounded-xl transition-colors text-center"
      >
        {existingInquiryId ? "Open Conversation" : "Send Inquiry"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-[#121c32] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[#d8e4f0]">Start a Conversation</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <p className="text-sm text-[#8092ab] mb-4">
                Introduce yourself and ask the seller any questions you have about this listing.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                  {error}
                </div>
              )}

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                required
                rows={5}
                className="w-full bg-[#0c1524] border border-white/10 rounded-xl p-4 text-sm text-[#d8e4f0] placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8] focus:ring-1 focus:ring-[#00cfa8] resize-none mb-4 transition-all"
              />

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-[#8092ab] hover:text-[#d8e4f0] transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="px-5 py-2.5 bg-[#00cfa8] hover:bg-[#00e6bc] disabled:opacity-50 text-[#080c15] rounded-xl transition-colors text-sm font-semibold"
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
