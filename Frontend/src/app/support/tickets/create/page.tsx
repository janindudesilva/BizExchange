"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function CreateTicketPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
  });
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/api/tickets", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setMessage("Ticket created successfully");
      setTimeout(() => router.push("/support/my-tickets"), 1000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create ticket");
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">CREATE SUPPORT TICKET</h1>
      <p className="text-[#4f6380] text-sm mb-8">Submit a new support request</p>

      {message && (
        <div className="mb-4 p-3 bg-[#0d1220] border border-white/10 rounded-lg text-[#8092ab] text-sm">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#121c32] border border-white/5 p-6 rounded-2xl space-y-6">
        <div>
          <label className="block text-[#4f6380] text-xs tracking-wider mb-2">SUBJECT</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Brief summary of your issue"
            className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50"
            required
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-[#4f6380] text-xs tracking-wider mb-2">DESCRIPTION</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your issue in detail..."
            className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 h-48 resize-none"
            required
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-[#00cfa8] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors"
          >
            Submit Ticket
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-[#4f6380] text-[#d8e4f0] p-3 rounded-lg font-semibold hover:bg-[#8092ab] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
