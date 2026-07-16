export interface BusinessFile {
  id: number;
  fileType: "IMAGE" | "DOCUMENT" | "FINANCIAL_REPORT";
  originalName: string;
  url: string;
  uploadedAt: string;
}

export interface Business {
  id: number;
  title: string;
  category: string;
  sellerName: string;
  description: string;
  location: string;
  askingPrice: number;
  status: string;
  rejectionReason?: string;
  isFavorited?: boolean;
}

export interface BusinessApiResponse {
  success: boolean;
  message: string;
  data: Business[];
}

export interface SingleBusinessApiResponse {
  success: boolean;
  message: string;
  data: Business;
}

export interface BusinessCreateRequest {
  sellerId: number;
  category: string;
  title: string;
  description: string;
  location: string;
  address?: string;
  askingPrice: number;
  businessAgeYears?: number;
  numberOfEmployees?: number;
  reasonForSelling?: string;
}