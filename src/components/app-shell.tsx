import { type ReactNode } from "react";
import { PlayerProvider, usePlayer } from "@/context/player";
import { BottomNav } from "./bottom-nav";
import { MiniPlayer } from "./mini-player";
import { NowPlayingSheet, FullLyricsSheet } from "./now-playing";

function Chrome({ children }: { children: ReactNode }) {
  const { current } = usePlayer();
  return (
    <div className="min-h-full bg-background text-foreground">
      <main className={`mx-auto max-w-2xl px-4 pb-40 pt-6 ${current ? "pb-56" : "pb-24"}`}>
        {children}
      </main>
      <MiniPlayer />
      <BottomNav />
      <NowPlayingSheet />
      <FullLyricsSheet />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <PlayerProvider>
      <Chrome>{children}</Chrome>
    </PlayerProvider>
  );
}