import type { Track, Playlist, Artist } from "./types";

const KEYS = {
  history: "sn.history",
  likes: "sn.likes",
  playlists: "sn.playlists",
  recentSearches: "sn.recentSearches",
  artistCounts: "sn.artistCounts",
  audiobooks: "sn.audiobooks",
  audiobookProgress: "sn.audiobookProgress",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent("sn:storage", { detail: { key } }));
}

// ------- history -------
export function getHistory(): Track[] { return read<Track[]>(KEYS.history, []); }
export function pushHistory(t: Track) {
  const cur = getHistory().filter((x) => x.id !== t.id);
  cur.unshift(t);
  write(KEYS.history, cur.slice(0, 50));
  bumpArtist(t.artist, t.thumbnail);
}

// ------- likes -------
export function getLikes(): Track[] { return read<Track[]>(KEYS.likes, []); }
export function isLiked(id: string): boolean { return getLikes().some((x) => x.id === id); }
export function toggleLike(t: Track): boolean {
  const cur = getLikes();
  const idx = cur.findIndex((x) => x.id === t.id);
  if (idx >= 0) { cur.splice(idx, 1); write(KEYS.likes, cur); return false; }
  cur.unshift(t); write(KEYS.likes, cur); return true;
}

// ------- playlists -------
export function getPlaylists(): Playlist[] { return read<Playlist[]>(KEYS.playlists, []); }
export function getPlaylist(id: string): Playlist | undefined { return getPlaylists().find((p) => p.id === id); }
export function createPlaylist(name: string): Playlist {
  const list = getPlaylists();
  const p: Playlist = { id: crypto.randomUUID(), name, createdAt: Date.now(), tracks: [] };
  list.unshift(p); write(KEYS.playlists, list); return p;
}
export function deletePlaylist(id: string) { write(KEYS.playlists, getPlaylists().filter((p) => p.id !== id)); }
export function addToPlaylist(playlistId: string, t: Track) {
  const list = getPlaylists();
  const p = list.find((x) => x.id === playlistId);
  if (!p) return;
  if (p.tracks.some((x) => x.id === t.id)) return;
  p.tracks.push(t);
  if (!p.cover) p.cover = t.thumbnail;
  write(KEYS.playlists, list);
}
export function removeFromPlaylist(playlistId: string, trackId: string) {
  const list = getPlaylists();
  const p = list.find((x) => x.id === playlistId);
  if (!p) return;
  p.tracks = p.tracks.filter((t) => t.id !== trackId);
  write(KEYS.playlists, list);
}

// ------- recent searches -------
export function getRecentSearches(): string[] { return read<string[]>(KEYS.recentSearches, []); }
export function pushRecentSearch(q: string) {
  const clean = q.trim(); if (!clean) return;
  const cur = getRecentSearches().filter((x) => x.toLowerCase() !== clean.toLowerCase());
  cur.unshift(clean); write(KEYS.recentSearches, cur.slice(0, 10));
}
export function clearRecentSearches() { write(KEYS.recentSearches, []); }

// ------- artists -------
type ArtistRec = { name: string; count: number; thumbnail?: string };
export function bumpArtist(name: string, thumbnail?: string) {
  const rec = read<Record<string, ArtistRec>>(KEYS.artistCounts, {});
  const key = name.toLowerCase();
  rec[key] = { name, count: (rec[key]?.count ?? 0) + 1, thumbnail: thumbnail ?? rec[key]?.thumbnail };
  write(KEYS.artistCounts, rec);
}
export function topArtists(limit = 10): Artist[] {
  const rec = read<Record<string, ArtistRec>>(KEYS.artistCounts, {});
  return Object.values(rec)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((r) => ({ name: r.name, playCount: r.count, thumbnail: r.thumbnail }));
}

export function useStorageVersion(): number {
  // used via subscribe; simple counter via listener in components
  return 0;
}

// ------- audiobooks -------
export function getAudiobooks(): Track[] {
  return read<Track[]>(KEYS.audiobooks, []);
}
export function saveAudiobook(t: Track) {
  const cur = getAudiobooks().filter((x) => x.id !== t.id);
  cur.unshift(t);
  write(KEYS.audiobooks, cur.slice(0, 100));
}
export function removeAudiobook(id: string) {
  write(KEYS.audiobooks, getAudiobooks().filter((x) => x.id !== id));
}
export function isAudiobook(id: string): boolean {
  return getAudiobooks().some((x) => x.id === id);
}
export function getAudiobookProgress(id: string): number {
  const rec = read<Record<string, number>>(KEYS.audiobookProgress, {});
  return rec[id] ?? 0;
}
export function setAudiobookProgress(id: string, seconds: number) {
  const rec = read<Record<string, number>>(KEYS.audiobookProgress, {});
  if (seconds < 5) return;
  rec[id] = Math.floor(seconds);
  write(KEYS.audiobookProgress, rec);
}