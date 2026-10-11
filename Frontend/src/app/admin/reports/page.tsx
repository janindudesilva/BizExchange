"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { ReportAdmin, ReportCategory, ReportStatus, ReportTargetType } from "@/types/report";

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  SCAM_OR_FRAUD: "Scam or Fraud",
  MISLEADING_INFORMATION: "Misleading Info",
  SUSPICIOUS_DOCUMENTS: "Suspicious Docs",
  OTHER: "Other Violation",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReportStatus>("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState<"ALL" | ReportTargetType>("ALL");
  const [search, setSearch] = useState("");

  // Modal inspection & Action state
  const [selectedReport, setSelectedReport] = useState<ReportAdmin | null>(null);
  const [actionStatus, setActionStatus] = useState<ReportStatus | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [adminInternalNotes, setAdminInternalNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ data: ReportAdmin[] }>("/reports/admin/all");
      setReports(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    apiRequest<{ data: ReportAdmin[] }>("/reports/admin/all")
      .then((res) => {
        if (!ignore) {
          setReports(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load reports queue");
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
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.targetTitle.toLowerCase().includes(q) ||
        r.reporterName.toLowerCase().includes(q) ||
        r.reporterEmail.toLowerCase().includes(q) ||
        r.id.toString() === q;

      return matchesStatus && matchesTarget && matchesSearch;
    });
  }, [reports, statusFilter, targetTypeFilter, search]);

  const openActionModal = (report: ReportAdmin, nextStatus: ReportStatus) => {
    setSelectedReport(report);
    setActionStatus(nextStatus);
    setResolutionNotes(report.resolutionNotes || "");
    setAdminInternalNotes(report.adminInternalNotes || "");
    setActionError("");
    setSuccessMsg("");
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport || !actionStatus) return;

    if (actionStatus === "RESOLVED" || actionStatus === "DISMISSED") {
      if (!resolutionNotes.trim()) {
        setActionError("A resolution explanation visible to the buyer is required.");
        return;
      }
    }

    setSubmittingAction(true);
    setActionError("");
    try {
      const res = await apiRequest<{ data: ReportAdmin }>(
        `/reports/admin/${selectedReport.id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: actionStatus,
            resolutionNotes: resolutionNotes.trim() || undefined,
            adminInternalNotes: adminInternalNotes.trim() || undefined,
          }),
        }
      );

      // Update local state
      setReports((prev) => prev.map((r) => (r.id === res.data.id ? res.data : r)));
      setSelectedReport(res.data);
      setSuccessMsg(`Report #${res.data.id} status successfully updated to ${res.data.status}`);
      setActionStatus(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update report status");
    } finally {
      setSubmittingAction(false);
    }
  };

  const statusBadge = (status: ReportStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Open
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            Under Review
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#00cfa8]/10 text-[#00cfa8] border border-[#00cfa8]/20">
            Resolved
          </span>
        );
      case "DISMISSED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 text-[#829ab1] border border-white/10">
            Dismissed
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-[#d8e4f0] p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs text-[#00cfa8]">
              <Link href="/admin/dashboard" className="hover:underline">
                Admin Console
              </Link>
              <span>/</span>
              <span className="text-[#829ab1]">Compliance Audit</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              Buyer Reports Queue
            </h1>
            <p className="text-xs sm:text-sm text-[#829ab1] mt-1">
              Investigate buyer-reported fraud, fraudulent financials, and policy violations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors flex items-center gap-2"
            >
              🔄 Refresh Queue
            </button>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#0d1527] p-4 rounded-2xl border border-white/5">
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

          <div className="flex items-center gap-3">
            {/* Target Type Filter */}
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value as "ALL" | ReportTargetType)}
              className="bg-[#080d16] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00cfa8]"
            >
              <option value="ALL">All Target Types</option>
              <option value="BUSINESS">Businesses Only</option>
              <option value="SELLER">Sellers Only</option>
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search target, reporter, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 bg-[#080d16] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8]"
            />
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-[#0d1527] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#00cfa8]/20 border-t-[#00cfa8] rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#829ab1]">Loading reports queue...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-sm font-semibold text-rose-400">{error}</p>
              <button
                onClick={fetchReports}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white font-semibold"
              >
                Retry
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-20 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 text-[#829ab1] flex items-center justify-center mx-auto text-xl">
                🛡️
              </div>
              <h3 className="text-sm font-bold text-white">No Reports Matching Filter</h3>
              <p className="text-xs text-[#829ab1] max-w-sm mx-auto">
                No buyer compliance reports matched the active criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090e1a] text-[#627d98] uppercase text-[10px] font-bold tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3.5 px-4">ID</th>
                    <th className="py-3.5 px-4">Target</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Reporter</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4 font-mono text-[#829ab1]">#{report.id}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              report.targetType === "BUSINESS"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            }`}
                          >
                            {report.targetType}
                          </span>
                          <span className="font-bold text-white truncate max-w-[200px] block">
                            {report.targetTitle}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#627d98] mt-0.5">
                          Owner: {report.targetOwnerOrSellerEmail}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-white font-medium">
                          {CATEGORY_LABELS[report.category] ?? report.category}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">{report.reporterName}</div>
                        <div className="text-[10px] text-[#627d98]">{report.reporterEmail}</div>
                      </td>
                      <td className="py-4 px-4">{statusBadge(report.status)}</td>
                      <td className="py-4 px-4 text-[#829ab1] whitespace-nowrap">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(report);
                            setActionStatus(null);
                            setActionError("");
                            setSuccessMsg("");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#00cfa8] hover:text-[#070b14] text-white font-semibold text-xs transition-colors"
                        >
                          Inspect & Action
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Inspection & Action Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-2xl bg-[#0e1626] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-7 relative text-[#d8e4f0] space-y-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 text-[#829ab1]">
                      Report #{selectedReport.id}
                    </span>
                    {statusBadge(selectedReport.status)}
                    <span className="text-[11px] text-[#627d98]">
                      Submitted {new Date(selectedReport.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-wide">
                    {selectedReport.targetTitle}
                  </h2>
                  <p className="text-xs text-[#829ab1]">
                    Target: {selectedReport.targetType} #{selectedReport.targetId} (Owner:{" "}
                    {selectedReport.targetOwnerOrSellerEmail})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(null);
                    setActionStatus(null);
                  }}
                  className="text-[#627d98] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  ✕
                </button>
              </div>

              {successMsg && (
                <div className="p-3 rounded-xl bg-[#00cfa8]/10 border border-[#00cfa8]/20 text-[#00cfa8] text-xs">
                  ✓ {successMsg}
                </div>
              )}

              {/* Report Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#627d98] block">
                    Reporter (Buyer)
                  </span>
                  <div className="font-semibold text-white">{selectedReport.reporterName}</div>
                  <div className="text-[11px] text-[#829ab1]">{selectedReport.reporterEmail}</div>
                  <div className="text-[10px] text-[#627d98]">Buyer ID #{selectedReport.reporterId}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#627d98] block">
                    Reason Category
                  </span>
                  <div className="font-semibold text-white">
                    {CATEGORY_LABELS[selectedReport.category] ?? selectedReport.category}
                  </div>
                  <div className="text-[11px] text-[#829ab1]">
                    Target Status: {selectedReport.targetType === "BUSINESS" ? "Business Listing" : "Seller"}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#627d98] block">
                  Buyer Submitted Description
                </span>
                <div className="p-4 rounded-xl bg-[#080d16] border border-white/10 text-white leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedReport.description}
                </div>
              </div>

              {/* Previous Resolution / Internal Notes */}
              {(selectedReport.resolutionNotes || selectedReport.adminInternalNotes) && (
                <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
                  {selectedReport.resolutionNotes && (
                    <div className="p-3.5 rounded-xl bg-[#00cfa8]/10 border border-[#00cfa8]/20 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#00cfa8] block">
                        Buyer-Visible Resolution Explanation
                      </span>
                      <p className="text-white text-xs leading-relaxed italic">
                        &ldquo;{selectedReport.resolutionNotes}&rdquo;
                      </p>
                      {selectedReport.resolvedByAdminName && (
                        <div className="text-[10px] text-[#00cfa8]/70 pt-1">
                          Resolved by {selectedReport.resolvedByAdminName} on{" "}
                          {new Date(selectedReport.resolvedAt || "").toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedReport.adminInternalNotes && (
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-purple-400 block">
                        Internal Admin Audit Notes (Confidential)
                      </span>
                      <p className="text-white text-xs leading-relaxed">
                        {selectedReport.adminInternalNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Form or Action Buttons */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <span className="text-[10px] uppercase font-bold text-[#627d98] block">
                  Compliance Status Action
                </span>

                {actionStatus ? (
                  <div className="p-4 rounded-xl bg-[#080d16] border border-[#00cfa8]/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Updating Status to:</span>
                        {statusBadge(actionStatus)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActionStatus(null)}
                        className="text-xs text-[#829ab1] hover:text-white"
                      >
                        Cancel Action
                      </button>
                    </div>

                    {actionError && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                        {actionError}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-white mb-1">
                        Resolution Explanation (Visible to Buyer)
                        {(actionStatus === "RESOLVED" || actionStatus === "DISMISSED") && (
                          <span className="text-rose-400 ml-1">*Required</span>
                        )}
                      </label>
                      <textarea
                        rows={3}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Explain the resolution or reason for dismissal that the buyer will see in their notification and dashboard..."
                        className="w-full bg-[#0d1527] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8] resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-white mb-1">
                        Internal Admin Notes (Confidential — Admin Only)
                      </label>
                      <textarea
                        rows={2}
                        value={adminInternalNotes}
                        onChange={(e) => setAdminInternalNotes(e.target.value)}
                        placeholder="Internal investigator notes, fraud case ID, cross-checks..."
                        className="w-full bg-[#0d1527] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8] resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActionStatus(null)}
                        disabled={submittingAction}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdateStatus}
                        disabled={submittingAction}
                        className="px-4 py-2 rounded-xl bg-[#00cfa8] hover:bg-[#00b594] text-[#070b14] text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,207,168,0.25)] flex items-center gap-2"
                      >
                        {submittingAction ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-[#070b14]/20 border-t-[#070b14] rounded-full animate-spin" />
                            Updating...
                          </>
                        ) : (
                          `Confirm ${actionStatus}`
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    {selectedReport.status === "OPEN" && (
                      <button
                        type="button"
                        onClick={() => openActionModal(selectedReport, "UNDER_REVIEW")}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                      >
                        🔍 Mark Under Review
                      </button>
                    )}

                    {selectedReport.status !== "RESOLVED" && (
                      <button
                        type="button"
                        onClick={() => openActionModal(selectedReport, "RESOLVED")}
                        className="px-4 py-2 rounded-xl bg-[#00cfa8] hover:bg-[#00b594] text-[#070b14] font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,207,168,0.2)] flex items-center gap-1.5"
                      >
                        ✓ Resolve Report
                      </button>
                    )}

                    {selectedReport.status !== "DISMISSED" && (
                      <button
                        type="button"
                        onClick={() => openActionModal(selectedReport, "DISMISSED")}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-[#829ab1] font-semibold text-xs border border-white/10 transition-colors flex items-center gap-1.5"
                      >
                        ✕ Dismiss Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
