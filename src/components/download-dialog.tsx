import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { getStreamInfo, type AudioStream } from "@/lib/youtube";
import { downloadStream } from "@/lib/downloads";

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function DownloadDialog({
  videoId,
  title,
  onClose,
}: {
  videoId: string;
  title: string;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ["stream-info", videoId],
    queryFn: () => getStreamInfo(videoId),
    staleTime: 60 * 60 * 1000,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);

  const streams: AudioStream[] = q.data?.audioStreams ?? [];
  // Pick lowest, mid, highest as Low / Medium / High.
  const picks = (() => {
    if (!streams.length) return [];
    if (streams.length === 1) return [{ label: "Standard", s: streams[0] }];
    const low = streams[0];
    const high = streams[streams.length - 1];
    const mid = streams[Math.floor(streams.length / 2)];
    const uniq = Array.from(new Map([
      ["Low", low], ["Medium", mid], ["High", high],
    ]).entries());
    return uniq.map(([label, s]) => ({ label, s }));
  })();

  async function start(s: AudioStream) {
    setBusy(true); setError(null); setProgress({ loaded: 0, total: 0 });
    try {
      await downloadStream(videoId, s.url, { quality: s.quality, mime: s.mimeType }, (loaded, total) => {
        setProgress({ loaded, total });
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Download failed. The stream URL may not allow cross-origin downloads.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-5 text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Download</div>
            <div className="truncate text-sm font-semibold">{title}</div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {q.isLoading && <div className="text-sm text-muted-foreground">Loading available qualities…</div>}
        {q.error && <div className="text-sm text-destructive">Couldn't load stream info.</div>}

        {!q.isLoading && picks.length === 0 && !q.error && (
          <div className="text-sm text-muted-foreground">No downloadable audio streams found.</div>
        )}

        <ul className="space-y-2">
          {picks.map(({ label, s }) => {
            const kbps = Math.round((s.bitrate ?? 0) / 1000);
            return (
              <li key={label + s.url}>
                <button
                  disabled={busy}
                  onClick={() => start(s)}
                  className="flex w-full items-center gap-3 rounded-lg bg-surface-elevated p-3 text-left transition-colors hover:bg-white/10 disabled:opacity-60"
                >
                  <Download className="h-5 w-5 text-brand" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-xs text-muted-foreground">
                      {kbps ? `${kbps} kbps` : s.quality} · {s.mimeType.split("/")[1]?.toUpperCase() ?? s.mimeType}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              Downloading…{" "}
              {progress?.total
                ? `${fmtSize(progress.loaded)} / ${fmtSize(progress.total)}`
                : progress ? fmtSize(progress.loaded) : ""}
            </span>
          </div>
        )}
        {error && <div className="text-xs text-destructive">{error}</div>}
      </div>
    </div>
  );
}