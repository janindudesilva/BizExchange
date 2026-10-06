"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

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

export default function SupportAgentDashboardPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check role
    const role = localStorage.getItem("role");
    if (role !== "SUPPORT_AGENT" && role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchAssignedTickets();
  }, []);

  const fetchAssignedTickets = async () => {
    try {
      const response = await apiRequest<{ data: Ticket[] }>("/agent/tickets/assigned");
      setTickets(response.data || []);
    } catch (err) {
      console.error("Failed to fetch assigned tickets", err);
    } finally {
      setLoading(false);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-[#10b981]/20 text-[#10b981]";
      case "MEDIUM":
        return "bg-[#f59e0b]/20 text-[#f59e0b]";
      case "HIGH":
        return "bg-[#ef4444]/20 text-[#ef4444]";
      case "URGENT":
        return "bg-[#ef4444]/40 text-[#ef4444]";
      default:
        return "bg-[#8092ab]/20 text-[#8092ab]";
    }
  };

  const openCount = tickets.filter(t => t.status === "OPEN").length;
  const inProgressCount = tickets.filter(t => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter(t => t.status === "RESOLVED").length;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-xl sm:text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">SUPPORT AGENT DASHBOARD</h1>
      <p className="text-[#4f6380] text-sm mb-8">Manage assigned support tickets</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        <div className="bg-[#121c32] border border-white/5 p-5 sm:p-6 rounded-2xl">
          <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-2">OPEN</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#3b82f6]">{openCount}</div>
        </div>
        <div className="bg-[#121c32] border border-white/5 p-5 sm:p-6 rounded-2xl">
          <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-2">IN PROGRESS</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#f59e0b]">{inProgressCount}</div>
        </div>
        <div className="bg-[#121c32] border border-white/5 p-5 sm:p-6 rounded-2xl">
          <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-2">RESOLVED</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#10b981]">{resolvedCount}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-[#4f6380]">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-[#4f6380]">No assigned tickets</div>
      ) : (
        <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="bg-[#0d1220]">
                <tr>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Ticket #</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Subject</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">From</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Priority</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Status</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Created</th>
                  <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-white/5">
                    <td className="p-4 text-[#d8e4f0] font-mono text-xs">{ticket.ticketNumber}</td>
                    <td className="p-4 text-[#d8e4f0] max-w-[200px] truncate">{ticket.subject}</td>
                    <td className="p-4 text-[#c7d2e0]">{ticket.createdByName}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
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
                        onClick={() => router.push(`/agent/tickets/${ticket.id}`)}
                        className="bg-[#00cfa8] text-[#080c15] px-3.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#00e6bc] transition-colors min-h-[36px]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
