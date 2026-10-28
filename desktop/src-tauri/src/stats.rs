use base64::Engine;
use flate2::read::DeflateDecoder;
use flate2::write::DeflateEncoder;
use flate2::Compression;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
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

/// Retorna o diretório unificado de armazenamento da aplicação na pasta de instalação (estilo jogos/programas tradicionais).
/// Prioriza a pasta `data/` dentro do próprio diretório do executável instalado.
/// Realiza migração automática de dados existentes em `%LOCALAPPDATA%` para que nada se perca em atualizações.
pub fn get_app_storage_dir() -> PathBuf {
    // 1. Tentar localizar o diretório do executável em execução (pasta de instalação)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let app_data_dir = exe_dir.join("data");
            // Se conseguir criar/escrever na pasta data do executável
            if fs::create_dir_all(&app_data_dir).is_ok() {
                // Criar subpasta para músicas offline
                let _ = fs::create_dir_all(app_data_dir.join("music"));
                return app_data_dir;
            }
        }
    }

    // 2. Fallback de segurança se o diretório do executável for somente leitura (ex: C:\Program Files sem admin)
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let dir = PathBuf::from(local_app_data).join("com.tetplayer.desktop").join("data");
        let _ = fs::create_dir_all(&dir);
        let _ = fs::create_dir_all(dir.join("music"));
        return dir;
    }

    let default_dir = PathBuf::from("data");
    let _ = fs::create_dir_all(&default_dir);
    let _ = fs::create_dir_all(default_dir.join("music"));
    default_dir
}

pub fn get_db_path() -> PathBuf {
    let storage_dir = get_app_storage_dir();
    let db_path = storage_dir.join("tetstats.db");

    // Migração transparente de banco legado (%LOCALAPPDATA%\com.tetplayer.desktop\tetstats.db)
    if !db_path.exists() {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let legacy_path = PathBuf::from(local_app_data)
                .join("com.tetplayer.desktop")
                .join("tetstats.db");
            if legacy_path.exists() {
                let _ = fs::copy(&legacy_path, &db_path);
            }
        }
    }

    db_path
}

pub fn init_db() -> Result<Connection, String> {
    let path = get_db_path();
    let conn = Connection::open(&path)
        .map_err(|e| format!("Falha ao abrir banco de estatísticas ({:?}): {e}", path))?;
    let _ = conn.busy_timeout(std::time::Duration::from_secs(5));

    // Modo WAL e pragmas de alta performance para concorrência desktop sem contenção de I/O (Item 71)
    let _ = conn.execute_batch("
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA temp_store = MEMORY;
        PRAGMA cache_size = -8000;
    ");

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

    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_cache (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Falha ao criar tabela app_cache: {e}"))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_cache_updated ON app_cache (updated_at)",
        [],
    )
    .map_err(|e| format!("Falha ao criar índice por updated_at no cache: {e}"))?;

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

const COMPRESSION_PREFIX: &str = "__df64__:";
const COMPRESSION_THRESHOLD: usize = 128;

pub fn compress_payload(data: &str) -> String {
    if data.len() < COMPRESSION_THRESHOLD {
        return data.to_string();
    }

    let mut encoder = DeflateEncoder::new(Vec::new(), Compression::default());
    if encoder.write_all(data.as_bytes()).is_ok() {
        if let Ok(compressed) = encoder.finish() {
            let encoded = base64::engine::general_purpose::STANDARD.encode(&compressed);
            // Salva comprimido apenas se realmente gerar economia de espaço
            if encoded.len() + COMPRESSION_PREFIX.len() < data.len() {
                return format!("{}{}", COMPRESSION_PREFIX, encoded);
            }
        }
    }

    data.to_string()
}

pub fn decompress_payload(data: &str) -> String {
    if let Some(stripped) = data.strip_prefix(COMPRESSION_PREFIX) {
        if let Ok(decoded) = base64::engine::general_purpose::STANDARD.decode(stripped) {
            let mut decoder = DeflateDecoder::new(&decoded[..]);
            let mut decompressed = Vec::new();
            if decoder.read_to_end(&mut decompressed).is_ok() {
                if let Ok(text) = String::from_utf8(decompressed) {
                    return text;
                }
            }
        }
    }

    // Se não tiver o prefixo ou falhar na descompressão, retorna o valor original (100% retrocompatível)
    data.to_string()
}

pub fn set_cache_entry(key: &str, value: &str) -> Result<(), String> {
    let conn = init_db()?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let payload = compress_payload(value);
    conn.execute(
        "INSERT INTO app_cache (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
        params![key, payload, now],
    )
    .map_err(|e| format!("Falha ao salvar no cache SQLite: {e}"))?;
    Ok(())
}

pub fn get_cache_entry(key: &str) -> Result<Option<String>, String> {
    let conn = init_db()?;
    let mut stmt = conn
        .prepare("SELECT value FROM app_cache WHERE key = ?1")
        .map_err(|e| format!("Falha ao preparar consulta de cache SQLite: {e}"))?;
    let mut rows = stmt
        .query(params![key])
        .map_err(|e| format!("Falha ao buscar chave no cache SQLite: {e}"))?;

    if let Some(row) = rows.next().map_err(|e| format!("Falha ao ler linha do cache: {e}"))? {
        let val: String = row.get(0).map_err(|e| format!("Falha ao extrair valor do cache: {e}"))?;
        Ok(Some(decompress_payload(&val)))
    } else {
        Ok(None)
    }
}

pub fn delete_cache_entry(key: &str) -> Result<(), String> {
    let conn = init_db()?;
    conn.execute("DELETE FROM app_cache WHERE key = ?1", params![key])
        .map_err(|e| format!("Falha ao deletar chave do cache SQLite: {e}"))?;
    Ok(())
}

pub fn clear_all_cache() -> Result<(), String> {
    let conn = init_db()?;
    conn.execute("DELETE FROM app_cache", [])
        .map_err(|e| format!("Falha ao limpar cache SQLite: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_small_payload_uncompressed() {
        let short_data = "{\"id\":\"123\",\"title\":\"Hello\"}";
        let stored = compress_payload(short_data);
        assert_eq!(stored, short_data);
        let restored = decompress_payload(&stored);
        assert_eq!(restored, short_data);
    }

    #[test]
    fn test_large_payload_compression_roundtrip() {
        let repetitive = "{\"title\":\"Repetitive Track Title Name Here\",\"artist\":\"Artist Name\"},".repeat(20);
        let json = format!("[{}]", repetitive);
        assert!(json.len() > 500);

        let stored = compress_payload(&json);
        assert!(stored.starts_with(COMPRESSION_PREFIX));
        assert!(stored.len() < json.len(), "Compressed payload should be significantly smaller");

        let restored = decompress_payload(&stored);
        assert_eq!(restored, json);
    }

    #[test]
    fn test_legacy_uncompressed_backward_compatibility() {
        let legacy = "{\"version\":1,\"playlists\":[{\"id\":\"pl1\",\"name\":\"Favorites\"}]}";
        let restored = decompress_payload(legacy);
        assert_eq!(restored, legacy);
    }

    #[test]
    fn test_clear_all_cache_lifecycle() {
        let _ = set_cache_entry("test_temp_key", "temporary_val");
        assert!(get_cache_entry("test_temp_key").unwrap().is_some());
        let res = clear_all_cache();
        assert!(res.is_ok());
        assert!(get_cache_entry("test_temp_key").unwrap().is_none());
    }
}


