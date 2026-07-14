import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Search as SearchIcon, X, Clock } from "lucide-react";
import { searchTracks } from "@/lib/youtube";
import { TrackRow } from "@/components/track-row";
import {
  getRecentSearches, pushRecentSearch, clearRecentSearches,
} from "@/lib/storage";
import { useStorageSubscription } from "@/hooks/use-storage";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — Sonic" },
      { name: "description", content: "Search any song and start streaming instantly." },
      { property: "og:title", content: "Search — Sonic" },
      { property: "og:description", content: "Search any song and start streaming instantly." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  useStorageSubscription();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const results = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchTracks(debounced),
    enabled: debounced.length > 1,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (results.data && results.data.length > 0 && debounced) {
      pushRecentSearch(debounced);
    }
  }, [results.data, debounced]);

  const recents = getRecentSearches();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Search</h1>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Songs, artists, albums…"
          className="w-full rounded-full bg-surface-elevated py-3 pl-12 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
          autoFocus
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-white/10"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!debounced && recents.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent searches</h2>
            <button onClick={clearRecentSearches} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recents.map((r) => (
              <button
                key={r}
                onClick={() => setQ(r)}
                className="flex items-center gap-2 rounded-full bg-surface-elevated px-4 py-2 text-sm hover:bg-white/10"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {r}
              </button>
            ))}
          </div>
        </section>
      )}

      {results.isLoading && debounced && <div className="text-sm text-muted-foreground">Searching…</div>}
      {results.error && <div className="text-sm text-destructive">Search failed. Try again.</div>}

      {results.data && results.data.length > 0 && (
        <div className="space-y-1">
          {results.data.map((t) => (
            <TrackRow key={t.id} track={t} queue={results.data} />
          ))}
        </div>
      )}

      {results.data && results.data.length === 0 && debounced && (
        <div className="text-sm text-muted-foreground">No results for "{debounced}".</div>
      )}
    </div>
  );
}