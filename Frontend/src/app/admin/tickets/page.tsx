"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

interface Ticket {
  id: number;
  createdById: number;
  createdByName: string;
  createdByEmail: string;
  assignedToId: number | null;
  assignedToName: string | null;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [agents, setAgents] = useState<{ id: number; fullName: string; role: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchTickets();
    fetchAgents();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await apiRequest<{ data: Ticket[] }>("/admin/tickets");
      setTickets(response.data || []);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await apiRequest<{ data: { id: number; fullName: string; role: string }[] }>("/admin/staff");
      setAgents(response.data?.filter((s) => s.role === "SUPPORT_AGENT") || []);
    } catch (err) {
      console.error("Failed to fetch agents", err);
    }
  };

  const handleAssign = async () => {
    if (!selectedTicketId || !selectedAgentId) return;
    try {
      await apiRequest(`/admin/tickets/${selectedTicketId}/assign/${selectedAgentId}`, {
        method: "PUT",
      });
      setMessage("Ticket assigned successfully");
      setShowAssignModal(false);
      setSelectedTicketId(null);
      setSelectedAgentId(null);
      fetchTickets();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to assign ticket");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-[#3b82f6]/20 text-[#3b82f6]";
      case "IN_PROGRESS":
        return "bg-[#f59e0b]/20 text-[#f59e0b]";
      case "ESCALATED":
        return "bg-[#ef4444]/20 text-[#ef4444]";
      case "RESOLVED":
        return "bg-[#10b981]/20 text-[#10b981]";
      case "CLOSED":
        return "bg-[#4f6380]/20 text-[#4f6380]";
      default:
        return "bg-[#8092ab]/20 text-[#8092ab]";
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">SUPPORT TICKETS</h1>
      <p className="text-[#4f6380] text-sm mb-8">View and manage all support tickets</p>

      {loading ? (
        <div className="text-[#4f6380]">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-[#4f6380]">No tickets found</div>
      ) : (
        <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0d1220]">
              <tr>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">ID</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Subject</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Created By</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Assigned To</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Status</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Created</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-white/5">
                  <td className="p-4 text-[#d8e4f0]">#{ticket.id}</td>
                  <td className="p-4 text-[#d8e4f0]">{ticket.subject}</td>
                  <td className="p-4 text-[#c7d2e0]">{ticket.createdByName}</td>
                  <td className="p-4 text-[#c7d2e0]">{ticket.assignedToName || "Unassigned"}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4 text-[#8092ab] text-sm">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                        setShowAssignModal(true);
                      }}
                      className="bg-[#00cfa8] text-[#080c15] px-3 py-1 rounded text-sm font-semibold hover:bg-[#00e6bc] transition-colors"
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#121c32] border border-white/10 p-6 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-[#d8e4f0]">Assign Ticket</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8092ab] mb-2">Select Agent</label>
                <select
                  value={selectedAgentId || ""}
                  onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                  className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50"
                >
                  <option value="">Choose an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAssign}
                  disabled={!selectedAgentId}
                  className="flex-1 bg-[#00cfa8] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign
                </button>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedTicketId(null);
                    setSelectedAgentId(null);
                  }}
                  className="flex-1 bg-[#4f6380] text-[#d8e4f0] p-3 rounded-lg font-semibold hover:bg-[#8092ab] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            {message && <p className="mt-4 text-sm text-[#8092ab]">{message}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
