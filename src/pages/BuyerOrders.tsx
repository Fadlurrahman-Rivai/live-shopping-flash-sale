import { useState, useEffect } from "react";
import type { Page, User } from "../types";
import { api, type ApiOrder } from "../api";
import { formatPrice } from "../utils";

const MOCK_ORDERS: ApiOrder[] = [
  { id: 1001, buyerId: 999, buyerName: "Demo User", flashSaleId: 1, productId: 1, productName: "Serum Vitamin C + Collagen Gold 30ml", quantity: 2, totalPrice: 178_000, status: "shipped", createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 1002, buyerId: 999, buyerName: "Demo User", flashSaleId: 2, productId: 2, productName: "Nike Air Zoom Pegasus 42 — Midnight", quantity: 1, totalPrice: 1_250_000, status: "paid", createdAt: new Date(Date.now() - 30 * 60000).toISOString() },
];

interface BuyerOrdersProps {
  user: User;
  token: string | null;
  onNavigate: (p: Page) => void;
}

export default function BuyerOrders({ user, token, onNavigate }: BuyerOrdersProps) {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setOrders(MOCK_ORDERS); setLoading(false); return; }

    api
      .getOrders(token)
      .then((res) => setOrders(res.data))
      .catch(() => setOrders(MOCK_ORDERS))
      .finally(() => setLoading(false));
  }, [token]);

  const statusConfig: Record<ApiOrder["status"], { label: string; cls: string }> = {
    paid: { label: "Dibayar", cls: "text-green-600 bg-green-50" },
    shipped: { label: "Dikirim", cls: "text-blue-600 bg-blue-50" },
    cancelled: { label: "Batal", cls: "text-gray-400 bg-gray-100" },
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div>
          <h1 className="text-xl font-black text-gray-900">Pesanan Saya</h1>
          <p className="text-sm text-gray-500 mt-0.5">Riwayat pembelian {user.name}</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center space-y-3">
            <p className="text-4xl">🛍️</p>
            <p className="font-semibold text-gray-700">Belum ada pesanan</p>
            <p className="text-sm text-gray-400">Yuk mulai belanja dari siaran live!</p>
            <button
              onClick={() => onNavigate({ id: "browse" })}
              className="mt-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-700 transition-colors"
            >
              Browse Siaran
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const cfg = statusConfig[order.status];
              return (
                <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)" }}
                      >
                        ✨
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                          {order.productName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {order.quantity} pcs · #{order.id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-gray-900">{formatPrice(order.totalPrice)}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {order.status === "paid" && (
                      <span className="text-xs text-green-600 font-medium">Menunggu pengiriman</span>
                    )}
                    {order.status === "shipped" && (
                      <span className="text-xs text-blue-600 font-medium">Sedang dikirim</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
