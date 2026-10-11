"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { ReportBuyer, ReportCategory, ReportStatus, ReportTargetType } from "@/types/report";

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  SCAM_OR_FRAUD: "Scam or Fraudulent Activity",
  MISLEADING_INFORMATION: "Misleading Information",
  SUSPICIOUS_DOCUMENTS: "Suspicious or Altered Documents",
  OTHER: "Other Policy Violation",
};

export default function BuyerReportsPage() {
  const [reports, setReports] = useState<ReportBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<"ALL" | ReportStatus>("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState<"ALL" | ReportTargetType>("ALL");
  const [selectedReport, setSelectedReport] = useState<ReportBuyer | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ data: ReportBuyer[] }>("/reports/my");
      setReports(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    apiRequest<{ data: ReportBuyer[] }>("/reports/my")
      .then((res) => {
        if (!ignore) {
          setReports(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load your reports");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchesTarget = targetTypeFilter === "ALL" || r.targetType === targetTypeFilter;
      return matchesStatus && matchesTarget;
    });
  }, [reports, statusFilter, targetTypeFilter]);

  const statusBadge = (status: ReportStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Open
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            Under Review
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#00cfa8]/10 text-[#00cfa8] border border-[#00cfa8]/20">
            Resolved
          </span>
        );
      case "DISMISSED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-[#829ab1] border border-white/10">
            Dismissed
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-[#d8e4f0] p-4 sm:p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs text-[#00cfa8]">
              <Link href="/buyer/dashboard" className="hover:underline">
                Buyer Dashboard
              </Link>
              <span>/</span>
              <span className="text-[#829ab1]">Compliance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              My Compliance Reports
            </h1>
            <p className="text-xs sm:text-sm text-[#829ab1] mt-1">
              Confidential reports submitted to BizExchange administration regarding suspicious
              listings or sellers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors flex items-center gap-2"
            >
              🔄 Refresh
            </button>
            <Link
              href="/businesses"
              className="px-4 py-2 rounded-xl bg-[#00cfa8] hover:bg-[#00b594] text-[#070b14] text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,207,168,0.2)]"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>

        {/* Confidentiality Notice Banner */}
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-3">
          <span className="text-lg">🛡️</span>
          <div className="space-y-1">
            <div className="font-bold text-white text-xs">Buyer Confidentiality Guarantee</div>
            <p className="text-[11px] text-indigo-200/80 leading-relaxed">
              Your identity and report description are protected and never disclosed to reported sellers.
              Reports are processed directly by BizExchange compliance officers. You will receive
              an in-platform notification when an administrator resolves your report.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1527] p-3 rounded-2xl border border-white/5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(["ALL", "OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const).map((tab) => {
              const active = statusFilter === tab;
              const count =
                tab === "ALL" ? reports.length : reports.filter((r) => r.status === tab).length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? "bg-[#00cfa8] text-[#070b14] shadow-[0_0_12px_rgba(0,207,168,0.25)]"
                      : "text-[#829ab1] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>
                    {tab === "ALL"
                      ? "All Reports"
                      : tab === "UNDER_REVIEW"
                      ? "Under Review"
                      : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      active ? "bg-[#070b14]/20 text-[#070b14]" : "bg-white/5 text-[#829ab1]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Target Type Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#627d98] font-medium">Target:</span>
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value as "ALL" | ReportTargetType)}
              className="bg-[#080d16] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00cfa8]"
            >
              <option value="ALL">All Targets</option>
              <option value="BUSINESS">Businesses</option>
              <option value="SELLER">Sellers</option>
            </select>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#00cfa8]/20 border-t-[#00cfa8] rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#829ab1]">Loading your reports...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-400">{error}</p>
            <button
              onClick={fetchReports}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white font-semibold"
            >
              Try Again
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-[#0d1527] rounded-3xl border border-white/5 p-8">
            <div className="w-14 h-14 rounded-2xl bg-white/5 text-[#829ab1] flex items-center justify-center mx-auto text-2xl">
              📋
            </div>
            <h3 className="text-base font-bold text-white">No Reports Found</h3>
            <p className="text-xs text-[#829ab1] max-w-md mx-auto">
              {statusFilter === "ALL" && targetTypeFilter === "ALL"
                ? "You have not submitted any compliance reports. If you encounter suspicious businesses or sellers, use the Report button on listing pages."
                : "No reports match the selected filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-5 rounded-2xl bg-[#0d1527] border border-white/5 hover:border-white/15 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            report.targetType === "BUSINESS"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          }`}
                        >
                          {report.targetType === "BUSINESS" ? "Business Listing" : "Seller Profile"}
                        </span>
                        <span className="text-[11px] text-[#627d98]">#{report.id}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white truncate max-w-sm">
                        {report.targetTitle}
                      </h3>
                    </div>
                    <div>{statusBadge(report.status)}</div>
                  </div>

                  {/* Category */}
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                    <span className="text-[#627d98] block text-[10px] uppercase font-semibold">
                      Reason Category
                    </span>
                    <span className="text-white font-medium">
                      {CATEGORY_LABELS[report.category] ?? report.category}
                    </span>
                  </div>

                  {/* Description preview */}
                  <p className="text-xs text-[#829ab1] line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>

                  {/* Resolution Notes highlight if available */}
                  {report.resolutionNotes && (
                    <div className="p-3 rounded-xl bg-[#00cfa8]/10 border border-[#00cfa8]/20 text-xs">
                      <span className="text-[#00cfa8] font-bold block text-[10px] uppercase tracking-wider mb-1">
                        Admin Resolution Explanation
                      </span>
                      <p className="text-white text-xs leading-relaxed italic">
                        &ldquo;{report.resolutionNotes}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#627d98]">
                  <span>Submitted {new Date(report.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="text-xs font-semibold text-[#00cfa8] hover:underline"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-lg bg-[#0e1626] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-7 relative text-[#d8e4f0] space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 text-[#829ab1]">
                      Report #{selectedReport.id}
                    </span>
                    {statusBadge(selectedReport.status)}
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-wide">
                    {selectedReport.targetTitle}
                  </h2>
                  <p className="text-xs text-[#829ab1]">
                    Target Type: {selectedReport.targetType} (ID #{selectedReport.targetId})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="text-[#627d98] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[#627d98] uppercase text-[10px] font-bold block mb-1">
                    Category
                  </span>
                  <span className="text-white font-semibold">
                    {CATEGORY_LABELS[selectedReport.category] ?? selectedReport.category}
                  </span>
                </div>

                <div>
                  <span className="text-[#627d98] uppercase text-[10px] font-bold block mb-1">
                    Your Submitted Description
                  </span>
                  <div className="p-3 rounded-xl bg-[#080d16] border border-white/10 text-white leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedReport.description}
                  </div>
                </div>

                {selectedReport.resolutionNotes ? (
                  <div className="p-4 rounded-xl bg-[#00cfa8]/10 border border-[#00cfa8]/30 space-y-1">
                    <span className="text-[#00cfa8] uppercase text-[10px] font-bold block tracking-wider">
                      Administrator Resolution Explanation
                    </span>
                    <p className="text-white leading-relaxed">
                      {selectedReport.resolutionNotes}
                    </p>
                    {selectedReport.resolvedAt && (
                      <span className="text-[10px] text-[#00cfa8]/70 block pt-1">
                        Resolved on {new Date(selectedReport.resolvedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[#829ab1]">
                    This report is currently under review by our compliance team. An administrator
                    resolution explanation will appear here once finalized.
                  </div>
                )}

                <div className="text-[11px] text-[#627d98] pt-2 flex justify-between">
                  <span>Submitted: {new Date(selectedReport.createdAt).toLocaleString()}</span>
                  {selectedReport.updatedAt && (
                    <span>Last updated: {new Date(selectedReport.updatedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
