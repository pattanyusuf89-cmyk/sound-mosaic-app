import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Heart, Clock, ListMusic, Trash2 } from "lucide-react";
import {
  getHistory, getLikes, getPlaylists, createPlaylist, deletePlaylist,
  topArtists,
} from "@/lib/storage";
import { useStorageSubscription } from "@/hooks/use-storage";
import { TrackRow } from "@/components/track-row";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your Library — Sonic" },
      { name: "description", content: "Your recent plays, liked songs, playlists and top artists." },
      { property: "og:title", content: "Your Library — Sonic" },
      { property: "og:description", content: "Your recent plays, liked songs, playlists and top artists." },
    ],
  }),
  component: Library,
});

type Tab = "recent" | "liked" | "playlists" | "artists";

function Library() {
  useStorageSubscription();
  const [tab, setTab] = useState<Tab>("recent");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const history = getHistory();
  const likes = getLikes();
  const playlists = getPlaylists();
  const artists = topArtists(30);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Your Library</h1>
        <button
          onClick={() => setCreating((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface-elevated hover:bg-white/10"
          aria-label="Create playlist"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createPlaylist(name.trim());
            setName(""); setCreating(false); setTab("playlists");
          }}
          className="flex gap-2 rounded-lg bg-surface p-3"
        >
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Playlist name"
            className="flex-1 rounded-md bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">Create</button>
        </form>
      )}

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {(["recent", "liked", "playlists", "artists"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
              tab === t ? "bg-foreground text-background" : "bg-surface-elevated text-foreground hover:bg-white/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "recent" && (
        <Section title="Recently played" icon={<Clock className="h-4 w-4" />}>
          {history.length === 0 ? <Empty text="Songs you play show up here." /> :
            history.map((t) => <TrackRow key={t.id} track={t} queue={history} />)}
        </Section>
      )}

      {tab === "liked" && (
        <Section title="Liked songs" icon={<Heart className="h-4 w-4" />}>
          {likes.length === 0 ? <Empty text="Tap the heart on any song to like it." /> :
            likes.map((t) => <TrackRow key={t.id} track={t} queue={likes} />)}
        </Section>
      )}

      {tab === "playlists" && (
        <Section title="Playlists" icon={<ListMusic className="h-4 w-4" />}>
          {playlists.length === 0 ? <Empty text="Create a playlist to get started." /> : (
            <ul className="space-y-2">
              {playlists.map((p) => (
                <li key={p.id} className="group flex items-center gap-3 rounded-md p-2 hover:bg-surface-elevated">
                  <Link to="/playlist/$id" params={{ id: p.id }} className="flex flex-1 items-center gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-brand/40 to-surface-elevated">
                      {p.cover ? <img src={p.cover} alt="" className="h-full w-full object-cover" /> :
                        <ListMusic className="h-6 w-6 text-foreground/70" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.tracks.length} songs</div>
                    </div>
                  </Link>
                  <button
                    onClick={() => deletePlaylist(p.id)}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground opacity-0 hover:bg-white/10 hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete playlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === "artists" && (
        <Section title="Top artists" icon={null}>
          {artists.length === 0 ? <Empty text="Play a few songs to see your top artists." /> : (
            <div className="grid grid-cols-3 gap-4">
              {artists.map((a) => (
                <div key={a.name} className="text-center">
                  <div className="mx-auto grid aspect-square w-full place-items-center overflow-hidden rounded-full bg-surface-elevated">
                    {a.thumbnail ? <img src={a.thumbnail} alt="" className="h-full w-full object-cover" /> :
                      <span className="text-2xl font-black text-muted-foreground">{a.name[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="mt-2 truncate text-xs font-medium">{a.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{a.playCount} plays</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-lg bg-surface p-6 text-center text-sm text-muted-foreground">{text}</div>;
}