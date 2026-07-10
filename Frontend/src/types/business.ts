export interface Business {
  id: number;
  title: string;
  category: string;
  sellerName: string;
  description: string;
  location: string;
  askingPrice: number;
  status: string;
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
  categoryId: number;
  title: string;
  description: string;
  location: string;
  address?: string;
  askingPrice: number;
  businessAgeYears?: number;
  numberOfEmployees?: number;
  reasonForSelling?: string;
}
