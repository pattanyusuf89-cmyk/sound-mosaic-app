import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Play, Shuffle, Trash2, ListMusic } from "lucide-react";
import {
  getPlaylist, removeFromPlaylist, deletePlaylist,
} from "@/lib/storage";
import { useStorageSubscription } from "@/hooks/use-storage";
import { usePlayer } from "@/context/player";

export const Route = createFileRoute("/playlist/$id")({
  head: () => ({
    meta: [
      { title: "Playlist — Sonic" },
      { name: "description", content: "Playlist details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlaylistDetail,
  notFoundComponent: () => <div className="p-6">Playlist not found.</div>,
});

function PlaylistDetail() {
  useStorageSubscription();
  const { id } = Route.useParams();
  const nav = useNavigate();
  const p = getPlaylist(id);
  const { play, toggleShuffle, shuffle } = usePlayer();

  if (!p) return (
    <div className="p-6 text-center">
      <p className="text-muted-foreground">Playlist not found.</p>
      <Link to="/library" className="mt-4 inline-block text-brand">Back to Library</Link>
    </div>
  );

  const playAll = () => { if (p.tracks[0]) play(p.tracks[0], p.tracks); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => nav({ to: "/library" })} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      <header className="flex flex-col items-center gap-4 text-center">
        <div className="grid aspect-square w-48 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand/40 to-surface-elevated shadow-2xl">
          {p.cover ? <img src={p.cover} alt="" className="h-full w-full object-cover" /> :
            <ListMusic className="h-16 w-16 text-foreground/70" />}
        </div>
        <div>
          <h1 className="text-2xl font-black">{p.name}</h1>
          <p className="text-sm text-muted-foreground">{p.tracks.length} songs</p>
        </div>
      </header>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={playAll}
          disabled={p.tracks.length === 0}
          className="grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-40"
          aria-label="Play playlist"
        >
          <Play className="h-6 w-6 fill-current" />
        </button>
        <button
          onClick={toggleShuffle}
          className={`grid h-10 w-10 place-items-center rounded-full ${shuffle ? "text-brand" : "text-muted-foreground"}`}
          aria-label="Shuffle"
        >
          <Shuffle className="h-5 w-5" />
        </button>
        <button
          onClick={() => { deletePlaylist(p.id); nav({ to: "/library" }); }}
          className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-destructive"
          aria-label="Delete playlist"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {p.tracks.length === 0 ? (
        <div className="rounded-lg bg-surface p-6 text-center text-sm text-muted-foreground">
          This playlist is empty. Add songs from Search.
        </div>
      ) : (
        <ul className="space-y-1">
          {p.tracks.map((t) => (
            <li key={t.id} className="group flex items-center gap-2">
              <button
                onClick={() => play(t, p.tracks)}
                className="flex flex-1 items-center gap-3 rounded-md p-2 text-left hover:bg-surface-elevated"
              >
                <img src={t.thumbnail} alt="" className="h-12 w-12 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.artist}</div>
                </div>
              </button>
              <button
                onClick={() => removeFromPlaylist(p.id, t.id)}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground opacity-0 hover:bg-white/10 hover:text-destructive group-hover:opacity-100"
                aria-label="Remove from playlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}