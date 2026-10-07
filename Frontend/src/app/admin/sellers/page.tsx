"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

interface Seller {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  nicOrPassport: string;
  address: string;
  businessOwnerType: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const res = await apiRequest<Seller[] | { data?: Seller[] }>("/admin/sellers");
        const list: Seller[] = Array.isArray(res) ? res : (res?.data || []);
        setSellers(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load sellers");
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, []);

  const filtered = sellers.filter(
    (s) =>
      s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#00cfa8] mb-1 block">
            Admin Console
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Registered Sellers
          </h1>
          <p className="text-xs text-[#8493a8] mt-1">
            Directory of all business sellers registered on the platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/sellers/pending"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#00cfa8] text-[#070b14] hover:bg-[#00e6bc] transition-all shadow-[0_0_12px_rgba(0,207,168,0.2)]"
          >
            <span>Review Pending Queue</span>
            <span className="w-2 h-2 rounded-full bg-[#070b14] animate-ping" />
          </Link>
        </div>
      </div>

      {/* Search and stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search seller name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-premium pl-8 text-xs"
          />
          <svg className="w-3.5 h-3.5 text-[#627288] absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="text-xs text-[#8493a8]">
          Total Sellers: <strong className="text-white">{sellers.length}</strong>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 mb-6">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-panel rounded-2xl border border-white/5 p-8 text-center text-xs text-[#8493a8]">
          <div className="w-8 h-8 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading sellers registry...
        </div>
      ) : (
        <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="p-4 font-bold uppercase tracking-wider text-[#627288]">Seller Profile</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[#627288]">Contact Email</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[#627288]">Phone</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[#627288]">Owner Type</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[#627288]">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#627288]">
                      No sellers found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{s.fullName}</div>
                        <div className="text-[11px] text-[#52637a] font-mono mt-0.5">ID: #{s.id}</div>
                      </td>
                      <td className="p-4 text-[#8493a8]">{s.email}</td>
                      <td className="p-4 text-[#8493a8] font-mono">{s.phone}</td>
                      <td className="p-4 text-[#8493a8]">{s.businessOwnerType || "Individual"}</td>
                      <td className="p-4">
                        {s.verificationStatus === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 badge-emerald text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            <span>✓</span> Verified
                          </span>
                        )}
                        {s.verificationStatus === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 badge-rose text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            <span>✕</span> Rejected
                          </span>
                        )}
                        {s.verificationStatus === "PENDING" && (
                          <span className="inline-flex items-center gap-1 badge-amber text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            <span>⏳</span> In Review
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}