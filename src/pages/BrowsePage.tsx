import { useState, useEffect } from "react";
import type { Page, User, Stream } from "../types";
import StreamCard from "../components/StreamCard";
import { MOCK_STREAMS, MOCK_CATALOG, type CatalogProduct } from "../mock-data";
import { formatViewer, formatPrice, discountPercent } from "../utils";
import { api, type ApiStream } from "../api";

type Tab = "all" | "live" | "scheduled" | "ended";

const GRADIENTS = [
  "linear-gradient(135deg,#F472B6,#8B5CF6)",
  "linear-gradient(135deg,#6366F1,#EC4899)",
  "linear-gradient(135deg,#3B82F6,#06B6D4)",
  "linear-gradient(135deg,#F59E0B,#EF4444)",
  "linear-gradient(135deg,#F97316,#FCD34D)",
  "linear-gradient(135deg,#10B981,#3B82F6)",
  "linear-gradient(135deg,#8B5CF6,#06B6D4)",
];
const ICONS = ["✨", "👟", "💻", "👗", "🍳", "🎮", "⌚"];

function enrichStream(s: ApiStream): Stream {
  const idx = s.id % GRADIENTS.length;
  return {
    ...s,
    gradient: s.status === "ended" ? "linear-gradient(135deg,#94A3B8,#64748B)" : GRADIENTS[idx],
    icon: ICONS[idx],
    category: "Siaran",
    viewerCount: s.viewerPeak,
  };
}

interface BrowsePageProps {
  onNavigate: (p: Page) => void;
  user: User | null;
}

export default function BrowsePage({ onNavigate, user }: BrowsePageProps) {
  const [tab, setTab] = useState<Tab>("all");
  const [streams, setStreams] = useState<Stream[]>(MOCK_STREAMS);

  useEffect(() => {
    api
      .getStreams()
      .then((res) => { if (res.data.length > 0) setStreams(res.data.map(enrichStream)); })
      .catch(() => {});
  }, []);

  const liveStreams = streams.filter((s) => s.status === "live");
  const scheduledStreams = streams.filter((s) => s.status === "scheduled");
  const endedStreams = streams.filter((s) => s.status === "ended");
  const featured = liveStreams[0];
  const totalViewers = liveStreams.reduce((a, b) => a + b.viewerCount, 0);

  const filtered =
    tab === "all" ? streams
    : tab === "live" ? liveStreams
    : tab === "scheduled" ? scheduledStreams
    : endedStreams;

  return (
    <div className="min-h-screen bg-[#F2F2F7]">

      {/* Stats ticker */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-6 overflow-x-auto">
          <StatChip icon="🔴" label={`${liveStreams.length} Live`} accent />
          <StatChip icon="👁" label={`${formatViewer(totalViewers)} penonton aktif`} />
          <StatChip icon="⚡" label="Flash sale aktif" />
          <StatChip icon="🗓" label={`${scheduledStreams.length} segera tayang`} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Hero featured */}
        {featured && tab === "all" && (
          <section className="fade-up">
            <SectionHeader label="Sedang Live Sekarang" sub={`${liveStreams.length} siaran aktif`} accentColor="#EF4444">
              <LivePulse count={totalViewers} />
            </SectionHeader>
            <div className="mt-4">
              <StreamCard stream={featured} onNavigate={onNavigate} featured />
            </div>
          </section>
        )}

        {/* Tabs */}
        <section>
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {(
              [
                { id: "all", label: "Semua", count: streams.length },
                { id: "live", label: "Live", count: liveStreams.length },
                { id: "scheduled", label: "Upcoming", count: scheduledStreams.length },
                { id: "ended", label: "Ended", count: endedStreams.length },
              ] as { id: Tab; label: string; count: number }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  tab === t.id
                    ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20"
                    : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-100"
                }`}
              >
                {t.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {tab === "all" ? (
            <div className="space-y-10">
              {/* Live grid (remaining) */}
              {liveStreams.length > 1 && (
                <div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {liveStreams.slice(1).map((s, i) => (
                      <div key={s.id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <StreamCard stream={s} onNavigate={onNavigate} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming */}
              {scheduledStreams.length > 0 && (
                <div>
                  <SectionHeader label="Akan Tayang" sub={`${scheduledStreams.length} siaran dijadwalkan`} accentColor="#6366F1" />
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mt-4">
                    {scheduledStreams.map((s, i) => (
                      <div key={s.id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <StreamCard stream={s} onNavigate={onNavigate} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ended */}
              {endedStreams.length > 0 && (
                <div>
                  <SectionHeader label="Sudah Selesai" sub="Tonton ulang siaran terdahulu" accentColor="#9CA3AF" />
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mt-4">
                    {endedStreams.map((s, i) => (
                      <div key={s.id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <StreamCard stream={s} onNavigate={onNavigate} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {filtered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-gray-500 font-medium">Tidak ada siaran</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {filtered.map((s, i) => (
                    <div key={s.id} className="fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                      <StreamCard stream={s} onNavigate={onNavigate} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Product Catalog */}
        {tab === "all" && (
          <section>
            <SectionHeader label="Flash Sale Produk" sub={`${MOCK_CATALOG.length} produk tersedia dengan harga terbaik`} accentColor="#F97316" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 mt-4">
              {MOCK_CATALOG.map((product, i) => (
                <div key={product.id} className="fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <ProductCard product={product} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          FlashLive © 2026 — Platform Live Commerce Indonesia
        </footer>
      </div>
    </div>
  );
}

function ProductCard({ product, onNavigate }: { product: CatalogProduct; onNavigate: (p: Page) => void }) {
  const discount = product.salePrice ? discountPercent(product.normalPrice, product.salePrice) : 0;

  return (
    <button
      onClick={() => product.streamId ? onNavigate({ id: "live", streamId: product.streamId }) : undefined}
      className="group text-left w-full bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 focus:outline-none"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
            -{discount}%
          </div>
        )}
        {product.streamId && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> LIVE
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{product.category}</p>
        <h3 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">{product.name}</h3>
        <div className="flex items-end gap-1.5 flex-wrap">
          {product.salePrice ? (
            <>
              <span className="text-sm font-black text-orange-500">{formatPrice(product.salePrice)}</span>
              <span className="text-[10px] text-gray-400 line-through">{formatPrice(product.normalPrice)}</span>
            </>
          ) : (
            <span className="text-sm font-bold text-gray-900">{formatPrice(product.normalPrice)}</span>
          )}
        </div>
        {product.salePrice && product.saleStock !== undefined && (
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(5, (product.saleStock / 200) * 100)}%`,
                background: "linear-gradient(90deg,#F97316,#EF4444)",
              }}
            />
          </div>
        )}
      </div>
    </button>
  );
}

function StatChip({ icon, label, accent = false }: { icon: string; label: string; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${accent ? "text-red-400" : "text-white/60"}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function SectionHeader({
  label, sub, accentColor, children,
}: {
  label: string;
  sub: string;
  accentColor: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between">
      <div className="flex items-start gap-3">
        <div className="w-1 h-12 rounded-full flex-shrink-0 mt-0.5" style={{ background: accentColor }} />
        <div>
          <h2 className="text-lg font-black text-gray-900 leading-none">{label}</h2>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function LivePulse({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-500 text-xs font-semibold px-3 py-1.5 rounded-full">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      {formatViewer(count)} penonton aktif
    </div>
  );
}


