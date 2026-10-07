"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const [isSeller] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("role") === "SELLER";
    }
    return false;
  });

  useEffect(() => {
    let ignore = false;
    async function fetchMyTickets() {
      try {
        const response = await apiRequest<{ data: Ticket[] }>("/tickets/my");
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

    fetchMyTickets();
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

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      {isSeller && (
        <div className="mb-6 bg-[#00cfa8]/10 border border-[#00cfa8]/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-[#c7d2e0]">
            Looking for the Seller Portal view? Manage tickets directly within the dedicated Seller Support section.
          </div>
          <Link
            href="/seller/support"
            className="text-xs text-[#00cfa8] font-bold hover:underline shrink-0"
          >
            Go to Seller Support &rarr;
          </Link>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#d8e4f0] tracking-wide">MY TICKETS</h1>
          <p className="text-[#4f6380] text-sm">View your support tickets</p>
        </div>
        <button
          onClick={() => router.push("/support/tickets/create")}
          className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors"
        >
          Create New Ticket
        </button>
      </div>

      {loading ? (
        <div className="text-[#4f6380]">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-[#4f6380]">No tickets found. Create your first support ticket.</div>
      ) : (
        <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0d1220]">
              <tr>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Ticket #</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Subject</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Priority</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Assigned To</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Status</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Created</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-white/5">
                  <td className="p-4 text-[#d8e4f0]">{ticket.ticketNumber}</td>
                  <td className="p-4 text-[#d8e4f0]">{ticket.subject}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
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
                      onClick={() => router.push(`/support/my-tickets/${ticket.id}`)}
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
