use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackStat {
    pub track_id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub artwork_url: Option<String>,
    pub play_count: i64,
    pub last_played: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistStat {
    pub artist: String,
    pub play_count: i64,
    pub track_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackStats {
    pub total_plays: i64,
    pub total_time_seconds: i64,
    pub unique_tracks: i64,
    pub unique_artists: i64,
    pub top_tracks: Vec<TrackStat>,
    pub top_artists: Vec<ArtistStat>,
    pub recent_tracks: Vec<TrackStat>,
}

fn get_db_path() -> PathBuf {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let dir = PathBuf::from(local_app_data).join("com.tetplayer.desktop");
        let _ = fs::create_dir_all(&dir);
        return dir.join("tetstats.db");
    }
    PathBuf::from("tetstats.db")
}

pub fn init_db() -> Result<Connection, String> {
    let path = get_db_path();
    let conn = Connection::open(&path)
        .map_err(|e| format!("Falha ao abrir banco de estatísticas ({:?}): {e}", path))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS playback_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id TEXT NOT NULL,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT,
            duration_seconds INTEGER,
            artwork_url TEXT,
            listened_at INTEGER NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Falha ao criar tabela playback_history: {e}"))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_history_track ON playback_history (track_id)",
        [],
    )
    .map_err(|e| format!("Falha ao criar índice por faixa: {e}"))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_history_artist ON playback_history (artist)",
        [],
    )
    .map_err(|e| format!("Falha ao criar índice por artista: {e}"))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_history_time ON playback_history (listened_at)",
        [],
    )
    .map_err(|e| format!("Falha ao criar índice por data: {e}"))?;

    Ok(conn)
}

pub fn record_track(
    track_id: &str,
    title: &str,
    artist: &str,
    album: Option<&str>,
    duration_seconds: Option<u64>,
    artwork_url: Option<&str>,
) -> Result<(), String> {
    let conn = init_db()?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO playback_history (track_id, title, artist, album, duration_seconds, artwork_url, listened_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            track_id,
            title,
            artist,
            album,
            duration_seconds.map(|d| d as i64),
            artwork_url,
            now
        ],
    )
    .map_err(|e| format!("Erro ao registrar reprodução: {e}"))?;

    Ok(())
}

pub fn query_stats(timeframe_days: Option<i64>) -> Result<PlaybackStats, String> {
    let conn = init_db()?;

    let min_timestamp = match timeframe_days {
        Some(days) if days > 0 => {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;
            now - (days * 86400)
        }
        _ => 0,
    };

    // 1. Total plays & Total time
    let mut stmt = conn
        .prepare(
            "SELECT COUNT(*), COALESCE(SUM(COALESCE(duration_seconds, 180)), 0), COUNT(DISTINCT track_id), COUNT(DISTINCT artist)
             FROM playback_history
             WHERE listened_at >= ?1",
        )
        .map_err(|e| format!("Erro na query de totais: {e}"))?;

    let (total_plays, total_time_seconds, unique_tracks, unique_artists): (i64, i64, i64, i64) = stmt
        .query_row(params![min_timestamp], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })
        .unwrap_or((0, 0, 0, 0));

    // 2. Top Tracks
    let mut track_stmt = conn
        .prepare(
            "SELECT track_id, title, artist, album, artwork_url, COUNT(*) as play_count, MAX(listened_at) as last_played
             FROM playback_history
             WHERE listened_at >= ?1
             GROUP BY track_id
             ORDER BY play_count DESC, last_played DESC
             LIMIT 15",
        )
        .map_err(|e| format!("Erro na query de top faixas: {e}"))?;

    let top_tracks = track_stmt
        .query_map(params![min_timestamp], |row| {
            Ok(TrackStat {
                track_id: row.get(0)?,
                title: row.get(1)?,
                artist: row.get(2)?,
                album: row.get(3)?,
                artwork_url: row.get(4)?,
                play_count: row.get(5)?,
                last_played: row.get(6)?,
            })
        })
        .map_err(|e| format!("Erro ao mapear top faixas: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    // 3. Top Artists
    let mut artist_stmt = conn
        .prepare(
            "SELECT artist, COUNT(*) as play_count, COUNT(DISTINCT track_id) as track_count
             FROM playback_history
             WHERE listened_at >= ?1
             GROUP BY artist
             ORDER BY play_count DESC
             LIMIT 10",
        )
        .map_err(|e| format!("Erro na query de top artistas: {e}"))?;

    let top_artists = artist_stmt
        .query_map(params![min_timestamp], |row| {
            Ok(ArtistStat {
                artist: row.get(0)?,
                play_count: row.get(1)?,
                track_count: row.get(2)?,
            })
        })
        .map_err(|e| format!("Erro ao mapear top artistas: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    // 4. Recent Tracks
    let mut recent_stmt = conn
        .prepare(
            "SELECT track_id, title, artist, album, artwork_url, 1, listened_at
             FROM playback_history
             ORDER BY listened_at DESC
             LIMIT 15",
        )
        .map_err(|e| format!("Erro na query de faixas recentes: {e}"))?;

    let recent_tracks = recent_stmt
        .query_map([], |row| {
            Ok(TrackStat {
                track_id: row.get(0)?,
                title: row.get(1)?,
                artist: row.get(2)?,
                album: row.get(3)?,
                artwork_url: row.get(4)?,
                play_count: row.get(5)?,
                last_played: row.get(6)?,
            })
        })
        .map_err(|e| format!("Erro ao mapear faixas recentes: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(PlaybackStats {
        total_plays,
        total_time_seconds,
        unique_tracks,
        unique_artists,
        top_tracks,
        top_artists,
        recent_tracks,
    })
}

pub fn clear_stats() -> Result<(), String> {
    let conn = init_db()?;
    conn.execute("DELETE FROM playback_history", [])
        .map_err(|e| format!("Erro ao limpar estatísticas: {e}"))?;
    Ok(())
}
