export type StreamStatus = "live" | "scheduled" | "ended";
export type FlashSaleStatus = "active" | "scheduled" | "ended";
export type UserRole = "buyer" | "host" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: string;
}

export interface Stream {
  id: number;
  hostId: number;
  hostName: string;
  title: string;
  status: StreamStatus;
  startedAt: string | null;
  endedAt: string | null;
  viewerPeak: number;
  gradient: string;
  icon: string;
  category: string;
  viewerCount: number;
  scheduledAt?: string;
}

export interface FlashSale {
  id: number;
  productId: number;
  productName: string;
  productDescription: string;
  productImageUrl?: string;
  streamId: number;
  salePrice: number;
  saleStock: number;
  totalStock: number;
  quotaPerUser: number;
  startTime: string;
  endTime: string;
  status: FlashSaleStatus;
  normalPrice: number;
}

export interface ChatMessage {
  id: string;
  userName: string;
  content: string;
  userId: number;
  isHost?: boolean;
}

export type Page =
  | { id: "browse" }
  | { id: "live"; streamId: number }
  | { id: "host-dashboard" }
  | { id: "admin-dashboard" }
  | { id: "buyer-orders" }
  | { id: "auth"; returnTo?: Page };
