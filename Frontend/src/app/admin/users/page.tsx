"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiRequest<{ data: User[] }>("/admin/users");
      setUsers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const suspendUser = async (userId: number) => {
    setActionLoading(userId);
    try {
      await apiRequest(`/admin/users/${userId}/suspend`, {
        method: "PUT"
      });
      await fetchUsers();
    } catch (err) {
      console.error("Failed to suspend user", err);
      alert("Failed to suspend user. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const unsuspendUser = async (userId: number) => {
    setActionLoading(userId);
    try {
      await apiRequest(`/admin/users/${userId}/unsuspend`, {
        method: "PUT"
      });
      await fetchUsers();
    } catch (err) {
      console.error("Failed to unsuspend user", err);
      alert("Failed to unsuspend user. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string, role: string) => {
    if (role === "ADMIN") {
      return <span className="text-[#8b5cf6]">● Admin</span>;
    }
    switch (status) {
      case "ACTIVE": return <span className="text-[#10b981]">● Active</span>;
      case "SUSPENDED": return <span className="text-red-400">● Suspended</span>;
      case "DELETED": return <span className="text-[#4f6380]">● Deleted</span>;
      default: return status;
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "BUYER": return <span className="bg-[#3b82f6]/20 text-[#3b82f6] px-2 py-1 rounded text-xs">Buyer</span>;
      case "SELLER": return <span className="bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-1 rounded text-xs">Seller</span>;
      case "ADMIN": return <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] px-2 py-1 rounded text-xs">Admin</span>;
      default: return role;
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-[#d8e4f0] mb-2">User Management</h1>
      <p className="text-[#4f6380] text-sm mb-8">View and manage all platform users</p>

      {loading && <p className="text-[#4f6380]">Loading users...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0d1220]">
              <tr>
                <th className="text-left text-[#8092ab] text-xs tracking-wider uppercase px-6 py-4">User</th>
                <th className="text-left text-[#8092ab] text-xs tracking-wider uppercase px-6 py-4">Role</th>
                <th className="text-left text-[#8092ab] text-xs tracking-wider uppercase px-6 py-4">Status</th>
                <th className="text-left text-[#8092ab] text-xs tracking-wider uppercase px-6 py-4">Email Verified</th>
                <th className="text-right text-[#8092ab] text-xs tracking-wider uppercase px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-[#d8e4f0] font-medium">{user.fullName}</div>
                      <div className="text-[#8092ab] text-sm">{user.email}</div>
                      {user.phone && <div className="text-[#4f6380] text-xs">{user.phone}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">{roleBadge(user.role)}</td>
                  <td className="px-6 py-4">{statusBadge(user.status, user.role)}</td>
                  <td className="px-6 py-4">
                    {user.emailVerified ? (
                      <span className="text-[#10b981] text-sm">✓ Verified</span>
                    ) : (
                      <span className="text-[#f59e0b] text-sm">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.role !== "ADMIN" && (
                      <div className="flex justify-end gap-2">
                        {user.status === "ACTIVE" ? (
                          <button
                            onClick={() => suspendUser(user.id)}
                            disabled={actionLoading === user.id}
                            className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.id ? "Suspending..." : "Suspend"}
                          </button>
                        ) : user.status === "SUSPENDED" ? (
                          <button
                            onClick={() => unsuspendUser(user.id)}
                            disabled={actionLoading === user.id}
                            className="bg-[#10b981]/20 text-[#10b981] px-3 py-1.5 rounded-lg text-sm hover:bg-[#10b981]/30 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.id ? "Unsuspending..." : "Unsuspend"}
                          </button>
                        ) : (
                          <span className="text-[#4f6380] text-sm">No actions</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="px-6 py-12 text-center text-[#4f6380]">
              No users found
            </div>
          )}
        </div>
      )}
    </main>
  );
}
