"use client";

import { useState } from "react";
import ReportModal from "./ReportModal";
import { ReportTargetType } from "@/types/report";

interface ReportBusinessActionsProps {
  businessId: number;
  businessTitle: string;
  sellerId?: number;
  sellerName?: string;
}

export default function ReportBusinessActions({
  businessId,
  businessTitle,
  sellerId,
  sellerName = "Seller",
}: ReportBusinessActionsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<ReportTargetType>("BUSINESS");
  const [targetId, setTargetId] = useState<number>(businessId);
  const [targetTitle, setTargetTitle] = useState<string>(businessTitle);

  const handleOpenReportBusiness = () => {
    setTargetType("BUSINESS");
    setTargetId(businessId);
    setTargetTitle(businessTitle);
    setModalOpen(true);
  };

  const handleOpenReportSeller = () => {
    if (!sellerId) return;
    setTargetType("SELLER");
    setTargetId(sellerId);
    setTargetTitle(sellerName);
    setModalOpen(true);
  };

  return (
    <>
      <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-[#627d98]">
        <button
          type="button"
          onClick={handleOpenReportBusiness}
          className="flex items-center gap-1.5 hover:text-rose-400 transition-colors cursor-pointer group"
        >
          <span className="text-rose-500/80 group-hover:text-rose-400">🚩</span>
          <span>Report Listing</span>
        </button>

        {sellerId ? (
          <button
            type="button"
            onClick={handleOpenReportSeller}
            className="flex items-center gap-1.5 hover:text-rose-400 transition-colors cursor-pointer group"
          >
            <span className="text-rose-500/80 group-hover:text-rose-400">👤</span>
            <span>Report Seller</span>
          </button>
        ) : null}
      </div>

      <ReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        targetType={targetType}
        targetId={targetId}
        targetTitle={targetTitle}
      />
    </>
  );
}
