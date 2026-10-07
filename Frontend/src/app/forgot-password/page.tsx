"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ForgotPasswordRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams ? searchParams.toString() : "";
    router.replace(`/change-password${query ? `?${query}` : ""}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#080c15] flex items-center justify-center text-[#8493a8]">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading password recovery...</p>
      </div>
    </div>
  );
}

export default function ForgotPasswordRedirect() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordRedirectContent />
    </Suspense>
  );
}
