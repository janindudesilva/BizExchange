"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface TicketMessage {
  id: number;
  ticketId: number;
  senderId: number;
  senderName: string;
  message: string;
  createdAt: string;
}

export default function AgentTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = Number(params.id);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchTicketDetails();
    fetchMessages();
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    try {
      const response = await apiRequest<{ data: Ticket }>(`/tickets/${ticketId}`);
      setTicket(response.data);
    } catch (err) {
      console.error("Failed to fetch ticket", err);
      setMessage("Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await apiRequest<{ data: TicketMessage[] }>(`/tickets/${ticketId}/messages`);
      setMessages(response.data || []);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await apiRequest(`/tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({ message: replyText }),
      });
      setReplyText("");
      fetchMessages();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to send reply");
    }
  };

  const handleEscalate = async () => {
    try {
      await apiRequest(`/agent/tickets/${ticketId}/escalate`, {
        method: "POST",
        body: JSON.stringify({ reason: escalateReason }),
      });
      setMessage("Ticket escalated to admin successfully");
      setShowEscalateModal(false);
      setEscalateReason("");
      fetchTicketDetails();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to escalate ticket");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiRequest(`/agent/tickets/${ticketId}/status?status=${newStatus}`, {
        method: "PUT",
      });
      fetchTicketDetails();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update status");
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

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-[#4f6380]">Loading ticket details...</div>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-[#4f6380]">Ticket not found</div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#d8e4f0] tracking-wide">TICKET #{ticket.id}</h1>
          <p className="text-[#4f6380] text-sm">{ticket.subject}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="bg-[#4f6380] text-[#d8e4f0] px-4 py-2 rounded-lg font-semibold hover:bg-[#8092ab] transition-colors"
        >
          Back
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-[#0d1220] border border-white/10 rounded-lg text-[#8092ab] text-sm">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold mb-4 text-[#d8e4f0]">Ticket Details</h2>
          <div className="space-y-3">
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">STATUS</div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                {ticket.status.replace("_", " ")}
              </span>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">CREATED BY</div>
              <div className="text-[#c7d2e0]">{ticket.createdByName}</div>
              <div className="text-[#4f6380] text-xs">{ticket.createdByEmail}</div>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">ASSIGNED TO</div>
              <div className="text-[#c7d2e0]">{ticket.assignedToName || "Unassigned"}</div>
            </div>
            <div>
              <div className="text-[#4f6380] text-xs tracking-wider mb-1">CREATED</div>
              <div className="text-[#8092ab] text-sm">{new Date(ticket.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold mb-4 text-[#d8e4f0]">Description</h2>
          <div className="text-[#c7d2e0] bg-[#0d1220] p-4 rounded-lg">
            {ticket.description}
          </div>
        </div>
      </div>

      <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl mb-8">
        <h2 className="text-lg font-semibold mb-4 text-[#d8e4f0]">Messages</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-[#4f6380]">No messages yet</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="bg-[#0d1220] p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-[#d8e4f0]">{msg.senderName}</div>
                  <div className="text-[#4f6380] text-xs">{new Date(msg.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-[#c7d2e0]">{msg.message}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl mb-8">
        <h2 className="text-lg font-semibold mb-4 text-[#d8e4f0]">Reply</h2>
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type your reply..."
          className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 h-32 resize-none mb-4"
        />
        <button
          onClick={handleReply}
          disabled={!replyText.trim()}
          className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send Reply
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={ticket.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="bg-[#121c32] border border-white/10 text-[#c7d2e0] px-4 py-2 rounded-lg focus:outline-none focus:border-[#00cfa8]/50"
        >
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <button
          onClick={() => setShowEscalateModal(true)}
          className="bg-[#ef4444] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#f87171] transition-colors"
        >
          Escalate to Admin
        </button>
      </div>

      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#121c32] border border-white/10 p-6 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-[#d8e4f0]">Escalate to Admin</h2>
            <textarea
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="Enter the reason for escalation..."
              className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 h-32 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleEscalate}
                className="flex-1 bg-[#ef4444] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#f87171] transition-colors"
              >
                Escalate
              </button>
              <button
                onClick={() => {
                  setShowEscalateModal(false);
                  setEscalateReason("");
                }}
                className="flex-1 bg-[#4f6380] text-[#d8e4f0] p-3 rounded-lg font-semibold hover:bg-[#8092ab] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
