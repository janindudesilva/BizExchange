"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AdminTicketDetailRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  useEffect(() => {
    if (id) {
      router.replace(`/agent/tickets/${id}`);
    } else {
      router.replace("/admin/tickets");
    }
  }, [id, router]);

  return (
    <div className="min-h-screen bg-[#080c15] flex items-center justify-center text-[#8493a8]">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#00cfa8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading ticket workspace...</p>
      </div>
    </div>
  );
}
