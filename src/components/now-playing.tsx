import { usePlayer } from "@/context/player";
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart, ListMusic,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { currentLyricIndex } from "@/lib/lyrics";
import { isLiked, toggleLike } from "@/lib/storage";
import { useStorageSubscription } from "@/hooks/use-storage";

function fmt(t: number) {
  if (!isFinite(t) || t <= 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function NowPlayingSheet() {
  const p = usePlayer();
  useStorageSubscription();
  if (!p.fullPlayerOpen || !p.current) return null;
  const t = p.current;
  const liked = isLiked(t.id);
  const pct = p.duration ? (p.position / p.duration) * 100 : 0;
  const RepeatIcon = p.repeat === "one" ? Repeat1 : Repeat;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-neutral-800 via-neutral-950 to-black text-foreground animate-fade-up">
      <div className="flex items-center justify-between px-4 pt-4">
        <button onClick={() => p.setFullPlayer(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Close">
          <ChevronDown className="h-6 w-6" />
        </button>
        <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">Now Playing</div>
        <button onClick={() => p.setFullLyrics(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Queue / Lyrics">
          <ListMusic className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-between px-6 pb-8 pt-4">
        <div className="mx-auto w-full max-w-sm">
          <img src={t.thumbnail} alt="" className="aspect-square w-full rounded-xl object-cover shadow-2xl" />
        </div>

        <div className="mx-auto w-full max-w-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-xl font-bold">{t.title}</div>
              <div className="truncate text-sm text-muted-foreground">{t.artist}</div>
            </div>
            <button onClick={() => toggleLike(t)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label={liked ? "Unlike" : "Like"}>
              <Heart className={`h-6 w-6 ${liked ? "fill-brand text-brand" : ""}`} />
            </button>
          </div>

          <div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
              <input
                type="range"
                min={0}
                max={p.duration || 0}
                value={p.position}
                step={0.5}
                onChange={(e) => p.seek(parseFloat(e.target.value))}
                className="absolute inset-0 w-full cursor-pointer opacity-0"
                aria-label="Seek"
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
              <span>{fmt(p.position)}</span>
              <span>{fmt(p.duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={p.toggleShuffle} className={`grid h-10 w-10 place-items-center rounded-full ${p.shuffle ? "text-brand" : "text-muted-foreground"}`} aria-label="Shuffle">
              <Shuffle className="h-5 w-5" />
            </button>
            <button onClick={p.prev} className="grid h-12 w-12 place-items-center rounded-full hover:bg-white/10" aria-label="Previous">
              <SkipBack className="h-6 w-6 fill-current" />
            </button>
            <button onClick={p.toggle} className="grid h-16 w-16 place-items-center rounded-full bg-foreground text-background transition-transform active:scale-95" aria-label={p.playing ? "Pause" : "Play"}>
              {p.playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current" />}
            </button>
            <button onClick={p.next} className="grid h-12 w-12 place-items-center rounded-full hover:bg-white/10" aria-label="Next">
              <SkipForward className="h-6 w-6 fill-current" />
            </button>
            <button onClick={p.cycleRepeat} className={`grid h-10 w-10 place-items-center rounded-full ${p.repeat !== "off" ? "text-brand" : "text-muted-foreground"}`} aria-label="Repeat">
              <RepeatIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FullLyricsSheet() {
  const p = usePlayer();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const idx = useMemo(() => currentLyricIndex(p.lyrics, p.position), [p.lyrics, p.position]);

  useEffect(() => {
    if (idx < 0 || !scrollRef.current) return;
    const el = scrollRef.current.querySelector<HTMLElement>(`[data-line="${idx}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [idx]);

  if (!p.fullLyricsOpen || !p.current) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-foreground animate-fade-up">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <button onClick={() => p.setFullLyrics(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Close lyrics">
          <ChevronDown className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1 px-3 text-center">
          <div className="truncate text-sm font-semibold">{p.current.title}</div>
          <div className="truncate text-xs text-muted-foreground">{p.current.artist}</div>
        </div>
        <button onClick={p.toggle} className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background" aria-label={p.playing ? "Pause" : "Play"}>
          {p.playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
        </button>
      </div>
      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-6 py-24">
        {p.lyrics.length === 0 && p.lyricsPlain && (
          <pre className="whitespace-pre-wrap text-center text-lg leading-relaxed text-muted-foreground">{p.lyricsPlain}</pre>
        )}
        {p.lyrics.length === 0 && !p.lyricsPlain && (
          <div className="grid h-full place-items-center text-muted-foreground">No lyrics available.</div>
        )}
        <ul className="space-y-6 text-center">
          {p.lyrics.map((l, i) => {
            const state = i < idx ? "past" : i === idx ? "cur" : "future";
            return (
              <li
                key={`${l.time}-${i}`}
                data-line={i}
                onClick={() => p.seek(l.time)}
                className={`cursor-pointer text-2xl font-bold leading-snug transition-all duration-300 ${
                  state === "cur" ? "text-foreground scale-105"
                  : state === "past" ? "text-muted-foreground/40"
                  : "text-muted-foreground/70"
                }`}
              >
                {l.text || "♪"}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}