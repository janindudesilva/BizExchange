export type ReportTargetType = "BUSINESS" | "SELLER";

export type ReportCategory =
  | "SCAM_OR_FRAUD"
  | "MISLEADING_INFORMATION"
  | "SUSPICIOUS_DOCUMENTS"
  | "OTHER";

export type ReportStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";

export interface ReportCreatePayload {
  targetType: ReportTargetType;
  targetId: number;
  category: ReportCategory;
  description: string;
}

export interface ReportBuyer {
  id: number;
  targetType: ReportTargetType;
  targetId: number;
  targetTitle: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  resolutionNotes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  resolvedAt?: string | null;
}

export interface ReportAdmin {
  id: number;
  reporterId: number;
  reporterName: string;
  reporterEmail: string;
  targetType: ReportTargetType;
  targetId: number;
  targetTitle: string;
  targetOwnerOrSellerEmail: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  resolutionNotes?: string | null;
  adminInternalNotes?: string | null;
  resolvedByAdminId?: number | null;
  resolvedByAdminName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  resolvedAt?: string | null;
}

export interface ReportStatusUpdatePayload {
  status: ReportStatus;
  resolutionNotes?: string;
  adminInternalNotes?: string;
}
