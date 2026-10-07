"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InquiriesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    if (role === "SELLER") {
      router.replace("/seller/inquiries");
    } else {
      router.replace("/businesses/my-inquiries");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#080c15] flex items-center justify-center text-[#8493a8]">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Redirecting to your inquiries...</p>
      </div>
    </div>
  );
}
