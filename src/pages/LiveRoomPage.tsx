import { useState, useEffect, useRef } from "react";
import type { Page, User, FlashSale } from "../types";
import { MOCK_STREAMS, MOCK_FLASH_SALES } from "../mock-data";
import { useCountdown } from "../hooks/useCountdown";
import { useLiveChat } from "../hooks/useLiveChat";
import { formatPrice, formatViewer, discountPercent } from "../utils";
import { api } from "../api";

interface LiveRoomPageProps {
  streamId: number;
  onNavigate: (p: Page) => void;
  user: User | null;
  token: string | null;
  onLoginRequired: () => void;
}

export default function LiveRoomPage({
  streamId,
  onNavigate,
  user,
  token,
  onLoginRequired,
}: LiveRoomPageProps) {
  const stream = MOCK_STREAMS.find((s) => s.id === streamId) ?? MOCK_STREAMS[0];
  const flashSale = MOCK_FLASH_SALES[streamId] ?? MOCK_FLASH_SALES[1];
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderDone, setOrderDone] = useState(false);

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black/40">
        <button
          onClick={() => onNavigate({ id: "browse" })}
          className="text-white/70 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
        >
          ← Kembali
        </button>
        <span className="text-white/30">|</span>
        <h1 className="text-white text-sm font-medium truncate">{stream.title}</h1>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-0 h-[calc(100vh-48px)]">
        {/* Left: Video area */}
        <div className="lg:flex-1 flex flex-col">
          <VideoArea stream={stream} />
        </div>

        {/* Right: Panel */}
        <div className="lg:w-[360px] flex-shrink-0 flex flex-col bg-white overflow-hidden lg:h-full">
          {/* Flash sale card */}
          <div className="flex-shrink-0">
            <FlashSalePanel
              flashSale={flashSale}
              onBuy={() => {
                if (!user) {
                  onLoginRequired();
                  return;
                }
                setShowCheckout(true);
              }}
              orderDone={orderDone}
            />
          </div>

          {/* Chat */}
          <div className="flex-1 min-h-0 flex flex-col border-t border-gray-100">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Live Chat</span>
              <span className="text-xs text-gray-400">{formatViewer(stream.viewerCount)} menonton</span>
            </div>
            <ChatPanel streamId={streamId} user={user} token={token} />
          </div>
        </div>
      </div>

      {/* Checkout modal */}
      {showCheckout && (
        <CheckoutModal
          flashSale={flashSale}
          onClose={() => setShowCheckout(false)}
          onConfirm={async (qty) => {
            if (token) {
              try {
                await api.createOrder(token, flashSale.id, qty, `order-${flashSale.id}-${Date.now()}`);
              } catch {}
            }
            setShowCheckout(false);
            setOrderDone(true);
          }}
        />
      )}
    </div>
  );
}

/* ── Video Area ─────────────────────────────────────────── */

function VideoArea({ stream }: { stream: (typeof MOCK_STREAMS)[number] }) {
  return (
    <div
      className="relative flex-1 flex items-center justify-center min-h-[280px] lg:min-h-0"
      style={{ background: stream.gradient }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-3 text-center px-6">
        <div className="text-6xl sm:text-7xl opacity-90">{stream.icon}</div>
        <p className="text-white/80 text-sm font-medium">Siaran berlangsung</p>
      </div>

      {/* LIVE badge */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        LIVE
      </div>

      {/* Viewer count */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
        👁 {formatViewer(stream.viewerCount)}
      </div>

      {/* Host badge */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-xl">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
          {stream.hostName.charAt(0)}
        </div>
        <div>
          <p className="text-[11px] text-white/60 leading-none">Host</p>
          <p className="text-xs font-semibold leading-snug">{stream.hostName}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Flash Sale Panel ───────────────────────────────────── */

function FlashSalePanel({
  flashSale,
  onBuy,
  orderDone,
}: {
  flashSale: FlashSale;
  onBuy: () => void;
  orderDone: boolean;
}) {
  const countdown = useCountdown(flashSale.endTime);
  const stockPct = Math.max(2, Math.round((flashSale.saleStock / flashSale.totalStock) * 100));
  const discount = discountPercent(flashSale.normalPrice, flashSale.salePrice);

  return (
    <div className="bg-white">
      {/* Flash sale header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-sm">⚡</span>
          <span className="text-white text-xs font-bold uppercase tracking-wider">Flash Sale</span>
        </div>
        {!countdown.expired ? (
          <div className="flex items-center gap-1">
            {[countdown.hours, countdown.minutes, countdown.seconds].map((v, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-white/60 text-xs">:</span>}
                <span className="bg-black/20 text-white font-mono text-sm font-bold px-1.5 py-0.5 rounded">
                  {String(v).padStart(2, "0")}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-white/80 text-xs font-semibold">Berakhir</span>
        )}
      </div>

      {/* Product info */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-start gap-3">
          {/* Product icon */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)" }}
          >
            ✨
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 mb-0.5">Produk Pilihan</p>
            <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
              {flashSale.productName}
            </h3>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-end gap-2">
          <span className="text-xl font-black text-orange-500">{formatPrice(flashSale.salePrice)}</span>
          <div className="flex flex-col items-start mb-0.5">
            <span className="text-[10px] line-through text-gray-400">
              {formatPrice(flashSale.normalPrice)}
            </span>
            <span className="text-[10px] font-bold text-red-500">-{discount}%</span>
          </div>
        </div>

        {/* Stock bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500">Stok Flash Sale</span>
            <span className="font-semibold text-gray-700">
              {flashSale.saleStock} / {flashSale.totalStock}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${stockPct}%`,
                background:
                  stockPct < 30
                    ? "linear-gradient(90deg,#EF4444,#F97316)"
                    : "linear-gradient(90deg,#F97316,#FCD34D)",
              }}
            />
          </div>
          {stockPct < 30 && (
            <p className="text-[10px] text-red-500 font-semibold animate-pulse">
              ⚠️ Stok hampir habis!
            </p>
          )}
        </div>

        {/* Buy button */}
        {orderDone ? (
          <div className="bg-green-50 border border-green-200 rounded-xl py-3 text-center">
            <p className="text-green-700 font-semibold text-sm">✓ Pesanan Berhasil!</p>
            <p className="text-green-600 text-xs mt-0.5">Terima kasih sudah belanja</p>
          </div>
        ) : (
          <button
            onClick={onBuy}
            disabled={countdown.expired || flashSale.saleStock === 0}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:
                countdown.expired || flashSale.saleStock === 0
                  ? "#9CA3AF"
                  : "linear-gradient(135deg,#F97316,#EF4444)",
            }}
          >
            {countdown.expired
              ? "Flash Sale Berakhir"
              : flashSale.saleStock === 0
              ? "Stok Habis"
              : "🛒 Beli Sekarang"}
          </button>
        )}

        <p className="text-center text-[10px] text-gray-400">
          Maks {flashSale.quotaPerUser} pcs per pengguna
        </p>
      </div>
    </div>
  );
}

/* ── Chat Panel ──────────────────────────────────────────── */

function ChatPanel({ streamId, user, token }: { streamId: number; user: User | null; token: string | null }) {
  const { messages, wsConnected, sendMessage } = useLiveChat(streamId, token);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const content = input.trim();
    if (!content || !user) return;
    sendMessage(content, user.name, user.id);
    setInput("");
  }

  const userColors = [
    "#6366F1","#F59E0B","#10B981","#3B82F6","#8B5CF6","#EC4899","#F97316","#14B8A6",
  ];
  function userColor(id: number) {
    return userColors[id % userColors.length];
  }

  return (
    <>
      {/* WS status */}
      {wsConnected && (
        <div className="px-4 py-1 bg-green-50 border-b border-green-100">
          <span className="text-[10px] font-semibold text-green-600">● Live chat terhubung</span>
        </div>
      )}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
              style={{ background: userColor(msg.userId) }}
            >
              {msg.userName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold" style={{ color: userColor(msg.userId) }}>
                {msg.userName}
              </span>{" "}
              <span className="text-xs text-gray-700 break-words">{msg.content}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-gray-100">
        {user ? (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Tulis pesan..."
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-3.5 py-2 outline-none focus:border-gray-400 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-opacity"
            >
              ↑
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-gray-400 py-1">
            Masuk untuk ikut live chat
          </p>
        )}
      </div>
    </>
  );
}

/* ── Checkout Modal ──────────────────────────────────────── */

function CheckoutModal({
  flashSale,
  onClose,
  onConfirm,
}: {
  flashSale: FlashSale;
  onClose: () => void;
  onConfirm: (qty: number) => Promise<void>;
}) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const total = flashSale.salePrice * qty;

  async function handleConfirm() {
    setLoading(true);
    await onConfirm(qty);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Konfirmasi Pesanan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-lg">×</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)" }}
            >
              ✨
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 line-clamp-2">{flashSale.productName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formatPrice(flashSale.salePrice)} / pcs</p>
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 font-medium">Jumlah</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-50 transition-colors"
              >
                −
              </button>
              <span className="text-base font-bold text-gray-900 w-5 text-center">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(flashSale.quotaPerUser, q + 1))}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-50 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Harga flash sale</span>
              <span>{formatPrice(flashSale.salePrice)} × {qty}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400 line-through">
              <span>Harga normal</span>
              <span>{formatPrice(flashSale.normalPrice * qty)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span className="text-orange-500">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-xs text-green-600 font-semibold">
              <span>Hemat</span>
              <span>{formatPrice((flashSale.normalPrice - flashSale.salePrice) * qty)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#F97316,#EF4444)" }}
          >
            {loading ? "Memproses..." : `Bayar ${formatPrice(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
