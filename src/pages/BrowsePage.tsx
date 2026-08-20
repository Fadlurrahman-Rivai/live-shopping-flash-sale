import { useState, useEffect } from "react";
import type { Page, User, Stream } from "../types";
import StreamCard from "../components/StreamCard";
import { MOCK_STREAMS } from "../mock-data";
import { formatViewer } from "../utils";
import { api, type ApiStream } from "../api";

type Tab = "all" | "live" | "scheduled" | "ended";

interface BrowsePageProps {
  onNavigate: (p: Page) => void;
  user: User | null;
}

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

export default function BrowsePage({ onNavigate, user }: BrowsePageProps) {
  const [tab, setTab] = useState<Tab>("all");
  const [streams, setStreams] = useState<Stream[]>(MOCK_STREAMS);

  useEffect(() => {
    api
      .getStreams()
      .then((res) => { if (res.data.length > 0) setStreams(res.data.map(enrichStream)); })
      .catch(() => {});
  }, []);

  const liveStreams = MOCK_STREAMS.filter((s) => s.status === "live");
  const scheduledStreams = MOCK_STREAMS.filter((s) => s.status === "scheduled");
  const endedStreams = MOCK_STREAMS.filter((s) => s.status === "ended");

  const featured = liveStreams[0];

  const filtered =
    tab === "all"
      ? MOCK_STREAMS
      : tab === "live"
      ? liveStreams
      : tab === "scheduled"
      ? scheduledStreams
      : endedStreams;

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Hero: featured live */}
        {featured && tab === "all" && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sedang Live Sekarang</h2>
                <p className="text-sm text-gray-500 mt-0.5">{liveStreams.length} siaran aktif</p>
              </div>
              <LivePulse count={liveStreams.reduce((a, b) => a + b.viewerCount, 0)} />
            </div>

            <StreamCard stream={featured} onNavigate={onNavigate} featured />
          </section>
        )}

        {/* Tabs */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full p-1">
              {(
                [
                  { id: "all", label: "Semua" },
                  { id: "live", label: `Live (${liveStreams.length})` },
                  { id: "scheduled", label: `Upcoming` },
                  { id: "ended", label: "Ended" },
                ] as { id: Tab; label: string }[]
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    tab === t.id
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "all" ? (
            <div className="space-y-8">
              {/* Live grid (skip featured) */}
              {liveStreams.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveStreams.slice(1).map((s) => (
                    <StreamCard key={s.id} stream={s} onNavigate={onNavigate} />
                  ))}
                </div>
              )}

              {/* Upcoming */}
              {scheduledStreams.length > 0 && (
                <div>
                  <SectionLabel label="Akan Tayang" sub={`${scheduledStreams.length} siaran dijadwalkan`} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {scheduledStreams.map((s) => (
                      <StreamCard key={s.id} stream={s} onNavigate={onNavigate} />
                    ))}
                  </div>
                </div>
              )}

              {/* Ended */}
              {endedStreams.length > 0 && (
                <div>
                  <SectionLabel label="Sudah Selesai" sub="Tonton ulang siaran terdahulu" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {endedStreams.map((s) => (
                      <StreamCard key={s.id} stream={s} onNavigate={onNavigate} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.length === 0 ? (
                <div className="col-span-3 text-center py-16 text-gray-400 text-sm">
                  Tidak ada siaran
                </div>
              ) : (
                filtered.map((s) => (
                  <StreamCard key={s.id} stream={s} onNavigate={onNavigate} />
                ))
              )}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          FlashLive © 2026 — Live Commerce Platform
        </footer>
      </div>
    </div>
  );
}

function LivePulse({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5 text-red-500 text-sm font-semibold">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>
      {formatViewer(count)} penonton aktif
    </div>
  );
}

function SectionLabel({ label, sub }: { label: string; sub: string }) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-900">{label}</h2>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
