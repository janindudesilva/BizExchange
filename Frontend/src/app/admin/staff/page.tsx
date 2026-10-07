"use client";

import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";

interface StaffMember {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "VERIFICATION_OFFICER",
  });
  const [message, setMessage] = useState("");

  const fetchStaff = useCallback(async () => {
    try {
      const response = await apiRequest<{ data: StaffMember[] }>("/admin/staff");
      setStaff(response.data || []);
    } catch (err) {
      console.error("Failed to fetch staff", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const response = await apiRequest<{ data: StaffMember[] }>("/admin/staff");
        if (!ignore) {
          setStaff(response.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch staff", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/admin/staff", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setMessage("Staff account created successfully");
      setShowCreateModal(false);
      setFormData({ fullName: "", email: "", password: "", role: "VERIFICATION_OFFICER" });
      fetchStaff();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create staff");
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#d8e4f0] tracking-wide">MANAGE STAFF</h1>
          <p className="text-[#4f6380] text-sm">Create and manage staff accounts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors"
        >
          Create Staff Account
        </button>
      </div>

      {loading ? (
        <div className="text-[#4f6380]">Loading staff...</div>
      ) : staff.length === 0 ? (
        <div className="text-[#4f6380]">No staff accounts found</div>
      ) : (
        <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0d1220]">
              <tr>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Name</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Email</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Role</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Status</th>
                <th className="text-left p-4 text-[#8092ab] text-sm font-medium">Verified</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-t border-white/5">
                  <td className="p-4 text-[#d8e4f0]">{member.fullName}</td>
                  <td className="p-4 text-[#c7d2e0]">{member.email}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-[#8b5cf6]/20 text-[#8b5cf6]">
                      {member.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      member.status === "ACTIVE" 
                        ? "bg-[#10b981]/20 text-[#10b981]" 
                        : "bg-[#ef4444]/20 text-[#ef4444]"
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {member.emailVerified ? (
                      <span className="text-[#10b981]">✓</span>
                    ) : (
                      <span className="text-[#ef4444]">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#121c32] border border-white/10 p-6 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-[#d8e4f0]">Create Staff Account</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50"
                required
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-[#0d1220] border border-white/10 text-[#c7d2e0] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50"
              >
                <option value="VERIFICATION_OFFICER">Verification Officer</option>
                <option value="SUPPORT_AGENT">Support Agent</option>
              </select>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-[#00cfa8] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-[#4f6380] text-[#d8e4f0] p-3 rounded-lg font-semibold hover:bg-[#8092ab] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
            {message && <p className="mt-4 text-sm text-[#8092ab]">{message}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
