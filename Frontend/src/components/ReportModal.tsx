"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { ReportCategory, ReportTargetType, ReportBuyer } from "@/types/report";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: number;
  targetTitle: string;
}

const CATEGORY_OPTIONS: { value: ReportCategory; label: string; desc: string }[] = [
  {
    value: "SCAM_OR_FRAUD",
    label: "Scam or Fraudulent Activity",
    desc: "Fake financial statements, ghost operations, or identity impersonation.",
  },
  {
    value: "MISLEADING_INFORMATION",
    label: "Misleading Information",
    desc: "Exaggerated revenue/metrics, false claims, or undisclosed liabilities.",
  },
  {
    value: "SUSPICIOUS_DOCUMENTS",
    label: "Suspicious or Altered Documents",
    desc: "Unverified certificates, forged deeds, or altered accounting reports.",
  },
  {
    value: "OTHER",
    label: "Other Policy Violation",
    desc: "Harassment, off-platform payment solicitation, or rules violations.",
  },
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}: ReportModalProps) {
  const router = useRouter();

  const [category, setCategory] = useState<ReportCategory>("SCAM_OR_FRAUD");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<ReportBuyer | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      router.push("/login");
      return;
    }

    if (role !== "BUYER") {
      setError("Only registered buyer accounts can submit reports. Please sign in as a Buyer.");
      return;
    }

    const trimmed = description.trim();
    if (trimmed.length < 10) {
      setError("Please provide a detailed description (minimum 10 characters).");
      return;
    }
    if (trimmed.length > 2000) {
      setError("Description exceeds maximum length of 2,000 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ data: ReportBuyer }>("/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType,
          targetId,
          category,
          description: trimmed,
        }),
      });

      setSubmittedReport(res.data);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit report";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setDescription("");
    setError("");
    setSuccess(false);
    setSubmittedReport(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0e1626] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-7 relative text-[#d8e4f0]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {targetType === "BUSINESS" ? "Report Listing" : "Report Seller"}
              </span>
              <span className="text-xs text-[#627d98]">Target ID #{targetId}</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              {targetType === "BUSINESS" ? "Report Suspicious Business" : "Report Suspicious Seller"}
            </h2>
            <p className="text-xs text-[#829ab1] mt-0.5 truncate max-w-sm">
              Target: <span className="text-white font-medium">{targetTitle}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="text-[#627d98] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#00cfa8]/10 text-[#00cfa8] border border-[#00cfa8]/20 flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Report Submitted to Compliance</h3>
              <p className="text-xs text-[#829ab1] mt-1 max-w-md mx-auto">
                Thank you for helping protect the BizExchange marketplace. Our compliance team will
                review this report. You can track progress and view the administrator resolution in
                your reports dashboard.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[#829ab1] text-left">
              <div className="flex justify-between">
                <span>Report ID:</span>
                <span className="font-mono text-white">#{submittedReport?.id}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Status:</span>
                <span className="text-[#00cfa8] font-semibold">{submittedReport?.status}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/buyer/reports"
                onClick={handleResetAndClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#00cfa8] hover:bg-[#00b594] text-[#070b14] font-semibold text-xs transition-colors text-center shadow-[0_0_15px_rgba(0,207,168,0.25)]"
              >
                Go to My Reports
              </Link>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
                {error.includes("already have an active report") && (
                  <div className="mt-2">
                    <Link
                      href="/buyer/reports"
                      onClick={handleResetAndClose}
                      className="text-xs font-semibold underline text-[#00cfa8] hover:text-[#00b594]"
                    >
                      View your active reports in My Reports →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#829ab1] uppercase tracking-wider mb-2">
                Reason Category
              </label>
              <div className="space-y-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      category === opt.value
                        ? "bg-[#16233b] border-[#00cfa8]/50 shadow-[0_0_12px_rgba(0,207,168,0.1)]"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportCategory"
                      value={opt.value}
                      checked={category === opt.value}
                      onChange={() => setCategory(opt.value)}
                      className="mt-0.5 accent-[#00cfa8]"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">{opt.label}</div>
                      <div className="text-[11px] text-[#627d98] mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#829ab1] uppercase tracking-wider">
                  Detailed Explanation
                </label>
                <span
                  className={`text-[10px] ${
                    description.trim().length < 10
                      ? "text-rose-400"
                      : description.trim().length > 2000
                      ? "text-rose-400"
                      : "text-[#627d98]"
                  }`}
                >
                  {description.trim().length} / 2000 chars (min 10)
                </span>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the specific facts, document discrepancies, or suspicious communications observed. Please be factual and concise..."
                className="w-full bg-[#080d16] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8] transition-colors resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
              <strong>Notice:</strong> Reports are sent confidentially to BizExchange compliance.
              The reported seller is not informed of your identity or given access to your report.
              Submitting a report initiates an administrative investigation; listings are not
              automatically removed without review.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={submitting}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || description.trim().length < 10 || description.trim().length > 2000}
                className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(225,29,72,0.3)]"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Submitting Report...
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
