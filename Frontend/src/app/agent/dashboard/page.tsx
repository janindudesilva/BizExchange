"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function AgentDashboardPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadTickets() {
      try {
        const response = await apiRequest<{ data: Ticket[] }>("/agent/tickets/assigned");
        if (!ignore) {
          setTickets(response.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch tickets", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTickets();
    return () => {
      ignore = true;
    };
  }, []);

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
      <h1 className="text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">SUPPORT AGENT DASHBOARD</h1>
      <p className="text-[#4f6380] text-sm mb-8">Manage assigned support tickets</p>

      {loading ? (
        <div className="text-[#4f6380]">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-[#4f6380]">No tickets assigned to you</div>
      ) : (
        <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0d1220]">
              <tr>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">ID</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Subject</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Created By</th>
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
                      className="bg-[#00cfa8] text-[#080c15] px-3 py-1 rounded text-sm font-semibold hover:bg-[#00e6bc] transition-colors"
                    >
                      View Ticket
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
