import type { LyricLine } from "./types";

export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const re = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/;
  for (const raw of lrc.split(/\r?\n/)) {
    const m = raw.match(re);
    if (!m) continue;
    const min = parseInt(m[1], 10);
    const sec = parseFloat(m[2]);
    const text = m[3].trim();
    if (!text) continue;
    lines.push({ time: min * 60 + sec, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

export async function fetchLyrics(
  title: string,
  artist: string,
): Promise<{ synced: LyricLine[]; plain: string | null } | null> {
  try {
    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
      title,
    )}&artist_name=${encodeURIComponent(artist)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.syncedLyrics) return { synced: parseLRC(data.syncedLyrics), plain: data.plainLyrics ?? null };
      if (data?.plainLyrics) return { synced: [], plain: data.plainLyrics };
    }
  } catch { /* fall through */ }
  // fallback: search
  try {
    const clean = title.replace(/\(.*?\)|\[.*?\]|official.*|lyrics?|hd|4k|mv/gi, "").trim();
    const res = await fetch(
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(clean)}&artist_name=${encodeURIComponent(artist)}`,
    );
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const best = arr.find((r: any) => r.syncedLyrics) ?? arr[0];
    if (best.syncedLyrics) return { synced: parseLRC(best.syncedLyrics), plain: best.plainLyrics ?? null };
    if (best.plainLyrics) return { synced: [], plain: best.plainLyrics };
    return null;
  } catch {
    return null;
  }
}

export function currentLyricIndex(lines: LyricLine[], time: number): number {
  if (!lines.length) return -1;
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}