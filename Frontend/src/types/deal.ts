export type DealStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Deal {
  id: number;
  businessId: number;
  businessTitle: string;
  buyerId: number;
  buyerName: string;
  buyerEmail?: string;
  sellerId: number;
  sellerName: string;
  sellerEmail?: string;
  offerId: number;
  agreedPrice: number;
  currency: string;
  status: DealStatus;
  buyerConfirmedAt?: string | null;
  sellerConfirmedAt?: string | null;
  cancellationRequestedBy?: number | null;
  cancellationRequestedByName?: string | null;
  cancellationReason?: string | null;
  cancellationRequestedAt?: string | null;
  cancellationPending: boolean;
  notes?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  completionNotice: string;
}

export interface RequestCancellationPayload {
  reason: string;
}

export interface RespondCancellationPayload {
  agree: boolean;
}

export interface AdminCancelDealPayload {
  reason: string;
}
