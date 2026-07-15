import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { getStreamInfo, type Chapter } from "@/lib/youtube";
import { usePlayer } from "@/context/player";

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export function ChaptersSheet({
  videoId,
  title,
  onClose,
}: {
  videoId: string;
  title: string;
  onClose: () => void;
}) {
  const p = usePlayer();
  const q = useQuery({
    queryKey: ["stream-info", videoId],
    queryFn: () => getStreamInfo(videoId),
    staleTime: 60 * 60 * 1000,
  });
  const chapters: Chapter[] = q.data?.chapters ?? [];
  const isCurrent = p.current?.id === videoId;
  const activeIdx = isCurrent
    ? chapters.findIndex((c, i) =>
        p.position >= c.start && (i === chapters.length - 1 || p.position < chapters[i + 1].start),
      )
    : -1;

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-background text-foreground animate-fade-up">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Chapters</div>
          <div className="truncate text-sm font-semibold">{title}</div>
        </div>
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {q.isLoading && <div className="text-sm text-muted-foreground">Loading chapters…</div>}
        {!q.isLoading && chapters.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No chapters available for this audiobook.
          </div>
        )}
        <ol className="space-y-1">
          {chapters.map((c, i) => {
            const active = i === activeIdx;
            return (
              <li key={`${c.start}-${i}`}>
                <button
                  onClick={() => { if (isCurrent) p.seek(c.start); }}
                  disabled={!isCurrent}
                  className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors ${
                    active ? "bg-surface-elevated" : "hover:bg-surface-elevated"
                  } ${!isCurrent ? "opacity-70" : ""}`}
                >
                  <span className={`w-8 shrink-0 text-right text-xs tabular-nums ${active ? "text-brand" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  {c.image && (
                    <img src={c.image} alt="" className="h-10 w-16 shrink-0 rounded object-cover" loading="lazy" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm ${active ? "font-semibold text-brand" : "font-medium"}`}>
                      {c.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{fmt(c.start)}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
        {!isCurrent && chapters.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Start playing this audiobook to jump to a chapter.
          </p>
        )}
      </div>
    </div>
  );
}