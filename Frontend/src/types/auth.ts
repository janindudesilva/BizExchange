export type UserRole = "BUYER" | "SELLER" | "ADMIN" | "SUPPORT_AGENT";

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    userId: number;
    fullName: string;
    email: string;
    role: UserRole;
    token: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterBuyerRequest {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  preferredBusinessCategory?: string;
  preferredLocation?: string;
  budgetMin?: number;
  budgetMax?: number;
}

export interface RegisterSellerRequest {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  nicOrPassport?: string;
  address?: string;
  businessOwnerType?: string;
}
