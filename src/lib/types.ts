export type Track = {
  id: string; // youtube video id
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number; // seconds
};

export type Playlist = {
  id: string;
  name: string;
  createdAt: number;
  tracks: Track[];
  cover?: string;
};

export type LyricLine = { time: number; text: string };

export type RepeatMode = "off" | "all" | "one";

export type Artist = {
  name: string;
  playCount: number;
  thumbnail?: string;
};
