import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import type { Page, User, FlashSale } from "../types";
import { MOCK_STREAMS, MOCK_FLASH_SALES, MOCK_CATALOG } from "../mock-data";
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
  const [mobileTab, setMobileTab] = useState<"product" | "chat">("product");
  const otherProducts = MOCK_CATALOG.filter((p) => p.streamId !== streamId).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Top bar — sticky so back button always visible when scrolling on mobile */}
      <div className="sticky top-14 z-30 flex items-center gap-3 px-4 py-2.5 bg-gray-950/95 backdrop-blur-md border-b border-white/10">
        <button
          onClick={() => onNavigate({ id: "browse" })}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-semibold transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full"
        >
          ← Kembali
        </button>
        <span className="text-white/20">|</span>
        <h1 className="text-white/70 text-sm font-medium truncate">{stream.title}</h1>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-0 lg:h-[calc(100vh-104px)]">
        {/* Left: Video area */}
        <div className="lg:flex-1 flex flex-col">
          <VideoArea stream={stream} flashSale={flashSale} />
        </div>

        {/* Right: Side panel */}
        <div className="lg:w-[380px] flex-shrink-0 flex flex-col bg-white overflow-hidden lg:h-full">

          {/* Mobile tab switcher */}
          <div className="lg:hidden flex border-b border-gray-100">
            {(["product", "chat"] as const).map((t) => (
              <button key={t} onClick={() => setMobileTab(t)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  mobileTab === t ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400"
                }`}>
                {t === "product" ? "⚡ Produk" : "💬 Chat"}
              </button>
            ))}
          </div>

          {/* Product panel — always visible desktop, tab-conditional mobile */}
          <div className={`flex-shrink-0 ${mobileTab !== "product" ? "hidden lg:block" : ""}`}>
            <FlashSalePanel
              flashSale={flashSale}
              onBuy={() => { if (!user) { onLoginRequired(); return; } setShowCheckout(true); }}
              orderDone={orderDone}
            />
            {/* Other products strip */}
            <div className="border-t border-gray-100 px-4 py-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Produk Lainnya</p>
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {otherProducts.map((p) => (
                  <div key={p.id} className="flex-shrink-0 w-16 text-center">
                    <img src={p.imageUrl} alt={p.name}
                      className="w-16 h-16 rounded-xl object-cover border border-gray-100" loading="lazy" />
                    <p className="text-[9px] text-gray-500 mt-1 line-clamp-2 leading-snug">{p.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat panel */}
          <div className={`flex-1 min-h-0 flex flex-col border-t border-gray-100 ${mobileTab !== "chat" ? "hidden lg:flex" : ""}`}>
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
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

const REACTIONS = ["❤️", "🔥", "😍", "⚡", "💯", "🛒", "✨", "👑"];

function useFloatingReactions() {
  const [items, setItems] = useState<{ id: number; emoji: string; x: number }[]>([]);
  useEffect(() => {
    const id = setInterval(() => {
      setItems((prev) => [
        ...prev.slice(-10),
        { id: Date.now(), emoji: REACTIONS[Math.floor(Math.random() * REACTIONS.length)], x: 10 + Math.random() * 70 },
      ]);
    }, 900);
    return () => clearInterval(id);
  }, []);
  return items;
}

function VideoArea({ stream, flashSale }: { stream: (typeof MOCK_STREAMS)[number]; flashSale: FlashSale }) {
  const reactions = useFloatingReactions();
  const discount = discountPercent(flashSale.normalPrice, flashSale.salePrice);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    fetch(`/media/sessions/by-stream/${stream.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => { if (s?.playback?.hls) setHlsUrl(s.playback.hls); })
      .catch(() => {});
  }, [stream.id]);

  useEffect(() => {
    if (!hlsUrl || !videoRef.current) return;
    const video = videoRef.current;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS — Safari / iOS
      video.src = hlsUrl;
      video.play().catch(() => {});
      return;
    }
    if (!Hls.isSupported()) return;
    const hls = new Hls({ maxBufferLength: 10 });
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    return () => hls.destroy();
  }, [hlsUrl]);

  return (
    <div className="relative flex-1 min-h-[340px] lg:min-h-0 overflow-hidden" style={{ background: stream.gradient }}>
      {/* Video element — fills area, hidden until a URL is loaded */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        autoPlay
        loop
        playsInline
        onCanPlay={() => setVideoReady(true)}
      />

      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {/* Product image — shown only when video is not yet playing */}
      {!videoReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {flashSale.productImageUrl ? (
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-white/5 backdrop-blur-sm" />
              <img
                src={flashSale.productImageUrl}
                alt={flashSale.productName}
                className="relative w-44 h-44 lg:w-52 lg:h-52 object-cover rounded-3xl shadow-2xl border-2 border-white/20"
              />
              {/* Discount badge on image */}
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg">
                -{discount}%
              </div>
            </div>
          ) : (
            <span className="text-8xl opacity-50">{stream.icon}</span>
          )}
        </div>
      )}

      {/* Floating reactions */}
      <div className="absolute bottom-24 right-3 w-10 h-48 pointer-events-none overflow-visible">
        {reactions.map((r) => (
          <span
            key={r.id}
            className="absolute text-2xl"
            style={{
              left: `${r.x}%`,
              bottom: 0,
              animation: "float-up 2.5s ease-out forwards",
            }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* LIVE badge */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-red-500/50">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
      </div>

      {/* Viewer count */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/10">
        👁 {formatViewer(stream.viewerCount)}
      </div>

      {/* Bottom: host + flash sale preview */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-3">
        {/* Host */}
        <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/30 to-white/10 border border-white/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {stream.hostName.charAt(0)}
          </div>
          <div>
            <p className="text-[9px] text-white/50 uppercase tracking-wider leading-none">Host</p>
            <p className="text-xs font-semibold text-white leading-snug">{stream.hostName}</p>
          </div>
        </div>

        {/* Flash sale price preview */}
        <div className="bg-black/50 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-right">
          <p className="text-[9px] text-orange-400 font-bold uppercase tracking-wider">⚡ Flash Price</p>
          <p className="text-sm font-black text-white">{formatPrice(flashSale.salePrice)}</p>
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
      {/* Flash sale header — gradient bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 via-red-500 to-rose-500">
        <div className="flex items-center gap-2">
          <span className="text-white text-base">⚡</span>
          <span className="text-white text-xs font-black uppercase tracking-widest">Flash Sale</span>
        </div>
        {!countdown.expired ? (
          <div className="flex items-center gap-1">
            {[countdown.hours, countdown.minutes, countdown.seconds].map((v, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <span className="text-white/50 text-xs font-bold">:</span>}
                <span className="bg-black/25 backdrop-blur-sm text-white font-black font-mono text-sm px-2 py-1 rounded-lg min-w-[32px] text-center tabular-nums">
                  {String(v).padStart(2, "0")}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-white/70 text-xs font-bold bg-black/20 px-2 py-1 rounded-full">Berakhir</span>
        )}
      </div>

      {/* Product info */}
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-start gap-3">
          {flashSale.productImageUrl ? (
            <img
              src={flashSale.productImageUrl}
              alt={flashSale.productName}
              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 shadow-md"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-inner"
              style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)" }}
            >
              ✨
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Produk Pilihan</p>
            <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
              {flashSale.productName}
            </h3>
          </div>
        </div>

        {/* Price block */}
        <div className="flex items-center justify-between bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
          <div>
            <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider mb-0.5">Harga Flash</p>
            <p className="text-2xl font-black text-orange-500 leading-none">{formatPrice(flashSale.salePrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs line-through text-gray-400">{formatPrice(flashSale.normalPrice)}</p>
            <div className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full mt-0.5">
              <span>↓</span> {discount}%
            </div>
          </div>
        </div>

        {/* Stock bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-600">Stok Flash Sale</span>
            <span className="text-xs font-bold text-gray-800">{flashSale.saleStock} / {flashSale.totalStock}</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
              style={{
                width: `${stockPct}%`,
                background: stockPct < 30
                  ? "linear-gradient(90deg,#EF4444,#F97316)"
                  : "linear-gradient(90deg,#F97316,#FCD34D)",
              }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
            </div>
          </div>
          {stockPct < 30 && (
            <p className="text-[11px] text-red-500 font-bold flex items-center gap-1">
              <span>🔥</span> Stok tersisa {stockPct}%!
            </p>
          )}
        </div>

        {/* Buy button */}
        {orderDone ? (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl py-4 text-center">
            <p className="text-green-700 font-black text-base">✓ Pesanan Berhasil!</p>
            <p className="text-green-600 text-xs mt-0.5 font-medium">Terima kasih sudah belanja 🎉</p>
          </div>
        ) : (
          <button
            onClick={onBuy}
            disabled={countdown.expired || flashSale.saleStock === 0}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: countdown.expired || flashSale.saleStock === 0
                ? "#9CA3AF"
                : "linear-gradient(135deg,#F97316,#EF4444,#EC4899)",
            }}
          >
            {countdown.expired ? "Flash Sale Berakhir"
              : flashSale.saleStock === 0 ? "Stok Habis"
              : "🛒 Beli Sekarang"}
          </button>
        )}

        <p className="text-center text-[10px] text-gray-400 font-medium">
          Maks {flashSale.quotaPerUser} pcs per pengguna · Bayar langsung
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
