export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export interface Offer {
  id: number;
  businessId: number;
  businessTitle: string;
  buyerId: number;
  buyerName: string;
  sellerId: number;
  sellerName: string;
  inquiryId?: number | null;
  amount: number;
  currency: string;
  message?: string | null;
  status: OfferStatus;
  rejectionReason?: string | null;
  expiresAt?: string | null;
  dealId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfferCreatePayload {
  businessId: number;
  amount: number;
  currency?: string;
  message?: string;
  inquiryId?: number;
  expiresAt?: string;
}

export interface RejectOfferPayload {
  reason?: string;
}
