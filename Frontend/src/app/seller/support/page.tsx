"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import SellerSidebar from "@/components/SellerSidebar";

interface Ticket {
  id: number;
  ticketNumber: string;
  createdById: number;
  createdByName: string;
  createdByEmail: string;
  assignedToId: number | null;
  assignedToName: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export default function SellerSupportPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "MEDIUM",
  });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ data: Ticket[] }>("/tickets/my");
      setTickets(response.data || []);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadTickets() {
      try {
        const response = await apiRequest<{ data: Ticket[] }>("/tickets/my");
        if (!ignore) setTickets(response.data || []);
      } catch (err) {
        console.error("Failed to fetch tickets", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadTickets();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/tickets", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setSuccess("Support ticket created successfully!");
      setFormData({ subject: "", description: "", priority: "MEDIUM" });
      setTimeout(() => {
        setModalOpen(false);
        setSuccess("");
        fetchTickets();
      }, 1200);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to create ticket";
      setError(errMsg);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/30">Open</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f59e0b]/20 text-[#fbbf24] border border-[#f59e0b]/30">In Progress</span>;
      case "ESCALATED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ef4444]/20 text-[#f87171] border border-[#ef4444]/30">Escalated</span>;
      case "RESOLVED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30">Resolved</span>;
      case "CLOSED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#4f6380]/20 text-[#94a3b8] border border-white/10">Closed</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-[#c7d2e0] border border-white/10">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case "URGENT":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#ef4444]/25 text-[#f87171] border border-[#ef4444]/40">Urgent</span>;
      case "HIGH":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#f97316]/20 text-[#fb923c] border border-[#f97316]/30">High</span>;
      case "MEDIUM":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#eab308]/20 text-[#facc15] border border-[#eab308]/30">Medium</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30">Low</span>;
    }
  };

  const totalTickets = tickets.length;
  const openCount = tickets.filter(
    (t) => t.status?.toUpperCase() !== "RESOLVED" && t.status?.toUpperCase() !== "CLOSED"
  ).length;
  const resolvedCount = tickets.filter((t) => t.status?.toUpperCase() === "RESOLVED").length;

  return (
    <div className="min-h-screen bg-[#080c15] text-[#c7d2e0] flex relative overflow-x-hidden">
      <SellerSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main column */}
      <div className="flex-1 ml-0 lg:ml-[248px] flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-8 lg:px-10 py-4 sm:py-5 border-b border-white/5 bg-[#080c15]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-[#8092ab] hover:text-white hover:bg-white/5 touch-target"
              aria-label="Toggle Navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <div className="text-[10px] sm:text-[11px] tracking-[0.15em] text-[#4f6380]">
                HELP &amp; SUPPORT
              </div>
              <div className="text-xs sm:text-sm text-[#8092ab] mt-0.5">
                Manage your support tickets and requests
              </div>
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-[#00cfa8] hover:bg-[#00b894] text-[#080c15] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-[0_0_15px_rgba(0,207,168,0.2)]"
          >
            <span className="text-base leading-none">+</span>
            <span>Create New Ticket</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-wide text-white">
                SUPPORT TICKETS
              </h1>
              <p className="text-[#8092ab] text-xs sm:text-sm mt-1">
                Direct assistance from the BizExchange operations &amp; verification team
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0d1220] border border-white/5 rounded-2xl p-5">
              <div className="text-[11px] font-semibold text-[#8092ab] uppercase tracking-wider">
                Total Tickets
              </div>
              <div className="text-2xl font-bold text-white mt-2">{totalTickets}</div>
              <div className="text-xs text-[#4f6380] mt-1">All time inquiries submitted</div>
            </div>

            <div className="bg-[#0d1220] border border-white/5 rounded-2xl p-5">
              <div className="text-[11px] font-semibold text-[#3b82f6] uppercase tracking-wider">
                Active / In Progress
              </div>
              <div className="text-2xl font-bold text-[#60a5fa] mt-2">{openCount}</div>
              <div className="text-xs text-[#4f6380] mt-1">Pending agent response</div>
            </div>

            <div className="bg-[#0d1220] border border-white/5 rounded-2xl p-5">
              <div className="text-[11px] font-semibold text-[#10b981] uppercase tracking-wider">
                Resolved Tickets
              </div>
              <div className="text-2xl font-bold text-[#34d399] mt-2">{resolvedCount}</div>
              <div className="text-xs text-[#4f6380] mt-1">Successfully addressed</div>
            </div>
          </div>

          {/* Tickets List Container */}
          <div className="bg-[#0d1220] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                Your Support History
              </h2>
              <button
                onClick={fetchTickets}
                className="text-xs text-[#00cfa8] hover:underline"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-[#8092ab] text-sm">
                Loading support tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-12 h-12 rounded-full bg-[#121c32] flex items-center justify-center mx-auto mb-3 text-xl text-[#8092ab]">
                  💬
                </div>
                <div className="text-base font-semibold text-white">No Support Tickets Yet</div>
                <p className="text-xs text-[#4f6380] max-w-sm mx-auto mt-1.5 leading-relaxed">
                  Need help with verification, business listings, or deal negotiations? Create a ticket and our support team will respond promptly.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 bg-[#00cfa8] hover:bg-[#00b894] text-[#080c15] px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                >
                  Create Your First Ticket
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#090d16] text-[#4f6380] text-[11px] uppercase tracking-wider font-semibold border-b border-white/5">
                    <tr>
                      <th className="px-5 py-4">Ticket #</th>
                      <th className="px-5 py-4">Subject</th>
                      <th className="px-5 py-4">Priority</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Created Date</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 font-mono text-xs text-[#00cfa8]">
                          {ticket.ticketNumber}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-white max-w-md truncate">
                            {ticket.subject}
                          </div>
                          <div className="text-xs text-[#4f6380] truncate max-w-sm mt-0.5">
                            {ticket.description}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {getPriorityBadge(ticket.priority)}
                        </td>
                        <td className="px-5 py-4">
                          {getStatusBadge(ticket.status)}
                        </td>
                        <td className="px-5 py-4 text-xs text-[#8092ab]">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/support/my-tickets/${ticket.id}`}
                            className="inline-flex items-center gap-1.5 text-xs text-[#00cfa8] hover:text-[#00e6bc] font-medium bg-[#00cfa8]/10 hover:bg-[#00cfa8]/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <span>View Ticket</span>
                            <span>&rarr;</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Create Ticket Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          />
          <div className="relative w-full max-w-lg bg-[#0d1220] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  CREATE SUPPORT TICKET
                </h3>
                <p className="text-xs text-[#8092ab] mt-0.5">
                  Describe your issue and an agent will assist you
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-[#4f6380] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 bg-[#00cfa8]/10 border border-[#00cfa8]/30 rounded-xl text-[#00cfa8] text-xs">
                {success}
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="mt-5 space-y-4">
              <div>
                <label className="block text-[#4f6380] text-xs font-semibold uppercase tracking-wider mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Question regarding buyer inquiry or verification"
                  className="w-full bg-[#080c15] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8]"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-[#4f6380] text-xs font-semibold uppercase tracking-wider mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-[#080c15] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00cfa8]"
                >
                  <option value="LOW">Low - General inquiry</option>
                  <option value="MEDIUM">Medium - Standard issue</option>
                  <option value="HIGH">High - Urgent concern</option>
                  <option value="URGENT">Urgent - Transaction or security issue</option>
                </select>
              </div>

              <div>
                <label className="block text-[#4f6380] text-xs font-semibold uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide detailed information so our team can resolve your ticket quickly..."
                  className="w-full bg-[#080c15] border border-white/10 rounded-xl p-4 text-sm text-white placeholder-[#4f6380] focus:outline-none focus:border-[#00cfa8] h-36 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#8092ab] hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#00cfa8] hover:bg-[#00b894] disabled:opacity-50 text-[#080c15] text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,207,168,0.2)]"
                >
                  {creating ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
