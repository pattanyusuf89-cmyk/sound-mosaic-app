import { usePlayer } from "@/context/player";
import { Play, Pause, SkipForward } from "lucide-react";
import { LyricsPreview } from "./lyrics-preview";

function fmt(t: number) {
  if (!isFinite(t) || t <= 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MiniPlayer() {
  const { current, playing, toggle, next, position, duration, setFullPlayer } = usePlayer();
  if (!current) return null;
  const pct = duration ? Math.min(100, (position / duration) * 100) : 0;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-40 mx-auto max-w-2xl px-2">
      <div className="pointer-events-auto">
        <LyricsPreview />
        <div
          className="mx-3 overflow-hidden rounded-xl bg-surface-elevated shadow-lg ring-1 ring-white/5"
          role="button"
          tabIndex={0}
          onClick={() => setFullPlayer(true)}
          onKeyDown={(e) => { if (e.key === "Enter") setFullPlayer(true); }}
        >
          <div className="flex items-center gap-3 p-2">
            <img src={current.thumbnail} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{current.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {current.artist} · {fmt(position)} / {fmt(duration)}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toggle(); }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground hover:bg-white/10"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground hover:bg-white/10"
              aria-label="Next"
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </button>
          </div>
          <div className="h-0.5 w-full bg-white/10">
            <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}