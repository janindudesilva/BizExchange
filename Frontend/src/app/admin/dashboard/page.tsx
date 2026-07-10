"use client";

import {useRouter} from "next/navigation";

export default function AdminDashboardPage() {
  const router = useRouter();
  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Business Approvals</h2>
          <p className="text-slate-600 mb-5">
            Approve or reject seller business listings.
          </p>
            <button
              onClick={() => {
                router.push("/admin/businesses/pending");
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
              View Pending
            </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Sellers</h2>
          <p className="text-slate-600 mb-5">
            View all sellers.
          </p>
          <button 
          onClick={() => router.push('/admin/sellers')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md">
            View Sellers
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Reports</h2>
          <p className="text-slate-600 mb-5">
            Review reported businesses and users.
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md">
            View Reports
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Seller Verification</h2>
          <p className="text-slate-600 mb-5">
            Review sellers.
          </p>
          <button
              onClick={() => router.push("/admin/sellers/pending")}
              className="bg-blue-600 text-white px-4 py-2 rounded-md">
            verify Sellers
          </button>
        </div>

      </div>
    </main>
  );
}
