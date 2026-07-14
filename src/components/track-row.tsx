import { usePlayer } from "@/context/player";
import type { Track } from "@/lib/types";
import { Play, Heart, MoreHorizontal } from "lucide-react";
import { isLiked, toggleLike } from "@/lib/storage";
import { useStorageSubscription } from "@/hooks/use-storage";

export function TrackRow({ track, queue, showArtist = true }: { track: Track; queue?: Track[]; showArtist?: boolean }) {
  const { play, current } = usePlayer();
  useStorageSubscription();
  const active = current?.id === track.id;
  const liked = isLiked(track.id);
  return (
    <button
      onClick={() => play(track, queue)}
      className="group flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-surface-elevated active:bg-surface-elevated"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface">
        <img src={track.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-5 w-5 fill-current" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${active ? "text-brand" : ""}`}>{track.title}</div>
        {showArtist && <div className="truncate text-xs text-muted-foreground">{track.artist}</div>}
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggleLike(track); } }}
        className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground"
        aria-label={liked ? "Unlike" : "Like"}
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-brand text-brand" : ""}`} />
      </span>
      <span className="shrink-0 rounded-full p-2 text-muted-foreground opacity-0 group-hover:opacity-100" aria-hidden>
        <MoreHorizontal className="h-4 w-4" />
      </span>
    </button>
  );
}