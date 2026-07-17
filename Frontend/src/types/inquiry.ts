export type InquiryStatus = "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "CLOSED";

export interface Inquiry {
  id: number;
  businessId: number;
  businessTitle: string;
  buyerId: number;
  buyerName: string;
  sellerId: number;
  sellerName: string;
  initialMessage: string;
  status: InquiryStatus;
  createdAt: string;
  hasReviewed?: boolean;
  sellerRating?: number;
  sellerReviewCount?: number;
}

export interface InquiryApiResponse {
  success: boolean;
  message: string;
  data: Inquiry[];
}

export interface SingleInquiryApiResponse {
  success: boolean;
  message: string;
  data: Inquiry;
}

export interface InquiryCreateRequest {
  businessId: number;
  message: string;
}

export interface Message {
  id: number;
  inquiryId: number;
  senderId: number;
  senderName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface MessageApiResponse {
  success: boolean;
  message: string;
  data: Message[];
}

export interface SingleMessageApiResponse {
  success: boolean;
  message: string;
  data: Message;
}
