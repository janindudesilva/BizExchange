"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

interface AnalyticsSummary {
    totalUsers: number;
    totalBuyers: number;
    totalSellers: number;
    totalAdmins: number;
    totalBusinesses: number;
    approvedBusinesses: number;
    pendingBusinesses: number;
    rejectedBusinesses: number;
    totalInquiries: number;
    activeInquiries: number;
    closedInquiries: number;
    totalMessages: number;
    totalReviews: number;
    averageRating: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await apiRequest<{ data: AnalyticsSummary }>("/admin/analytics/summary");
      setAnalytics(response.data);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, color }: { title: string; value: number; subtitle: string; color: string }) => (
    <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
      <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-2">{title}</div>
      <div className={`text-3xl font-bold mb-1 ${color}`}>{value.toLocaleString()}</div>
      <div className="text-sm text-[#8092ab]">{subtitle}</div>
    </div>
  );

  const PieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    
    const paths = data.map((item) => {
      const percentage = item.value / total;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      const x1 = 50 + 40 * Math.cos((Math.PI / 180) * startAngle);
      const y1 = 50 + 40 * Math.sin((Math.PI / 180) * startAngle);
      const x2 = 50 + 40 * Math.cos((Math.PI / 180) * endAngle);
      const y2 = 50 + 40 * Math.sin((Math.PI / 180) * endAngle);

      const largeArcFlag = angle > 180 ? 1 : 0;

      return (
        <path
          key={item.label}
          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
          fill={item.color}
          stroke="#121c32"
          strokeWidth="2"
        />
      );
    });

    return (
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        {paths}
      </svg>
    );
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">ADMIN DASHBOARD</h1>
      <p className="text-[#4f6380] text-sm mb-8">Manage the platform from here</p>

      {loading ? (
        <div className="text-[#4f6380]">Loading analytics...</div>
      ) : analytics ? (
        <>
          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <StatCard title="TOTAL USERS" value={analytics.totalUsers} subtitle="All registered users" color="text-[#00cfa8]" />
            <StatCard title="BUYERS" value={analytics.totalBuyers} subtitle="Active buyers" color="text-[#3b82f6]" />
            <StatCard title="SELLERS" value={analytics.totalSellers} subtitle="Active sellers" color="text-[#f59e0b]" />
            <StatCard title="BUSINESSES" value={analytics.totalBusinesses} subtitle="Total listings" color="text-[#8b5cf6]" />
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <StatCard title="APPROVED" value={analytics.approvedBusinesses} subtitle="Approved listings" color="text-[#10b981]" />
            <StatCard title="PENDING" value={analytics.pendingBusinesses} subtitle="Awaiting review" color="text-[#f59e0b]" />
            <StatCard title="INQUIRIES" value={analytics.totalInquiries} subtitle="Total inquiries" color="text-[#3b82f6]" />
            <StatCard title="REVIEWS" value={analytics.totalReviews} subtitle="Total reviews" color="text-[#ec4899]" />
          </div>

          {/* Charts Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-[#d8e4f0] mb-4">Business Status Distribution</h3>
              <div className="flex items-center gap-8">
                <PieChart 
                  data={[
                    { label: "Approved", value: analytics.approvedBusinesses, color: "#10b981" },
                    { label: "Pending", value: analytics.pendingBusinesses, color: "#f59e0b" },
                    { label: "Rejected", value: analytics.rejectedBusinesses, color: "#ef4444" }
                  ]}
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                    <span className="text-[#8092ab] text-sm">Approved: {analytics.approvedBusinesses}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                    <span className="text-[#8092ab] text-sm">Pending: {analytics.pendingBusinesses}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                    <span className="text-[#8092ab] text-sm">Rejected: {analytics.rejectedBusinesses}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-[#d8e4f0] mb-4">User Distribution</h3>
              <div className="flex items-center gap-8">
                <PieChart 
                  data={[
                    { label: "Buyers", value: analytics.totalBuyers, color: "#3b82f6" },
                    { label: "Sellers", value: analytics.totalSellers, color: "#f59e0b" },
                    { label: "Admins", value: analytics.totalAdmins, color: "#8b5cf6" }
                  ]}
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                    <span className="text-[#8092ab] text-sm">Buyers: {analytics.totalBuyers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                    <span className="text-[#8092ab] text-sm">Sellers: {analytics.totalSellers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
                    <span className="text-[#8092ab] text-sm">Admins: {analytics.totalAdmins}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <StatCard title="ACTIVE INQUIRIES" value={analytics.activeInquiries} subtitle="Ongoing conversations" color="text-[#10b981]" />
            <StatCard title="CLOSED INQUIRIES" value={analytics.closedInquiries} subtitle="Completed deals" color="text-[#4f6380]" />
            <StatCard title="TOTAL MESSAGES" value={analytics.totalMessages} subtitle="Messages sent" color="text-[#3b82f6]" />
          </div>

          {analytics.averageRating !== null && (
            <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl mb-8">
              <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-2">AVERAGE PLATFORM RATING</div>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-yellow-500">
                  {analytics.averageRating.toFixed(1)}
                </div>
                <div className="text-2xl text-yellow-500">★</div>
                <div className="text-[#8092ab] text-sm">
                  Based on {analytics.totalReviews} reviews across all sellers
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-[#4f6380]">Failed to load analytics data</div>
      )}

      {/* Action Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-3">BUSINESS APPROVALS</div>
          <h2 className="text-lg font-semibold mb-2 text-[#d8e4f0]">Business Approvals</h2>
          <p className="text-[#8092ab] text-sm mb-5">
            Approve or reject seller business listings.
          </p>
            <button
              onClick={() => {
                router.push("/admin/businesses/pending");
              }}
              className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm"
              >
              View Pending
            </button>
        </div>

        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-3">USERS</div>
          <h2 className="text-lg font-semibold mb-2 text-[#d8e4f0]">User Management</h2>
          <p className="text-[#8092ab] text-sm mb-5">
            View and manage all platform users.
          </p>
          <button
              onClick={() => router.push("/admin/users")}
              className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm">
            Manage Users
          </button>
        </div>

        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-3">SELLERS</div>
          <h2 className="text-lg font-semibold mb-2 text-[#d8e4f0]">Sellers</h2>
          <p className="text-[#8092ab] text-sm mb-5">
            View all sellers.
          </p>
          <button 
          onClick={() => router.push('/admin/sellers')}
          className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm">
            View Sellers
          </button>
        </div>

        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-3">VERIFICATION</div>
          <h2 className="text-lg font-semibold mb-2 text-[#d8e4f0]">Seller Verification</h2>
          <p className="text-[#8092ab] text-sm mb-5">
            Review sellers.
          </p>
          <button
              onClick={() => router.push("/admin/sellers/pending")}
              className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm">
            Verify Sellers
          </button>
        </div>

        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-3">CATEGORIES</div>
          <h2 className="text-lg font-semibold mb-2 text-[#d8e4f0]">Categories</h2>
          <p className="text-[#8092ab] text-sm mb-5">
            Manage business classifications.
          </p>
          <button
              onClick={() => router.push("/admin/categories")}
              className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm">
            Manage Categories
          </button>
        </div>

      </div>
    </main>
  );
}
