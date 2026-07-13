"use client";

import {useRouter} from "next/navigation";

export default function AdminDashboardPage() {
  const router = useRouter();
  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-2 text-[#d8e4f0] tracking-wide">ADMIN DASHBOARD</h1>
      <p className="text-[#4f6380] text-sm mb-8">Manage the platform from here</p>

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
          <div className="text-[11px] tracking-[0.1em] text-[#4f6380] mb-3">REPORTS</div>
          <h2 className="text-lg font-semibold mb-2 text-[#d8e4f0]">Reports</h2>
          <p className="text-[#8092ab] text-sm mb-5">
            Review reported businesses and users.
          </p>
          <button className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm">
            View Reports
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

      </div>
    </main>
  );
}
