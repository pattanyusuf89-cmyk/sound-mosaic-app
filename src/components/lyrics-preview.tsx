import { usePlayer } from "@/context/player";
import { currentLyricIndex } from "@/lib/lyrics";
import { useMemo } from "react";

export function LyricsPreview() {
  const { lyrics, lyricsLoaded, position, setFullLyrics, current } = usePlayer();
  const idx = useMemo(() => currentLyricIndex(lyrics, position), [lyrics, position]);
  if (!current || !lyricsLoaded || lyrics.length === 0) return null;

  const lines = [-1, 0, 1, 2].map((o) => lyrics[idx + o]).filter(Boolean);
  return (
    <button
      onClick={() => setFullLyrics(true)}
      className="mx-3 mb-2 w-[calc(100%-1.5rem)] overflow-hidden rounded-xl bg-surface/80 px-4 py-3 text-left backdrop-blur transition-colors hover:bg-surface"
      aria-label="Open lyrics"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-brand">Lyrics</div>
      <div className="mt-1 space-y-0.5">
        {lines.map((l, i) => (
          <div
            key={`${l.time}-${i}`}
            className={`truncate text-sm transition-all duration-300 ${
              i === (idx >= 0 ? 1 : 0)
                ? "font-semibold text-foreground"
                : "text-muted-foreground/70"
            }`}
          >
            {l.text || "♪"}
          </div>
        ))}
      </div>
    </button>
  );
}