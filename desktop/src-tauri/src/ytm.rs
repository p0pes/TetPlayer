use crate::auth::{generate_sapisid_hash, AuthSession};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE, COOKIE, ORIGIN, REFERER, USER_AGENT};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<String>,
    pub duration_seconds: Option<u64>,
    pub artwork_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub artwork_url: Option<String>,
    pub track_count: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamInfo {
    pub video_id: String,
    pub title: String,
    pub artist: String,
    pub artwork_url: Option<String>,
    pub stream_url: String,
    pub duration_seconds: Option<u64>,
    pub bitrate: Option<u64>,
    pub mime_type: Option<String>,
}

fn build_headers(session: &AuthSession, client_name: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        ORIGIN,
        HeaderValue::from_static("https://music.youtube.com"),
    );
    headers.insert(
        REFERER,
        HeaderValue::from_static("https://music.youtube.com/"),
    );

    let user_agent = if client_name == "ANDROID_MUSIC" {
        "com.google.android.apps.youtube.music/6.20.51 (Linux; U; Android 13; pt_BR; Pixel 7)"
    } else {
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"
    };
    headers.insert(USER_AGENT, HeaderValue::from_str(user_agent).unwrap());

    if session.is_authenticated {
        if !session.cookie_header.is_empty() {
            if let Ok(val) = HeaderValue::from_str(&session.cookie_header) {
                headers.insert(COOKIE, val);
            }
        }
        if let Some(sapisid) = &session.sapisid {
            let hash = generate_sapisid_hash(sapisid, "https://music.youtube.com");
            if let Ok(val) = HeaderValue::from_str(&hash) {
                headers.insert(AUTHORIZATION, val);
            }
        }
    }

    headers
}

pub async fn search_music(session: &AuthSession, query: &str) -> Result<Vec<Track>, String> {
    let client = reqwest::Client::new();
    let url = "https://music.youtube.com/youtubei/v1/search?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let payload = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "pt",
                "gl": "BR"
            }
        },
        "query": query
    });

    let resp = client
        .post(url)
        .headers(headers)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Erro na requisição de busca: {e}"))?;

    let json_val: Value = resp
        .json()
        .await
        .map_err(|e| format!("Erro ao parsear resposta da busca: {e}"))?;

    let mut tracks = Vec::new();
    extract_tracks_from_value(&json_val, &mut tracks);

    let mut seen = std::collections::HashSet::new();
    tracks.retain(|t| seen.insert(t.id.clone()));

    Ok(tracks)
}

pub async fn get_home_recommendations(session: &AuthSession) -> Result<Vec<Track>, String> {
    let client = reqwest::Client::new();
    let url = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let payload = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "pt",
                "gl": "BR"
            }
        },
        "browseId": "FEmusic_home"
    });

    let resp = client
        .post(url)
        .headers(headers)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Erro ao carregar página inicial: {e}"))?;

    let json_val: Value = resp
        .json()
        .await
        .map_err(|e| format!("Erro no parse da página inicial: {e}"))?;

    let mut tracks = Vec::new();
    extract_tracks_from_value(&json_val, &mut tracks);

    let mut seen = std::collections::HashSet::new();
    tracks.retain(|t| seen.insert(t.id.clone()));

    if tracks.is_empty() {
        return search_music(session, "top hits").await;
    }

    Ok(tracks)
}

pub async fn get_user_playlists(session: &AuthSession) -> Result<Vec<Playlist>, String> {
    let client = reqwest::Client::new();
    let url = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let mut playlists = Vec::new();

    // 1. Sempre adiciona o item fixo de Músicas Curtidas
    playlists.push(Playlist {
        id: "VLLM".to_string(),
        title: "🔥 Músicas Curtidas".to_string(),
        subtitle: Some("Sua coleção automática do YouTube Music".to_string()),
        artwork_url: None,
        track_count: None,
    });

    // 2. Busca na Home as playlists do usuário (carrossel 'Ouvir de novo' ou playlists)
    let payload = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "pt",
                "gl": "BR"
            }
        },
        "browseId": "FEmusic_home"
    });

    if let Ok(resp) = client.post(url).headers(headers.clone()).json(&payload).send().await {
        if let Ok(json_val) = resp.json::<Value>().await {
            extract_playlists_from_value(&json_val, &mut playlists);
        }
    }

    // Deduplica mantendo a ordem
    let mut seen = std::collections::HashSet::new();
    playlists.retain(|p| seen.insert(p.id.clone()));

    Ok(playlists)
}

pub async fn get_playlist_tracks(session: &AuthSession, playlist_id: &str) -> Result<Vec<Track>, String> {
    let client = reqwest::Client::new();
    let url = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let browse_id = if playlist_id.starts_with("VL") || playlist_id.starts_with("FE") {
        playlist_id.to_string()
    } else {
        format!("VL{playlist_id}")
    };

    let payload = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "pt",
                "gl": "BR"
            }
        },
        "browseId": browse_id
    });

    let resp = client
        .post(url)
        .headers(headers)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Erro ao carregar faixas da playlist: {e}"))?;

    let json_val: Value = resp
        .json()
        .await
        .map_err(|e| format!("Erro ao parsear resposta da playlist: {e}"))?;

    let mut tracks = Vec::new();
    extract_tracks_from_value(&json_val, &mut tracks);

    let mut seen = std::collections::HashSet::new();
    tracks.retain(|t| seen.insert(t.id.clone()));

    Ok(tracks)
}

fn extract_playlists_from_value(val: &Value, playlists: &mut Vec<Playlist>) {
    match val {
        Value::Object(map) => {
            if let Some(item) = map.get("musicTwoRowItemRenderer") {
                if let Some(pl) = parse_playlist_two_row(item) {
                    playlists.push(pl);
                }
            }

            for v in map.values() {
                extract_playlists_from_value(v, playlists);
            }
        }
        Value::Array(arr) => {
            for v in arr {
                extract_playlists_from_value(v, playlists);
            }
        }
        _ => {}
    }
}

fn parse_playlist_two_row(item: &Value) -> Option<Playlist> {
    let nav = &item["navigationEndpoint"];
    let browse_id = nav["browseEndpoint"]["browseId"].as_str()
        .or_else(|| nav["watchEndpoint"]["playlistId"].as_str())?;

    // Considera apenas se for uma playlist (VL...)
    if !browse_id.starts_with("VL") && !browse_id.starts_with("PL") && !browse_id.starts_with("RD") {
        return None;
    }

    let title = item["title"]["runs"]
        .as_array()
        .and_then(|r| r.first())
        .and_then(|t| t["text"].as_str())
        .unwrap_or("Playlist")
        .to_string();

    let subtitle = item["subtitle"]["runs"]
        .as_array()
        .map(|runs| {
            runs.iter()
                .filter_map(|r| r["text"].as_str())
                .collect::<Vec<_>>()
                .join(" ")
        });

    let artwork_url = item["thumbnailRenderer"]["musicThumbnailRenderer"]["thumbnail"]["thumbnails"]
        .as_array()
        .and_then(|arr| arr.last())
        .and_then(|t| t["url"].as_str())
        .map(|s| s.to_string());

    Some(Playlist {
        id: browse_id.to_string(),
        title,
        subtitle,
        artwork_url,
        track_count: None,
    })
}

fn extract_tracks_from_value(val: &Value, tracks: &mut Vec<Track>) {
    match val {
        Value::Object(map) => {
            if let Some(item) = map.get("musicResponsiveListItemRenderer") {
                if let Some(track) = parse_responsive_item(item) {
                    tracks.push(track);
                }
            } else if let Some(item) = map.get("musicTwoRowItemRenderer") {
                if let Some(track) = parse_two_row_item(item) {
                    tracks.push(track);
                }
            }

            for v in map.values() {
                extract_tracks_from_value(v, tracks);
            }
        }
        Value::Array(arr) => {
            for v in arr {
                extract_tracks_from_value(v, tracks);
            }
        }
        _ => {}
    }
}

fn parse_responsive_item(item: &Value) -> Option<Track> {
    let video_id = item["playlistItemData"]["videoId"]
        .as_str()
        .or_else(|| {
            item["overlay"]["musicItemThumbnailOverlayRenderer"]["content"]["musicPlayButtonRenderer"]["playNavigationEndpoint"]["watchEndpoint"]["videoId"].as_str()
        })
        .or_else(|| {
            item["menu"]["menuRenderer"]["topLevelButtons"]
                .as_array()
                .and_then(|arr| arr.first())
                .and_then(|b| b["likeButtonRenderer"]["target"]["videoId"].as_str())
        })?
        .to_string();

    let flex_columns = item["flexColumns"].as_array()?;
    if flex_columns.is_empty() {
        return None;
    }

    let title = flex_columns[0]["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"]
        .as_array()
        .and_then(|runs| runs.first())
        .and_then(|r| r["text"].as_str())
        .unwrap_or("Música")
        .to_string();

    let mut artist = "Artista".to_string();
    let mut album = None;
    let mut duration = None;

    if flex_columns.len() > 1 {
        if let Some(runs) = flex_columns[1]["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"].as_array() {
            let texts: Vec<&str> = runs.iter().filter_map(|r| r["text"].as_str()).collect();
            if let Some(first) = texts.first() {
                artist = first.to_string();
            }
            if texts.len() > 2 {
                album = Some(texts[2].to_string());
            }
            if let Some(last) = texts.last() {
                if last.contains(':') {
                    duration = Some(last.to_string());
                }
            }
        }
    }

    let artwork_url = item["thumbnail"]["musicThumbnailRenderer"]["thumbnail"]["thumbnails"]
        .as_array()
        .and_then(|arr| arr.last())
        .and_then(|t| t["url"].as_str())
        .map(|s| s.to_string());

    Some(Track {
        id: video_id,
        title,
        artist,
        album,
        duration,
        duration_seconds: None,
        artwork_url,
    })
}

fn parse_two_row_item(item: &Value) -> Option<Track> {
    let nav_endpoint = &item["navigationEndpoint"]["watchEndpoint"];
    let video_id = nav_endpoint["videoId"].as_str()?.to_string();

    let title = item["title"]["runs"]
        .as_array()
        .and_then(|runs| runs.first())
        .and_then(|r| r["text"].as_str())
        .unwrap_or("Música")
        .to_string();

    let artist = item["subtitle"]["runs"]
        .as_array()
        .and_then(|runs| runs.first())
        .and_then(|r| r["text"].as_str())
        .unwrap_or("Artista")
        .to_string();

    let artwork_url = item["thumbnailRenderer"]["musicThumbnailRenderer"]["thumbnail"]["thumbnails"]
        .as_array()
        .and_then(|arr| arr.last())
        .and_then(|t| t["url"].as_str())
        .map(|s| s.to_string());

    Some(Track {
        id: video_id,
        title,
        artist,
        album: None,
        duration: None,
        duration_seconds: None,
        artwork_url,
    })
}
