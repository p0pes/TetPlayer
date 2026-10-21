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
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
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

    // Remove duplicatas mantendo a ordem
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

    // Se a home vier vazia (ex: sem autenticação), busca uma lista padrão popular
    if tracks.is_empty() {
        return search_music(session, "top hits").await;
    }

    Ok(tracks)
}

pub async fn get_audio_stream(session: &AuthSession, video_id: &str) -> Result<StreamInfo, String> {
    let client = reqwest::Client::new();
    let url = "https://music.youtube.com/youtubei/v1/player?prettyPrint=false";

    // Primeiro tenta com ANDROID_MUSIC (costuma entregar stream URLs diretas sem cipher)
    let headers = build_headers(session, "ANDROID_MUSIC");
    let payload = json!({
        "context": {
            "client": {
                "clientName": "ANDROID_MUSIC",
                "clientVersion": "6.20.51",
                "androidSdkVersion": 33,
                "hl": "pt",
                "gl": "BR"
            }
        },
        "videoId": video_id
    });

    let resp = client
        .post(url)
        .headers(headers)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Erro na chamada do player: {e}"))?;

    let json_val: Value = resp
        .json()
        .await
        .map_err(|e| format!("Erro ao parsear resposta do player: {e}"))?;

    let video_details = &json_val["videoDetails"];
    let title = video_details["title"].as_str().unwrap_or("Desconhecido").to_string();
    let artist = video_details["author"].as_str().unwrap_or("Artista Desconhecido").to_string();
    let duration_seconds = video_details["lengthSeconds"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok());

    let artwork_url = video_details["thumbnail"]["thumbnails"]
        .as_array()
        .and_then(|arr| arr.last())
        .and_then(|t| t["url"].as_str())
        .map(|s| s.to_string());

    let adaptive_formats = json_val["streamingData"]["adaptiveFormats"]
        .as_array()
        .ok_or_else(|| {
            let playability = &json_val["playabilityStatus"]["status"];
            format!("Streams de áudio não disponíveis. Status: {playability}")
        })?;

    // Filtra apenas formatos de áudio com URL direta
    let mut audio_formats: Vec<&Value> = adaptive_formats
        .iter()
        .filter(|f| {
            let mime = f["mimeType"].as_str().unwrap_or("");
            mime.starts_with("audio/") && f["url"].as_str().is_some()
        })
        .collect();

    // Ordena pelo maior bitrate
    audio_formats.sort_by(|a, b| {
        let bit_a = a["bitrate"].as_u64().unwrap_or(0);
        let bit_b = b["bitrate"].as_u64().unwrap_or(0);
        bit_b.cmp(&bit_a)
    });

    let chosen = audio_formats
        .first()
        .ok_or_else(|| "Nenhum stream de áudio com URL direta encontrado para esta música".to_string())?;

    let stream_url = chosen["url"]
        .as_str()
        .ok_or_else(|| "URL do stream vazia".to_string())?
        .to_string();

    let bitrate = chosen["bitrate"].as_u64();
    let mime_type = chosen["mimeType"].as_str().map(|s| s.to_string());

    Ok(StreamInfo {
        video_id: video_id.to_string(),
        title,
        artist,
        artwork_url,
        stream_url,
        duration_seconds,
        bitrate,
        mime_type,
    })
}

fn extract_tracks_from_value(val: &Value, tracks: &mut Vec<Track>) {
    match val {
        Value::Object(map) => {
            // musicResponsiveListItemRenderer é o item padrão de música no YouTube Music
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
    // Extrai o videoId
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

    // Coluna 1: Título
    let title = flex_columns[0]["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"]
        .as_array()
        .and_then(|runs| runs.first())
        .and_then(|r| r["text"].as_str())
        .unwrap_or("Música")
        .to_string();

    // Coluna 2: Artista / Duração
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

    // Thumbnail / Artwork
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
