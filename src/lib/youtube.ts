import type { Track } from "./types";

// Public Piped instances (fallback in order). No API key needed.
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.reallyaweso.me",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.adminforge.de",
  "https://api.piped.private.coffee",
];

async function pipedFetch(path: string): Promise<any> {
  let lastErr: unknown;
  for (const base of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(base + path, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`${base} ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("All Piped instances failed");
}

function extractId(url: string): string {
  const m = url.match(/[?&]v=([^&]+)/) ?? url.match(/\/watch\/([^?&]+)/);
  return m ? m[1] : url.replace(/^\/?watch\?v=/, "");
}

function ytThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function mapItem(it: any): Track | null {
  if (!it?.url || it.type === "channel" || it.type === "playlist") return null;
  const id = extractId(it.url);
  if (!id) return null;
  return {
    id,
    title: it.title ?? "Unknown",
    artist: it.uploaderName ?? "Unknown Artist",
    thumbnail: it.thumbnail || ytThumb(id),
    duration: typeof it.duration === "number" && it.duration > 0 ? it.duration : undefined,
  };
}

export async function searchTracks(query: string): Promise<Track[]> {
  if (!query.trim()) return [];
  const data = await pipedFetch(
    `/search?q=${encodeURIComponent(query)}&filter=music_songs`,
  );
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  return items.map(mapItem).filter((t): t is Track => !!t).slice(0, 30);
}

// Search for videos generally (used for audiobooks / long-form content).
export async function searchVideos(query: string): Promise<Track[]> {
  if (!query.trim()) return [];
  const data = await pipedFetch(
    `/search?q=${encodeURIComponent(query)}&filter=videos`,
  );
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  return items
    .map(mapItem)
    .filter((t): t is Track => !!t)
    .slice(0, 30);
}

export async function trending(region = "US"): Promise<Track[]> {
  try {
    // Prefer music-song results so trending isn't dominated by news / general clips.
    const songs = await searchTracks("top hits this week");
    if (songs.length) return songs;
    const data = await pipedFetch(`/trending?region=${region}`);
    const items: any[] = Array.isArray(data) ? data : [];
    return items.map(mapItem).filter((t): t is Track => !!t).slice(0, 20);
  } catch {
    return [];
  }
}

export async function getRelated(videoId: string): Promise<Track[]> {
  try {
    const data = await pipedFetch(`/streams/${videoId}`);
    const rel: any[] = Array.isArray(data?.relatedStreams) ? data.relatedStreams : [];
    return rel.map(mapItem).filter((t): t is Track => !!t).slice(0, 20);
  } catch {
    return [];
  }
}

// ---- Streams (audio URLs + chapters) ----
export type AudioStream = {
  url: string;
  quality: string;        // e.g. "128 kbps"
  bitrate: number;        // bits per second
  mimeType: string;       // e.g. "audio/mp4"
  codec?: string;
};
export type Chapter = { title: string; start: number; image?: string };
export type StreamInfo = {
  audioStreams: AudioStream[];
  chapters: Chapter[];
  duration: number;
};

export async function getStreamInfo(videoId: string): Promise<StreamInfo> {
  const data = await pipedFetch(`/streams/${videoId}`);
  const audio: AudioStream[] = (Array.isArray(data?.audioStreams) ? data.audioStreams : [])
    .map((s: any) => ({
      url: String(s.url ?? ""),
      quality: String(s.quality ?? `${Math.round((s.bitrate ?? 0) / 1000)} kbps`),
      bitrate: Number(s.bitrate ?? 0),
      mimeType: String(s.mimeType ?? "audio/mp4"),
      codec: s.codec,
    }))
    .filter((s: AudioStream) => !!s.url)
    .sort((a: AudioStream, b: AudioStream) => a.bitrate - b.bitrate);
  const chapters: Chapter[] = (Array.isArray(data?.chapters) ? data.chapters : [])
    .map((c: any) => ({
      title: String(c.title ?? "Chapter"),
      start: Number(c.start ?? 0),
      image: c.image,
    }))
    .sort((a: Chapter, b: Chapter) => a.start - b.start);
  return { audioStreams: audio, chapters, duration: Number(data?.duration ?? 0) };
}

export { ytThumb };