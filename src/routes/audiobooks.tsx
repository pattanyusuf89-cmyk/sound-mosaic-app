import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BookHeadphones, BookmarkPlus, BookmarkCheck, Play, X,
  Download, ListOrdered, CheckCircle2, Trash2,
} from "lucide-react";
import { searchVideos } from "@/lib/youtube";
import {
  getAudiobooks,
  saveAudiobook,
  removeAudiobook,
  isAudiobook,
  getAudiobookProgress,
} from "@/lib/storage";
import { hasDownload, deleteDownload, listDownloads } from "@/lib/downloads";
import { usePlayer } from "@/context/player";
import { useStorageSubscription } from "@/hooks/use-storage";
import { ChaptersSheet } from "@/components/chapters-sheet";
import { DownloadDialog } from "@/components/download-dialog";
import type { Track } from "@/lib/types";

export const Route = createFileRoute("/audiobooks")({
  component: Audiobooks,
  head: () => ({
    meta: [
      { title: "Audiobooks — Sonic" },
      { name: "description", content: "Listen to free audiobooks with auto-resume and background playback." },
    ],
  }),
});

const CATEGORIES = [
  "Fiction",
  "Fantasy",
  "Mystery",
  "Sci-Fi",
  "Self Help",
  "Business",
  "Biography",
  "History",
  "Kids",
] as const;

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

function Audiobooks() {
  useStorageSubscription();
  const [cat, setCat] = useState<string>("Fiction");
  const [q, setQ] = useState("");
  const [chaptersFor, setChaptersFor] = useState<Track | null>(null);
  const [downloadFor, setDownloadFor] = useState<Track | null>(null);
  const { play } = usePlayer();
  const saved = getAudiobooks();

  const query = q.trim() || `${cat} audiobook full length`;
  const results = useQuery({
    queryKey: ["audiobooks", query],
    queryFn: () => searchVideos(query),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <BookHeadphones className="h-6 w-6 text-brand" />
          <h1 className="text-2xl font-black tracking-tight">Audiobooks</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Long-form listening with auto-resume from your last position.
        </p>
      </header>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search audiobooks, authors, titles…"
          className="w-full rounded-full bg-surface-elevated px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand"
        />
      </form>

      <section>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {CATEGORIES.map((c) => {
            const active = !q && c === cat;
            return (
              <button
                key={c}
                onClick={() => { setQ(""); setCat(c); }}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  active ? "bg-brand text-black" : "bg-surface-elevated text-foreground hover:bg-surface"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      {saved.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Continue listening
          </h2>
          <div className="space-y-1">
            {saved.map((t) => (
              <SavedRow key={t.id} track={t} queue={saved} onPlay={play} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {q ? `Results for "${q}"` : cat}
        </h2>
        {results.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {results.error && <div className="text-sm text-destructive">Couldn't load audiobooks.</div>}
        <div className="space-y-1">
          {(results.data ?? []).map((t) => (
            <BookRow
              key={t.id}
              track={t}
              queue={results.data ?? []}
              onPlay={play}
              onChapters={() => setChaptersFor(t)}
              onDownload={() => setDownloadFor(t)}
            />
          ))}
        </div>
      </section>

      {chaptersFor && (
        <ChaptersSheet
          videoId={chaptersFor.id}
          title={chaptersFor.title}
          onClose={() => setChaptersFor(null)}
        />
      )}
      {downloadFor && (
        <DownloadDialog
          videoId={downloadFor.id}
          title={downloadFor.title}
          onClose={() => setDownloadFor(null)}
        />
      )}
    </div>
  );
}

function BookRow({
  track, queue, onPlay, onChapters, onDownload,
}: {
  track: Track;
  queue: Track[];
  onPlay: (t: Track, q?: Track[]) => void;
  onChapters: () => void;
  onDownload: () => void;
}) {
  useStorageSubscription();
  const savedFlag = isAudiobook(track.id);
  const dl = useQuery({
    queryKey: ["dl", track.id],
    queryFn: () => hasDownload(track.id),
    staleTime: 5_000,
  });
  return (
    <div className="group flex w-full items-center gap-3 rounded-md p-2 hover:bg-surface-elevated">
      <button
        onClick={() => { saveAudiobook(track); onPlay(track, queue); }}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface">
          <img src={track.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 fill-current" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{track.title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {track.artist}{track.duration ? ` · ${fmt(track.duration)}` : ""}
          </div>
        </div>
      </button>
      <button
        onClick={onChapters}
        aria-label="Chapters"
        className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground"
      >
        <ListOrdered className="h-5 w-5" />
      </button>
      <button
        onClick={dl.data ? () => deleteDownload(track.id).then(() => dl.refetch()) : onDownload}
        aria-label={dl.data ? "Remove download" : "Download"}
        className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground"
      >
        {dl.data
          ? <CheckCircle2 className="h-5 w-5 text-brand" />
          : <Download className="h-5 w-5" />}
      </button>
      <button
        onClick={() => (savedFlag ? removeAudiobook(track.id) : saveAudiobook(track))}
        aria-label={savedFlag ? "Remove from library" : "Save to library"}
        className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground"
      >
        {savedFlag ? <BookmarkCheck className="h-5 w-5 text-brand" /> : <BookmarkPlus className="h-5 w-5" />}
      </button>
    </div>
  );
}

function SavedRow({
  track, queue, onPlay, onChapters, onDownload,
}: {
  track: Track;
  queue: Track[];
  onPlay: (t: Track, q?: Track[]) => void;
  onChapters: () => void;
  onDownload: () => void;
}) {
  useStorageSubscription();
  const progress = getAudiobookProgress(track.id);
  const pct = progress && track.duration ? Math.min(100, (progress / track.duration) * 100) : 0;
  const dl = useQuery({
    queryKey: ["dl", track.id],
    queryFn: () => hasDownload(track.id),
    staleTime: 5_000,
  });
  return (
    <div className="group flex w-full items-center gap-3 rounded-md p-2 hover:bg-surface-elevated">
      <button
        onClick={() => onPlay(track, queue)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface">
          <img src={track.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 fill-current" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{track.title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {progress > 0 ? `Resume from ${fmt(progress)}` : track.artist}
            {dl.data ? " · Offline" : ""}
          </div>
          {pct > 0 && (
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface">
              <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </button>
      <button
        onClick={onChapters}
        aria-label="Chapters"
        className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground"
      >
        <ListOrdered className="h-5 w-5" />
      </button>
      <button
        onClick={dl.data ? () => deleteDownload(track.id).then(() => dl.refetch()) : onDownload}
        aria-label={dl.data ? "Remove download" : "Download"}
        className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground"
      >
        {dl.data
          ? <Trash2 className="h-5 w-5 text-brand" />
          : <Download className="h-5 w-5" />}
      </button>
      <button
        onClick={() => removeAudiobook(track.id)}
        aria-label="Remove"
        className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}