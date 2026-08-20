export interface ApiOrder {
  id: number;
  buyerId: number;
  buyerName: string;
  flashSaleId: number;
  productId: number;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: "paid" | "shipped" | "cancelled";
  createdAt: string;
}

// Shape returned by POST /orders — different from GET /orders (mapOrderRow)
export interface CreateOrderResponse {
  orderId: number;
  flashSaleId: number;
  streamId: number;
  productId: number;
  product: string;
  qty: number;
  totalPrice: number;
  remainingFlashSaleStock: number;
  remainingProductStock: number;
  status: string;
  createdAt: string;
}

export interface ApiStream {
  id: number;
  hostId: number;
  hostName: string;
  title: string;
  status: "live" | "scheduled" | "ended";
  startedAt: string | null;
  endedAt: string | null;
  viewerPeak: number;
}

export interface ApiFlashSale {
  id: number;
  productId: number;
  productName: string;
  streamId: number;
  streamTitle: string;
  salePrice: number;
  saleStock: number;
  quotaPerUser: number;
  startTime: string;
  endTime: string;
  status: "active" | "scheduled" | "ended";
}

export interface ApiChatMessage {
  id: number;
  streamId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: { id: number; name: string; email: string; role: string; status: string };
}

class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function req<T>(
  path: string,
  init: RequestInit & { token?: string; idempotencyKey?: string } = {},
): Promise<T> {
  const { token, idempotencyKey, headers, ...rest } = init;

  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body?.error?.message ?? `HTTP ${res.status}`,
      res.status,
      body?.error?.code ?? "UNKNOWN",
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    req<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  register: (name: string, email: string, password: string, role: string) =>
    req<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, role }) }),

  logout: (token: string) =>
    req<{ ok: boolean }>("/auth/logout", { method: "POST", token }),

  getStreams: (page = 1) =>
    req<{ data: ApiStream[]; total: number }>(`/streams?page=${page}&limit=20`),

  getFlashSales: (page = 1) =>
    req<{ data: ApiFlashSale[]; total: number }>(`/flash-sales?page=${page}&limit=100`),

  getOrders: (token: string, page = 1) =>
    req<{ data: ApiOrder[]; total: number }>(`/orders?page=${page}&limit=50`, { token }),

  createOrder: (token: string, flashSaleId: number, qty: number, idempotencyKey: string) =>
    req<CreateOrderResponse>("/orders", {
      method: "POST",
      token,
      idempotencyKey,
      body: JSON.stringify({ flashSaleId, qty }),
    }),

  getChatHistory: (streamId: number) =>
    req<{ data: ApiChatMessage[] }>(`/streams/${streamId}/chat?limit=30`),

  sendChat: (token: string, streamId: number, content: string) =>
    req<{ id: number }>(`/streams/${streamId}/chat`, {
      method: "POST",
      token,
      body: JSON.stringify({ content }),
    }),
};
