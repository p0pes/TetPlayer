export interface AuthSession {
  is_authenticated: boolean;
  user_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  browser?: string;
  profile?: string;
  sapisid?: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  duration_seconds?: number;
  artwork_url?: string;
}

export interface Playlist {
  id: string;
  title: string;
  subtitle?: string;
  artwork_url?: string;
  track_count?: string;
}

export interface LyricsData {
  synced?: string | null;
  plain?: string | null;
  source: string;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface TrackStat {
  track_id: string;
  title: string;
  artist: string;
  album?: string;
  artwork_url?: string;
  play_count: number;
  last_played: number;
}

export interface ArtistStat {
  artist: string;
  play_count: number;
  track_count: number;
}

export interface PlaybackStats {
  total_plays: number;
  total_time_seconds: number;
  unique_tracks: number;
  unique_artists: number;
  top_tracks: TrackStat[];
  top_artists: ArtistStat[];
  recent_tracks: TrackStat[];
}

export type RepeatMode = "off" | "all" | "one";
export type NowPlayingTab = "queue" | "lyrics";
export type ActiveTab = "library" | "search" | "stats";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any;
  }
}
