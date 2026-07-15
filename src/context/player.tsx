import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Track, LyricLine, RepeatMode } from "@/lib/types";
import { fetchLyrics } from "@/lib/lyrics";
import {
  pushHistory,
  isAudiobook,
  getAudiobookProgress,
  setAudiobookProgress,
} from "@/lib/storage";
import { getRelated } from "@/lib/youtube";
import { getDownloadURL } from "@/lib/downloads";

// ---- YouTube IFrame API loader ----
let ytReadyPromise: Promise<typeof window.YT> | null = null;
function loadYT(): Promise<typeof window.YT> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytReadyPromise) return ytReadyPromise;
  ytReadyPromise = new Promise((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return ytReadyPromise;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type Ctx = {
  current: Track | null;
  queue: Track[];
  index: number;
  playing: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  lyrics: LyricLine[];
  lyricsPlain: string | null;
  lyricsLoaded: boolean;
  fullPlayerOpen: boolean;
  fullLyricsOpen: boolean;
  play: (t: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setFullPlayer: (v: boolean) => void;
  setFullLyrics: (v: boolean) => void;
  addToQueue: (t: Track) => void;
};

const PlayerCtx = createContext<Ctx | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modeRef = useRef<"yt" | "offline">("yt");
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState<number>(-1);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [lyricsPlain, setLyricsPlain] = useState<string | null>(null);
  const [lyricsLoaded, setLyricsLoaded] = useState(false);
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [fullLyricsOpen, setFullLyricsOpen] = useState(false);
  const readyRef = useRef(false);
  const onEndedRef = useRef<() => void>(() => {});
  const resumedRef = useRef<Set<string>>(new Set());

  // Mount hidden YT player once
  useEffect(() => {
    let cancelled = false;
    // Persistent <audio> element for offline playback.
    const audio = document.createElement("audio");
    audio.preload = "auto";
    audio.style.display = "none";
    document.body.appendChild(audio);
    audioRef.current = audio;
    audio.addEventListener("play", () => { if (modeRef.current === "offline") setPlaying(true); });
    audio.addEventListener("pause", () => { if (modeRef.current === "offline") setPlaying(false); });
    audio.addEventListener("ended", () => { if (modeRef.current === "offline") onEndedRef.current(); });
    audio.addEventListener("loadedmetadata", () => {
      if (modeRef.current === "offline") setDuration(audio.duration || 0);
    });

    const div = document.createElement("div");
    div.id = "yt-player-mount";
    div.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;pointer-events:none;opacity:0;";
    document.body.appendChild(div);
    containerRef.current = div;
    const inner = document.createElement("div");
    inner.id = "yt-player";
    div.appendChild(inner);

    loadYT().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player("yt-player", {
        height: "1",
        width: "1",
        playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => { readyRef.current = true; },
          onStateChange: (e: any) => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) setPlaying(true);
            else if (e.data === S.PAUSED) setPlaying(false);
            else if (e.data === S.ENDED) onEndedRef.current();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      audio.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // position ticker
  useEffect(() => {
    const t = setInterval(() => {
      try {
        let pos = 0, dur = 0;
        if (modeRef.current === "offline" && audioRef.current) {
          pos = audioRef.current.currentTime || 0;
          dur = audioRef.current.duration || 0;
        } else {
          const p = playerRef.current;
          if (!p?.getCurrentTime) return;
          pos = p.getCurrentTime() ?? 0;
          dur = p.getDuration() ?? 0;
        }
        setPosition(pos);
        if (dur) setDuration(dur);
        // Save audiobook progress every ~5s.
        if (current && isAudiobook(current.id) && pos > 0) {
          setAudiobookProgress(current.id, pos);
        }
      } catch { /* ignore */ }
    }, 250);
    return () => clearInterval(t);
  }, [current]);

  // Auto-resume audiobooks from last saved position.
  useEffect(() => {
    if (!current || !playing) return;
    if (!isAudiobook(current.id)) return;
    if (resumedRef.current.has(current.id)) return;
    const saved = getAudiobookProgress(current.id);
    if (saved > 5) {
      try {
        if (modeRef.current === "offline" && audioRef.current) audioRef.current.currentTime = saved;
        else playerRef.current?.seekTo(saved, true);
      } catch { /* ignore */ }
    }
    resumedRef.current.add(current.id);
  }, [current, playing]);

  // MediaSession
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      artwork: [
        { src: current.thumbnail, sizes: "512x512", type: "image/jpeg" },
      ],
    });
    navigator.mediaSession.setActionHandler("play", () => {
      if (modeRef.current === "offline") audioRef.current?.play();
      else playerRef.current?.playVideo();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      if (modeRef.current === "offline") audioRef.current?.pause();
      else playerRef.current?.pauseVideo();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    try {
      navigator.mediaSession.setActionHandler("seekto", (d: any) => {
        if (typeof d.seekTime !== "number") return;
        if (modeRef.current === "offline" && audioRef.current) audioRef.current.currentTime = d.seekTime;
        else playerRef.current?.seekTo(d.seekTime, true);
      });
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Playback state -> MediaSession
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  }, [playing]);

  // Fetch lyrics on track change
  useEffect(() => {
    if (!current) { setLyrics([]); setLyricsPlain(null); setLyricsLoaded(false); return; }
    let cancelled = false;
    setLyrics([]); setLyricsPlain(null); setLyricsLoaded(false);
    const cleanTitle = current.title.replace(/\(.*?\)|\[.*?\]|official.*|lyrics?|hd|4k|mv|music video/gi, "").trim();
    const cleanArtist = current.artist.replace(/\s*-\s*topic$/i, "").trim();
    fetchLyrics(cleanTitle, cleanArtist).then((r) => {
      if (cancelled) return;
      if (r) { setLyrics(r.synced); setLyricsPlain(r.plain); }
      setLyricsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [current]);

  const play = useCallback(async (t: Track, q?: Track[]) => {
    const newQueue = q && q.length ? q : [t];
    const idx = Math.max(0, newQueue.findIndex((x) => x.id === t.id));
    setQueue(newQueue);
    setIndex(idx);
    setCurrent(t);
    pushHistory(t);
    // Prefer offline blob when available.
    const offlineUrl = await getDownloadURL(t.id);
    if (offlineUrl && audioRef.current) {
      try { playerRef.current?.stopVideo?.(); } catch { /* ignore */ }
      modeRef.current = "offline";
      audioRef.current.src = offlineUrl;
      audioRef.current.play().catch(() => { /* ignore */ });
      return;
    }
    modeRef.current = "yt";
    try { audioRef.current?.pause(); if (audioRef.current) audioRef.current.removeAttribute("src"); } catch { /* ignore */ }
    const doPlay = () => {
      try {
        playerRef.current.loadVideoById({ videoId: t.id });
        playerRef.current.playVideo();
      } catch { /* ignore */ }
    };
    if (readyRef.current && playerRef.current?.loadVideoById) doPlay();
    else loadYT().then(() => {
      const iv = setInterval(() => {
        if (readyRef.current && playerRef.current?.loadVideoById) { clearInterval(iv); doPlay(); }
      }, 100);
      setTimeout(() => clearInterval(iv), 5000);
    });
  }, []);

  const toggle = useCallback(() => {
    if (modeRef.current === "offline" && audioRef.current) {
      if (playing) audioRef.current.pause(); else audioRef.current.play().catch(() => {});
      return;
    }
    const p = playerRef.current; if (!p) return;
    if (playing) p.pauseVideo(); else p.playVideo();
  }, [playing]);

  const seek = useCallback((t: number) => {
    if (modeRef.current === "offline" && audioRef.current) audioRef.current.currentTime = t;
    else playerRef.current?.seekTo(t, true);
    setPosition(t);
  }, []);

  const playAt = useCallback(async (i: number) => {
    if (i < 0 || i >= queue.length) return;
    const t = queue[i];
    setIndex(i);
    setCurrent(t);
    pushHistory(t);
    const offlineUrl = await getDownloadURL(t.id);
    if (offlineUrl && audioRef.current) {
      try { playerRef.current?.stopVideo?.(); } catch { /* ignore */ }
      modeRef.current = "offline";
      audioRef.current.src = offlineUrl;
      audioRef.current.play().catch(() => {});
      return;
    }
    modeRef.current = "yt";
    try { audioRef.current?.pause(); if (audioRef.current) audioRef.current.removeAttribute("src"); } catch { /* ignore */ }
    try {
      playerRef.current?.loadVideoById({ videoId: t.id });
      playerRef.current?.playVideo();
    } catch { /* ignore */ }
  }, [queue]);

  const next = useCallback(async () => {
    if (repeat === "one") { seek(0); playerRef.current?.playVideo(); return; }
    if (shuffle && queue.length > 1) {
      let n = index;
      while (n === index) n = Math.floor(Math.random() * queue.length);
      playAt(n); return;
    }
    if (index + 1 < queue.length) { playAt(index + 1); return; }
    if (repeat === "all" && queue.length) { playAt(0); return; }
    // auto-generate: fetch related to current
    if (current) {
      const rel = await getRelated(current.id);
      if (rel.length) {
        const filtered = rel.filter((r) => r.id !== current.id);
        const merged = [...queue, ...filtered];
        setQueue(merged);
        const nextIdx = queue.length; // first newly appended
        setIndex(nextIdx);
        const t = merged[nextIdx];
        setCurrent(t);
        pushHistory(t);
        try {
          playerRef.current?.loadVideoById({ videoId: t.id });
          playerRef.current?.playVideo();
        } catch { /* ignore */ }
      }
    }
  }, [repeat, shuffle, queue, index, current, playAt, seek]);

  const prev = useCallback(() => {
    if (position > 3) { seek(0); return; }
    if (index > 0) playAt(index - 1);
    else seek(0);
  }, [position, index, playAt, seek]);

  useEffect(() => { onEndedRef.current = () => { next(); }; }, [next]);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() =>
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")), []);
  const addToQueue = useCallback((t: Track) => {
    setQueue((q) => (q.some((x) => x.id === t.id) ? q : [...q, t]));
  }, []);

  const value: Ctx = useMemo(() => ({
    current, queue, index, playing, position, duration,
    shuffle, repeat, lyrics, lyricsPlain, lyricsLoaded,
    fullPlayerOpen, fullLyricsOpen,
    play, toggle, next, prev, seek, toggleShuffle, cycleRepeat,
    setFullPlayer: setFullPlayerOpen, setFullLyrics: setFullLyricsOpen, addToQueue,
  }), [current, queue, index, playing, position, duration, shuffle, repeat,
       lyrics, lyricsPlain, lyricsLoaded, fullPlayerOpen, fullLyricsOpen,
       play, toggle, next, prev, seek, toggleShuffle, cycleRepeat, addToQueue]);

  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}

export function usePlayer(): Ctx {
  const c = useContext(PlayerCtx);
  if (!c) throw new Error("usePlayer outside PlayerProvider");
  return c;
}