"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

interface SellerProfile {
  verificationStatus: VerificationStatus;
}

export default function SellerDashboardPage() {
  const [verificationStatus, setVerificationStatus] =
      useState<VerificationStatus | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    apiRequest<SellerProfile>(`/seller/profile/${userId}`)
        .then((profile) => setVerificationStatus(profile.verificationStatus))
        .catch(() => setVerificationStatus(null));
  }, []);

  return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">Seller Dashboard</h1>

        {verificationStatus === "PENDING" && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-md mb-8">
              ⏳ Your account is unverified. An admin needs to approve your seller
              profile before you can create business listings.
            </div>
        )}

        {verificationStatus === "REJECTED" && (
            <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-md mb-8">
              ❌ Your seller verification was rejected. Please contact support for
              more details.
            </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Create Business</h2>
            <p className="text-slate-600 mb-5">
              Submit a new business listing for admin review.
            </p>
            <Link
                href="/seller/businesses/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Create Listing
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-3">My Listings</h2>
            <p className="text-slate-600 mb-5">
              View and manage your submitted businesses.
            </p>
            <Link
                href="/seller/businesses"
                className="bg-slate-900 text-white px-4 py-2 rounded-md inline-block"
            >
              View Listings
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Inquiries</h2>
            <p className="text-slate-600 mb-5">
              View buyer inquiries and messages.
            </p>
            <button className="bg-slate-900 text-white px-4 py-2 rounded-md">
              Coming Soon
            </button>
          </div>
        </div>
      </main>
  );
}