import type { Stream, Page } from "../types";
import { formatViewer, formatScheduled } from "../utils";

interface StreamCardProps {
  stream: Stream;
  onNavigate: (p: Page) => void;
  featured?: boolean;
}

export default function StreamCard({ stream, onNavigate, featured = false }: StreamCardProps) {
  const isLive = stream.status === "live";
  const isEnded = stream.status === "ended";

  return (
    <button
      onClick={() => onNavigate({ id: "live", streamId: stream.id })}
      className={`group text-left w-full rounded-2xl overflow-hidden focus:outline-none
        hover:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.25)] hover:-translate-y-1
        transition-all duration-300 ${isEnded ? "opacity-60 grayscale" : ""}`}
    >
      {/* Thumbnail */}
      <div
        className={`relative overflow-hidden ${featured ? "aspect-[16/7]" : "aspect-[4/3]"}`}
        style={{ background: stream.gradient }}
      >
        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`select-none transition-all duration-500 group-hover:scale-125 group-hover:opacity-80
            ${featured ? "text-[96px]" : "text-[72px]"} opacity-50`}>
            {stream.icon}
          </span>
        </div>

        {/* Play button — appears on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-300">
            <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[15px] border-transparent border-l-white ml-1" />
          </div>
        </div>

        {/* Top row: status badge + category */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <StatusBadge status={stream.status} />
          <span className="text-[10px] font-semibold text-white bg-black/35 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {stream.category}
          </span>
        </div>

        {/* Bottom overlay: viewer / time + title + host */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {isLive && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
              </span>
              <span className="text-white/90 text-xs font-semibold tracking-wide">
                {formatViewer(stream.viewerCount)} menonton
              </span>
            </div>
          )}
          {stream.status === "scheduled" && stream.scheduledAt && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs">🗓</span>
              <span className="text-white/75 text-xs font-medium">{formatScheduled(stream.scheduledAt)}</span>
            </div>
          )}
          {isEnded && stream.viewerPeak > 0 && (
            <p className="text-white/50 text-xs mb-2">{formatViewer(stream.viewerPeak)} penonton</p>
          )}

          <h3 className={`text-white font-bold leading-snug line-clamp-2 mb-2.5 drop-shadow-sm
            ${featured ? "text-xl sm:text-2xl" : "text-sm"}`}>
            {stream.title}
          </h3>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              {stream.hostName.charAt(0)}
            </div>
            <span className="text-white/75 text-xs font-medium truncate">{stream.hostName}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: Stream["status"] }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-red-500/40">
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        Live
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/30">
        Upcoming
      </span>
    );
  }
  return (
    <span className="bg-black/40 text-white/60 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
      Ended
    </span>
  );
}


