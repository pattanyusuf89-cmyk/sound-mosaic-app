import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getHistory, topArtists } from "@/lib/storage";
import { trending, getRelated } from "@/lib/youtube";
import { TrackRow } from "@/components/track-row";
import { usePlayer } from "@/context/player";
import { useStorageSubscription } from "@/hooks/use-storage";
import type { Track } from "@/lib/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  useStorageSubscription();
  const history = getHistory();
  const artists = topArtists(8);
  const { play } = usePlayer();

  // Recommendations: related to most-recently-played, else trending.
  const recs = useQuery({
    queryKey: ["recs", history[0]?.id ?? "trending"],
    queryFn: async (): Promise<Track[]> => {
      if (history[0]) {
        const rel = await getRelated(history[0].id);
        if (rel.length) return rel;
      }
      return trending();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-black tracking-tight">Good vibes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off.</p>
      </header>

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recently played</h2>
          <div className="grid grid-cols-2 gap-2">
            {history.slice(0, 6).map((t) => (
              <button
                key={t.id}
                onClick={() => play(t, history)}
                className="flex items-center gap-2 overflow-hidden rounded-md bg-surface pr-3 text-left transition-colors hover:bg-surface-elevated"
              >
                <img src={t.thumbnail} alt="" className="h-14 w-14 shrink-0 object-cover" />
                <span className="truncate text-sm font-semibold">{t.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your top artists</h2>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {artists.map((a) => (
              <div key={a.name} className="w-24 shrink-0 text-center">
                <div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-surface-elevated">
                  {a.thumbnail ? (
                    <img src={a.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-muted-foreground">{a.name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="mt-2 truncate text-xs font-medium">{a.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">{a.playCount} plays</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {history[0] ? "Made for you" : "Trending now"}
        </h2>
        {recs.isLoading && <div className="text-sm text-muted-foreground">Loading recommendations…</div>}
        {recs.error && <div className="text-sm text-destructive">Couldn't load recommendations.</div>}
        <div className="space-y-1">
          {(recs.data ?? []).slice(0, 15).map((t) => (
            <TrackRow key={t.id} track={t} queue={recs.data ?? []} />
          ))}
        </div>
      </section>
    </div>
  );
}
