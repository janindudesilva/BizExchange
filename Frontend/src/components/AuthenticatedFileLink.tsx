"use client";

import { useState } from "react";
import { openAuthenticatedFile } from "@/lib/api";

interface AuthenticatedFileLinkProps {
  url: string;
  originalName: string;
  className?: string;
}

export default function AuthenticatedFileLink({
  url,
  originalName,
  className,
}: AuthenticatedFileLinkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await openAuthenticatedFile(url);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Access to this document requires an authorized account (Owner, Officer, or Admin).";
      setError(msg);
      alert(
        `Unable to access document: ${msg}\n\nConfidential documents are restricted to authorized parties.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ||
        "flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#00cfa8]/30 transition-all group w-full text-left"
      }
      title={error || "View document"}
    >
      <span className="text-xs text-[#8493a8] group-hover:text-white truncate max-w-[200px]">
        {originalName}
      </span>
      {loading ? (
        <span className="text-[10px] text-[#00cfa8] animate-pulse">Opening...</span>
      ) : (
        <svg
          className="w-3.5 h-3.5 text-[#52637a] group-hover:text-[#00cfa8] flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </button>
  );
}
