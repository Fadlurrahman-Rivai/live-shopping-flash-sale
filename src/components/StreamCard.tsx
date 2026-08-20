import type { Stream, Page } from "../types";
import { formatViewer, formatScheduled } from "../utils";

interface StreamCardProps {
  stream: Stream;
  onNavigate: (p: Page) => void;
  featured?: boolean;
}

export default function StreamCard({ stream, onNavigate, featured = false }: StreamCardProps) {
  const isLive = stream.status === "live";
  const isScheduled = stream.status === "scheduled";

  return (
    <button
      onClick={() => onNavigate({ id: "live", streamId: stream.id })}
      className={`group text-left bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 ${
        featured ? "flex gap-0 flex-col sm:flex-row" : "flex flex-col"
      }`}
    >
      {/* Thumbnail */}
      <div
        className={`relative flex-shrink-0 flex items-center justify-center ${
          featured ? "sm:w-64 aspect-video sm:aspect-auto" : "aspect-video"
        }`}
        style={{ background: stream.gradient }}
      >
        <span className="text-5xl select-none opacity-80">{stream.icon}</span>

        {/* Status badge */}
        <div className="absolute top-2.5 left-2.5">
          <StatusBadge status={stream.status} />
        </div>

        {/* Viewer count for live */}
        {isLive && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
            {formatViewer(stream.viewerCount)}
          </div>
        )}

        {/* Scheduled time */}
        {isScheduled && stream.scheduledAt && (
          <div className="absolute bottom-2.5 left-2.5 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
            🗓 {formatScheduled(stream.scheduledAt)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`flex flex-col gap-1 p-3 ${featured ? "sm:p-5 justify-center" : ""}`}>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{stream.category}</p>
        <h3
          className={`font-semibold text-gray-900 leading-snug line-clamp-2 ${
            featured ? "text-base sm:text-lg" : "text-sm"
          }`}
        >
          {stream.title}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <HostAvatar name={stream.hostName} />
          <span className="text-xs text-gray-500 truncate">{stream.hostName}</span>
        </div>
        {stream.status === "ended" && stream.viewerPeak > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">{formatViewer(stream.viewerPeak)} penonton</p>
        )}
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: Stream["status"] }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        Live
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span className="bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
        Upcoming
      </span>
    );
  }
  return (
    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
      Ended
    </span>
  );
}

function HostAvatar({ name }: { name: string }) {
  return (
    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600 flex-shrink-0">
      {name.charAt(0)}
    </div>
  );
}
