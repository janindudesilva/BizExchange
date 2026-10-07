"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyBusinessesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/seller/businesses");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#080c15] flex items-center justify-center text-[#8493a8]">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Redirecting to listings...</p>
      </div>
    </div>
  );
}
