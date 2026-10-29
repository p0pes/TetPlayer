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
  artist_id?: string;
  album?: string;
  album_id?: string;
  duration?: string;
  duration_seconds?: number;
  artwork_url?: string;
  set_video_id?: string;
}

export interface ArtistDetail {
  id: string;
  name: string;
  description?: string;
  subscribers?: string;
  monthly_listeners?: string;
  artwork_url?: string;
  tracks: Track[];
  albums: Album[];
}

export type AlbumType = "album" | "single" | "ep";

export interface Album {
  id: string;
  title: string;
  artist: string;
  artist_id?: string;
  year?: string;
  artwork_url?: string;
  track_count?: number;
  duration_text?: string;
  album_type?: AlbumType;
}

export interface AlbumDetail extends Album {
  description?: string;
  release_date?: string;
  copyright?: string;
  tracks: Track[];
  related_albums?: Album[];
}

export interface Playlist {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
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
