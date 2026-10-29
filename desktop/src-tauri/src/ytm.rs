use crate::auth::{generate_sapisid_hash, AuthSession};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE, COOKIE, ORIGIN, REFERER, USER_AGENT};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::LazyLock;
use std::time::Duration;

pub static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .connect_timeout(Duration::from_secs(6))
        .tcp_keepalive(Some(Duration::from_secs(30)))
        .pool_max_idle_per_host(8)
        .build()
        .expect("Falha ao inicializar HTTP client do TetPlayer")
});


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub title: String,
    pub artist: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artist_id: Option<String>,
    pub album: Option<String>,
    pub album_id: Option<String>,
    pub duration: Option<String>,
    pub duration_seconds: Option<u64>,
    pub artwork_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub set_video_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistDetail {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub subscribers: Option<String>,
    pub monthly_listeners: Option<String>,
    pub artwork_url: Option<String>,
    pub tracks: Vec<Track>,
    pub albums: Vec<Album>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Album {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub artist_id: Option<String>,
    pub year: Option<String>,
    pub artwork_url: Option<String>,
    pub track_count: Option<u32>,
    pub duration_text: Option<String>,
    pub album_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumDetail {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub artist_id: Option<String>,
    pub year: Option<String>,
    pub artwork_url: Option<String>,
    pub track_count: Option<u32>,
    pub duration_text: Option<String>,
    pub album_type: Option<String>,
    pub description: Option<String>,
    pub release_date: Option<String>,
    pub copyright: Option<String>,
    pub tracks: Vec<Track>,
    pub related_albums: Vec<Album>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricsData {
    pub synced: Option<String>,
    pub plain: Option<String>,
    pub source: String,
}

fn build_headers(session: &AuthSession, client_name: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        ORIGIN,
        HeaderValue::from_static("https://music.youtube.com"),
    );
    headers.insert(
        HeaderName::from_static("x-origin"),
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
        if let Some(auth_user) = &session.auth_user {
            if let Ok(val) = HeaderValue::from_str(auth_user) {
                headers.insert(HeaderName::from_static("x-goog-authuser"), val);
            }
        }
        if !session.cookie_header.is_empty() {
            // Filtro defensivo: descarta cookies não essenciais para evitar cabeçalhos > 8KB e HTTP 413
            let clean_cookie: String = session
                .cookie_header
                .split("; ")
                .filter_map(|part| {
                    let mut kv = part.splitn(2, '=');
                    let k = kv.next()?;
                    let v = kv.next()?;
                    if crate::auth::is_relevant_youtube_cookie(k) && crate::auth::is_valid_cookie_val(v) {
                        Some(format!("{k}={v}"))
                    } else {
                        None
                    }
                })
                .collect::<Vec<_>>()
                .join("; ");

            let cookie_to_use = if clean_cookie.is_empty() {
                &session.cookie_header
            } else {
                &clean_cookie
            };

            if let Ok(val) = HeaderValue::from_str(cookie_to_use) {
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
    let client = &HTTP_CLIENT;
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

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("YouTube Music retornou status {status} na busca"));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| format!("Erro ao ler corpo da busca: {e}"))?;

    let json_val: Value = serde_json::from_str(&text)
        .map_err(|e| format!("Erro ao parsear resposta da busca: {e}"))?;

    let mut tracks = Vec::new();
    extract_tracks_from_value(&json_val, &mut tracks);

    let mut seen = std::collections::HashSet::new();
    tracks.retain(|t| {
        let key = t.set_video_id.clone().unwrap_or_else(|| t.id.clone());
        seen.insert(key)
    });

    Ok(tracks)
}

pub async fn get_home_recommendations(session: &AuthSession) -> Result<Vec<Track>, String> {
    let client = &HTTP_CLIENT;
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

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("YouTube Music retornou status {status} na página inicial"));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| format!("Erro ao ler corpo da página inicial: {e}"))?;

    let json_val: Value = serde_json::from_str(&text)
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
    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let mut playlists = Vec::new();

    // 1. Sempre adiciona o item fixo de Músicas Curtidas
    playlists.push(Playlist {
        id: "VLLM".to_string(),
        title: "🔥 Músicas Curtidas".to_string(),
        subtitle: Some("Sua coleção automática do YouTube Music".to_string()),
        artwork_url: Some("https://www.gstatic.com/youtube/media/ytm/images/pbg/liked-songs-600.png".to_string()),
        track_count: None,
    });

    // 2. Busca na Biblioteca do usuário (FEmusic_liked_playlists)
    let payload = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "pt",
                "gl": "BR"
            }
        },
        "browseId": "FEmusic_liked_playlists"
    });

    if let Ok(resp) = client.post(url).headers(headers.clone()).json(&payload).send().await {
        if resp.status().is_success() {
            if let Ok(json_val) = resp.json::<Value>().await {
                extract_user_playlists_from_value(&json_val, &mut playlists);
            }
        }
    }

    // 3. Fallback: Se após FEmusic_liked_playlists houver apenas VLLM, consulta a landing da biblioteca
    if playlists.len() <= 1 && session.is_authenticated {
        let landing_payload = json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20240401.01.00",
                    "hl": "pt",
                    "gl": "BR"
                }
            },
            "browseId": "FEmusic_library_landing"
        });

        if let Ok(resp) = client.post(url).headers(headers.clone()).json(&landing_payload).send().await {
            if resp.status().is_success() {
                if let Ok(json_val) = resp.json::<Value>().await {
                    extract_user_playlists_from_value(&json_val, &mut playlists);
                }
            }
        }
    }

    // Deduplica mantendo a ordem
    let mut seen = std::collections::HashSet::new();
    playlists.retain(|p| seen.insert(p.id.clone()));

    Ok(playlists)
}

pub fn extract_continuation_token(val: &Value) -> Option<String> {
    match val {
        Value::Object(map) => {
            // 1. continuationItemRenderer direto (token na ação/endpoint de comando)
            if let Some(item) = map.get("continuationItemRenderer") {
                if let Some(token) = item["continuationEndpoint"]["continuationCommand"]["token"]
                    .as_str()
                    .filter(|s| !s.is_empty())
                {
                    return Some(token.to_string());
                }
            }

            // 2. continuationCommand direto
            if let Some(cmd) = map.get("continuationCommand") {
                if let Some(token) = cmd.get("token").and_then(|t| t.as_str()) {
                    if !token.is_empty() {
                        return Some(token.to_string());
                    }
                }
            }

            // 3. nextContinuationData direto
            if let Some(cont) = map.get("nextContinuationData") {
                if let Some(token) = cont.get("continuation").and_then(|t| t.as_str()) {
                    if !token.is_empty() {
                        return Some(token.to_string());
                    }
                }
            }

            // 4. Prioridade máxima para prateleiras de faixas (Playlists e Álbuns)
            for shelf_key in [
                "musicPlaylistShelfRenderer",
                "musicShelfRenderer",
                "musicPlaylistShelfContinuation",
            ] {
                if let Some(shelf) = map.get(shelf_key) {
                    if let Some(contents) = shelf.get("contents").and_then(|c| c.as_array()) {
                        if let Some(last) = contents.last() {
                            if let Some(tok) = extract_continuation_token(last) {
                                return Some(tok);
                            }
                        }
                    }
                    if let Some(conts) = shelf.get("continuations").and_then(|c| c.as_array()) {
                        for c in conts {
                            if let Some(tok) = extract_continuation_token(c) {
                                return Some(tok);
                            }
                        }
                    }
                }
            }

            // 5. appendContinuationItemsAction (respostas de paginação subsequentes)
            if let Some(action) = map.get("appendContinuationItemsAction") {
                if let Some(items) = action.get("continuationItems").and_then(|it| it.as_array()) {
                    if let Some(last) = items.last() {
                        if let Some(tok) = extract_continuation_token(last) {
                            return Some(tok);
                        }
                    }
                }
            }

            // 6. sectionListRenderer: inspeciona estritamente os contents (shelves) e nunca as continuations do carrossel de seção
            if let Some(section_list) = map.get("sectionListRenderer") {
                if let Some(sec_contents) = section_list.get("contents") {
                    if let Some(tok) = extract_continuation_token(sec_contents) {
                        return Some(tok);
                    }
                }
            }

            // 7. continuations genéricas de outros nós permitidos
            if let Some(Value::Array(conts)) = map.get("continuations") {
                for c in conts {
                    if let Some(tok) = extract_continuation_token(c) {
                        return Some(tok);
                    }
                }
            }

            // 8. Busca recursiva excluindo elementos de itens ou seções já processados
            for (k, v) in map {
                if k == "sectionListRenderer"
                    || k == "musicResponsiveListItemRenderer"
                    || k == "playlistPanelVideoRenderer"
                    || k == "musicTwoRowItemRenderer"
                    || k == "musicCarouselShelfRenderer"
                {
                    continue;
                }
                if let Some(tok) = extract_continuation_token(v) {
                    return Some(tok);
                }
            }
        }
        Value::Array(arr) => {
            // Em arrays, tokens de continuação estão costumeiramente no final
            for v in arr.iter().rev() {
                if let Some(tok) = extract_continuation_token(v) {
                    return Some(tok);
                }
            }
        }
        _ => {}
    }
    None
}

pub async fn get_playlist_tracks(session: &AuthSession, playlist_id: &str) -> Result<Vec<Track>, String> {
    get_playlist_tracks_with_limit(session, playlist_id, 25).await
}

pub async fn get_playlist_tracks_with_limit(
    session: &AuthSession,
    playlist_id: &str,
    max_pages: usize,
) -> Result<Vec<Track>, String> {
    let client = &HTTP_CLIENT;
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
        .headers(headers.clone())
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Erro ao carregar faixas da playlist: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("YouTube Music retornou status {status} ao carregar playlist"));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| format!("Erro ao ler corpo da resposta da playlist: {e}"))?;

    let json_val: Value = serde_json::from_str(&text)
        .map_err(|e| format!("Erro ao parsear resposta da playlist: {e}"))?;

    let mut tracks = Vec::new();
    extract_tracks_from_value(&json_val, &mut tracks);

    // Paginação Automática via Continuation Token (Item 1.2)
    let mut continuation = extract_continuation_token(&json_val);
    let mut page_count = 1;

    while let Some(token) = continuation {
        if page_count >= max_pages {
            break;
        }
        let cont_url = format!("https://music.youtube.com/youtubei/v1/browse?continuation={token}&prettyPrint=false");
        let cont_payload = json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20240401.01.00",
                    "hl": "pt",
                    "gl": "BR"
                }
            },
            "continuation": token
        });

        match client.post(&cont_url).headers(headers.clone()).json(&cont_payload).send().await {
            Ok(cont_resp) => {
                if cont_resp.status().is_success() {
                    if let Ok(cont_text) = cont_resp.text().await {
                        if let Ok(cont_json) = serde_json::from_str::<Value>(&cont_text) {
                            let prev_len = tracks.len();
                            extract_tracks_from_value(&cont_json, &mut tracks);
                            // Se nenhuma faixa nova foi extraída, encerra para evitar repetição/loop
                            if tracks.len() == prev_len {
                                break;
                            }
                            continuation = extract_continuation_token(&cont_json);
                            page_count += 1;
                            continue;
                        }
                    }
                }
                break;
            }
            Err(_) => break,
        }
    }

    let mut seen = std::collections::HashSet::new();
    tracks.retain(|t| {
        let key = t.set_video_id.clone().unwrap_or_else(|| t.id.clone());
        seen.insert(key)
    });

    Ok(tracks)
}

/// Obtém informações e stream direto de áudio nativo para reprodução de alta fidelidade sem stutter (Item 1.1)
pub async fn get_stream_info(session: &AuthSession, video_id: &str) -> Result<Option<StreamInfo>, String> {
    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/player?prettyPrint=false";
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
        "videoId": video_id
    });

    let resp = match client.post(url).headers(headers).json(&payload).send().await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[get_stream_info] Erro na requisição do player: {e}");
            return Ok(None);
        }
    };

    if !resp.status().is_success() {
        return Ok(None);
    }

    let json_val: Value = match resp.json().await {
        Ok(v) => v,
        Err(_) => return Ok(None),
    };

    let status = json_val["playabilityStatus"]["status"].as_str().unwrap_or("");
    if status != "OK" {
        return Ok(None);
    }

    let video_details = &json_val["videoDetails"];
    let title = video_details["title"].as_str().unwrap_or("Música").to_string();
    let artist = video_details["author"].as_str().unwrap_or("Artista").to_string();
    let duration_seconds = video_details["lengthSeconds"].as_str().and_then(|s| s.parse::<u64>().ok());
    let artwork_url = video_details["thumbnail"]["thumbnails"]
        .as_array()
        .and_then(|arr| arr.last())
        .and_then(|t| t["url"].as_str())
        .map(|u| upgrade_artwork_url(u));

    let formats = match json_val["streamingData"]["adaptiveFormats"].as_array() {
        Some(f) => f,
        None => return Ok(None),
    };

    // Filtra apenas formatos de áudio com stream direto (campo "url" presente sem necessidade de cipher)
    let mut audio_formats: Vec<&Value> = formats
        .iter()
        .filter(|f| {
            let mime = f["mimeType"].as_str().unwrap_or("");
            mime.starts_with("audio/") && f.get("url").and_then(|u| u.as_str()).is_some()
        })
        .collect();

    if audio_formats.is_empty() {
        // Sem URL direta desprotegida: aciona fallback transparente para IFrame
        return Ok(None);
    }

    // Ordena por qualidade de áudio: itag 251 (Opus ~160kbps), itag 140 (AAC 128kbps), maior bitrate
    audio_formats.sort_by(|a, b| {
        let itag_a = a["itag"].as_u64().unwrap_or(0);
        let itag_b = b["itag"].as_u64().unwrap_or(0);
        let priority_a = if itag_a == 251 { 2 } else if itag_a == 140 { 1 } else { 0 };
        let priority_b = if itag_b == 251 { 2 } else if itag_b == 140 { 1 } else { 0 };

        let bitrate_a = a["bitrate"].as_u64().unwrap_or(0);
        let bitrate_b = b["bitrate"].as_u64().unwrap_or(0);

        priority_b.cmp(&priority_a).then_with(|| bitrate_b.cmp(&bitrate_a))
    });

    let best = audio_formats[0];
    let stream_url = match best["url"].as_str() {
        Some(u) => u.to_string(),
        None => return Ok(None),
    };

    let mime_type = best["mimeType"].as_str().map(|s| s.to_string());
    let bitrate = best["bitrate"].as_u64();

    Ok(Some(StreamInfo {
        video_id: video_id.to_string(),
        title,
        artist,
        artwork_url,
        stream_url,
        duration_seconds,
        bitrate,
        mime_type,
    }))
}

pub async fn get_radio_tracks(session: &AuthSession, video_id: &str) -> Result<Vec<Track>, String> {
    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/next?prettyPrint=false";
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
        "videoId": video_id
    });

    let mut tracks = Vec::new();

    if let Ok(resp) = client.post(url).headers(headers).json(&payload).send().await {
        if let Ok(json_val) = resp.json::<Value>().await {
            extract_tracks_from_value(&json_val, &mut tracks);
        }
    }

    // Filtra a própria faixa que originou a rádio
    tracks.retain(|t| t.id != video_id);

    // Deduplica mantendo a ordem
    let mut seen = std::collections::HashSet::new();
    tracks.retain(|t| seen.insert(t.id.clone()));

    // Fallback caso o endpoint next retorne poucas faixas
    if tracks.is_empty() {
        if let Ok(fallback) = get_home_recommendations(session).await {
            let mut fallback_tracks: Vec<Track> = fallback.into_iter().filter(|t| t.id != video_id).collect();
            tracks.append(&mut fallback_tracks);
        }
    }

    Ok(tracks)
}

pub fn upgrade_artwork_url(url: &str) -> String {
    let clean = if url.starts_with("//") {
        format!("https:{}", url)
    } else {
        url.to_string()
    };

    // 1. Google User Content / GGPHT / YouTube Music CDN
    if clean.contains("googleusercontent.com") || clean.contains("ggpht.com") {
        if let Some(pos) = clean.rfind('=') {
            let prefix = &clean[..pos];
            let suffix = &clean[pos..];
            if suffix.starts_with("=w") || suffix.starts_with("=s") {
                return format!("{}=w800-h800-l90-rj", prefix);
            }
        }
    }

    // 2. YouTube Vi Thumbnails
    if clean.contains("i.ytimg.com/vi/") || clean.contains("img.youtube.com/vi/") {
        return clean
            .replace("/hqdefault.jpg", "/maxresdefault.jpg")
            .replace("/mqdefault.jpg", "/maxresdefault.jpg")
            .replace("/default.jpg", "/maxresdefault.jpg");
    }

    clean
}

fn extract_thumbnail_from_renderer(renderer: &Value) -> Option<String> {
    let thumbs = renderer.get("musicThumbnailRenderer")
        .or_else(|| renderer.get("croppedSquareThumbnailRenderer"))
        .and_then(|r| r.get("thumbnail"))
        .and_then(|t| t.get("thumbnails"))
        .or_else(|| renderer.get("thumbnail").and_then(|t| t.get("thumbnails")))
        .and_then(|t| t.as_array());

    if let Some(arr) = thumbs {
        if let Some(last_thumb) = arr.last() {
            if let Some(url) = last_thumb.get("url").and_then(|u| u.as_str()) {
                return Some(upgrade_artwork_url(url));
            }
        }
    }
    None
}

fn extract_user_playlists_from_value(val: &Value, playlists: &mut Vec<Playlist>) {
    match val {
        Value::Object(map) => {
            if let Some(item) = map.get("musicTwoRowItemRenderer") {
                if let Some(pl) = parse_user_playlist_two_row(item) {
                    playlists.push(pl);
                }
            } else if let Some(item) = map.get("musicResponsiveListItemRenderer") {
                if let Some(pl) = parse_user_playlist_responsive_item(item) {
                    playlists.push(pl);
                }
            }

            for v in map.values() {
                extract_user_playlists_from_value(v, playlists);
            }
        }
        Value::Array(arr) => {
            for v in arr {
                extract_user_playlists_from_value(v, playlists);
            }
        }
        _ => {}
    }
}

fn parse_user_playlist_two_row(item: &Value) -> Option<Playlist> {
    let nav = &item["navigationEndpoint"];
    let browse_id = nav["browseEndpoint"]["browseId"].as_str()
        .or_else(|| nav["watchEndpoint"]["playlistId"].as_str())?;

    // Ignora itens sem ID, ou especiais (ex: botão 'Nova playlist' que não tem browseId, ou podcasts)
    if browse_id.is_empty() || browse_id == "VLLM" || browse_id == "LM" || browse_id == "VLSE" {
        return None;
    }

    // Ignora canais/artistas (UC...), seções internas (FE...) ou álbuns canônicos (MPREb_)
    if browse_id.starts_with("UC") || browse_id.starts_with("FE") || browse_id.starts_with("MPREb_") {
        return None;
    }

    let title = item["title"]["runs"]
        .as_array()
        .and_then(|r| r.first())
        .and_then(|t| t["text"].as_str())
        .or_else(|| item["title"]["simpleText"].as_str())
        .unwrap_or("Playlist")
        .to_string();

    let title_lower = title.to_lowercase();
    if title_lower == "nova playlist" || title_lower == "new playlist" {
        return None;
    }

    let subtitle = item["subtitle"]["runs"]
        .as_array()
        .map(|runs| {
            runs.iter()
                .filter_map(|r| r["text"].as_str())
                .collect::<Vec<_>>()
                .join(" ")
        })
        .or_else(|| item["subtitle"]["simpleText"].as_str().map(|s| s.to_string()));

    let artwork_url = extract_thumbnail_from_renderer(&item["thumbnailRenderer"])
        .or_else(|| extract_thumbnail_from_renderer(&item["thumbnail"]));

    Some(Playlist {
        id: browse_id.to_string(),
        title,
        subtitle,
        artwork_url,
        track_count: None,
    })
}

fn parse_user_playlist_responsive_item(item: &Value) -> Option<Playlist> {
    let nav = &item["navigationEndpoint"];
    let browse_id = nav["browseEndpoint"]["browseId"].as_str()
        .or_else(|| nav["watchEndpoint"]["playlistId"].as_str())
        .or_else(|| {
            item["flexColumns"].as_array()?.iter().find_map(|c| {
                c["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"]
                    .as_array()?
                    .iter()
                    .find_map(|r| {
                        let id = r["navigationEndpoint"]["browseEndpoint"]["browseId"].as_str()?;
                        if id.starts_with("VL") || id.starts_with("PL") || id.starts_with("RD") {
                            Some(id)
                        } else {
                            None
                        }
                    })
            })
        })?;

    if browse_id.is_empty() || browse_id == "VLLM" || browse_id == "LM" || browse_id == "VLSE" {
        return None;
    }

    if browse_id.starts_with("UC") || browse_id.starts_with("FE") || browse_id.starts_with("MPREb_") {
        return None;
    }

    let flex = item["flexColumns"].as_array();
    let title = flex
        .and_then(|cols| cols.get(0))
        .and_then(|c| c["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"].as_array())
        .and_then(|runs| runs.first())
        .and_then(|r| r["text"].as_str())
        .or_else(|| item["title"]["runs"][0]["text"].as_str())
        .or_else(|| item["title"]["simpleText"].as_str())
        .unwrap_or("Playlist")
        .to_string();

    let title_lower = title.to_lowercase();
    if title_lower == "nova playlist" || title_lower == "new playlist" {
        return None;
    }

    let subtitle = flex
        .and_then(|cols| cols.get(1))
        .and_then(|c| c["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"].as_array())
        .map(|runs| {
            runs.iter()
                .filter_map(|r| r["text"].as_str())
                .collect::<Vec<_>>()
                .join(" ")
        })
        .or_else(|| item["subtitle"]["simpleText"].as_str().map(|s| s.to_string()));

    let artwork_url = extract_thumbnail_from_renderer(&item["thumbnailRenderer"])
        .or_else(|| extract_thumbnail_from_renderer(&item["thumbnail"]));

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
            } else if let Some(item) = map.get("playlistPanelVideoRenderer") {
                if let Some(track) = parse_playlist_panel_item(item) {
                    tracks.push(track);
                }
            }

            for (k, v) in map {
                if k == "musicCarouselShelfRenderer" {
                    continue;
                }
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
    let mut artist_id = None;
    let mut album_id = None;

    if flex_columns.len() > 1 {
        if let Some(runs) = flex_columns[1]["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"].as_array() {
            for r in runs {
                let txt = r["text"].as_str().unwrap_or("").trim();
                if let Some(b_id) = r["navigationEndpoint"]["browseEndpoint"]["browseId"].as_str() {
                    if b_id.starts_with("UC") && artist_id.is_none() {
                        artist = txt.to_string();
                        artist_id = Some(b_id.to_string());
                    } else if (b_id.starts_with("MPREb_") || b_id.starts_with("OLAK5uy_")) && album_id.is_none() {
                        album = Some(txt.to_string());
                        album_id = Some(b_id.to_string());
                    }
                }
                if duration.is_none() && txt.contains(':') && txt.len() <= 8 && !txt.contains(' ') {
                    duration = Some(txt.to_string());
                }
            }

            // Fallback se não encontrou via browseEndpoint:
            if artist == "Artista" || album.is_none() {
                let mut sections: Vec<String> = Vec::new();
                let mut current_sec = String::new();
                for r in runs {
                    let txt = r["text"].as_str().unwrap_or("");
                    if txt.trim() == "•" {
                        if !current_sec.trim().is_empty() {
                            sections.push(current_sec.trim().to_string());
                            current_sec.clear();
                        }
                    } else {
                        current_sec.push_str(txt);
                    }
                }
                if !current_sec.trim().is_empty() {
                    sections.push(current_sec.trim().to_string());
                }

                let valid_secs: Vec<&String> = sections
                    .iter()
                    .filter(|s| {
                        let lower = s.to_lowercase();
                        lower != "música" && lower != "musica" && lower != "song" && lower != "canção" && lower != "cancao" && lower != "vídeo" && lower != "video" && !(s.contains(':') && s.len() <= 8)
                    })
                    .collect();

                if artist == "Artista" {
                    if let Some(first_artist) = valid_secs.first() {
                        artist = (*first_artist).clone();
                    }
                }
                if album.is_none() {
                    if valid_secs.len() > 1 {
                        album = Some((*valid_secs[1]).clone());
                    }
                }
            }
        }
    }

    if artist_id.is_none() {
        if let Some(items) = item["menu"]["menuRenderer"]["items"].as_array() {
            for mi in items {
                if let Some(b_id) = mi["menuNavigationItemRenderer"]["navigationEndpoint"]["browseEndpoint"]["browseId"].as_str() {
                    if b_id.starts_with("UC") {
                        artist_id = Some(b_id.to_string());
                        break;
                    }
                }
            }
        }
    }

    if duration.is_none() {
        if let Some(fixed) = item["fixedColumns"].as_array() {
            if let Some(col) = fixed.first() {
                if let Some(text) = col["musicResponsiveListItemFixedColumnRenderer"]["text"]["runs"]
                    .as_array()
                    .and_then(|r| r.first())
                    .and_then(|t| t["text"].as_str())
                {
                    if text.contains(':') {
                        duration = Some(text.to_string());
                    }
                }
            }
        }
    }

    let artwork_url = extract_thumbnail_from_renderer(&item["thumbnail"])
        .or_else(|| Some(format!("https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg")));

    let set_video_id = item["playlistItemData"]["playlistSetVideoId"]
        .as_str()
        .or_else(|| {
            item["overlay"]["musicItemThumbnailOverlayRenderer"]["content"]["musicPlayButtonRenderer"]["playNavigationEndpoint"]["watchEndpoint"]["playlistSetVideoId"].as_str()
        })
        .or_else(|| {
            flex_columns
                .first()
                .and_then(|c| c["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"].as_array())
                .and_then(|runs| runs.first())
                .and_then(|r| r["navigationEndpoint"]["watchEndpoint"]["playlistSetVideoId"].as_str())
        })
        .map(|s| s.to_string())
        .or_else(|| {
            if let Some(items) = item["menu"]["menuRenderer"]["items"].as_array() {
                for mi in items {
                    if let Some(actions) = mi["menuServiceItemRenderer"]["serviceEndpoint"]["playlistEditEndpoint"]["actions"].as_array() {
                        for a in actions {
                            if let Some(svid) = a["setVideoId"].as_str() {
                                return Some(svid.to_string());
                            }
                        }
                    }
                }
            }
            None
        })
        .filter(|s| s != "to_be_updated_by_client" && !s.trim().is_empty());

    Some(Track {
        id: video_id,
        title,
        artist,
        artist_id,
        album,
        album_id,
        duration,
        duration_seconds: None,
        artwork_url,
        set_video_id,
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

    let artist_id = item["subtitle"]["runs"]
        .as_array()
        .and_then(|runs| {
            runs.iter().find_map(|r| {
                r["navigationEndpoint"]["browseEndpoint"]["browseId"]
                    .as_str()
                    .filter(|id| id.starts_with("UC"))
                    .map(|s| s.to_string())
            })
        });

    let artwork_url = extract_thumbnail_from_renderer(&item["thumbnailRenderer"])
        .or_else(|| extract_thumbnail_from_renderer(&item["thumbnail"]))
        .or_else(|| Some(format!("https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg")));

    Some(Track {
        id: video_id,
        title,
        artist,
        artist_id,
        album: None,
        album_id: None,
        duration: None,
        duration_seconds: None,
        artwork_url,
        set_video_id: None,
    })
}

fn parse_playlist_panel_item(item: &Value) -> Option<Track> {
    let video_id = item["videoId"].as_str()?.to_string();
    if video_id.is_empty() {
        return None;
    }

    let title = item["title"]["runs"]
        .as_array()
        .and_then(|runs| runs.first())
        .and_then(|r| r["text"].as_str())
        .unwrap_or("Música")
        .to_string();

    let artist = item["longBylineText"]["runs"]
        .as_array()
        .and_then(|runs| runs.first())
        .and_then(|r| r["text"].as_str())
        .or_else(|| {
            item["shortBylineText"]["runs"]
                .as_array()
                .and_then(|runs| runs.first())
                .and_then(|r| r["text"].as_str())
        })
        .unwrap_or("Artista")
        .to_string();

    let artist_id = item["longBylineText"]["runs"]
        .as_array()
        .or_else(|| item["shortBylineText"]["runs"].as_array())
        .and_then(|runs| {
            runs.iter().find_map(|r| {
                r["navigationEndpoint"]["browseEndpoint"]["browseId"]
                    .as_str()
                    .filter(|id| id.starts_with("UC"))
                    .map(|s| s.to_string())
            })
        });

    let duration = item["lengthText"]["runs"]
        .as_array()
        .and_then(|runs| runs.first())
        .and_then(|r| r["text"].as_str())
        .map(|s| s.to_string());

    let artwork_url = extract_thumbnail_from_renderer(&item["thumbnail"])
        .or_else(|| Some(format!("https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg")));

    let set_video_id = item["playlistSetVideoId"]
        .as_str()
        .filter(|s| *s != "to_be_updated_by_client" && !s.trim().is_empty())
        .map(|s| s.to_string());

    Some(Track {
        id: video_id,
        title,
        artist,
        artist_id,
        album: None,
        album_id: None,
        duration,
        duration_seconds: None,
        artwork_url,
        set_video_id,
    })
}

fn clean_track_title(raw: &str) -> String {
    let mut cleaned = raw.to_string();
    let garbage = [
        "(Official Music Video)",
        "(Official Video)",
        "(Official Audio)",
        "(Official Visualizer)",
        "(Music Video)",
        "(Official)",
        "(Audio)",
        "(Visualizer)",
        "(Clip)",
        "(Lyric Video)",
        "(Lyrics)",
        "[Official Music Video]",
        "[Official Video]",
        "[Official Audio]",
        "[Music Video]",
        "[Official]",
        "[MV]",
        "[HD]",
        "[HQ]",
        "[4K]",
    ];
    for g in garbage {
        cleaned = cleaned.replace(g, "");
    }
    if let Some(pos) = cleaned.find(" - Official") {
        cleaned.truncate(pos);
    }
    cleaned.trim().to_string()
}

pub async fn fetch_lyrics(
    session: &AuthSession,
    track_title: &str,
    artist_name: &str,
    video_id: &str,
) -> Result<LyricsData, String> {
    let client = &HTTP_CLIENT;
    let lrclib_timeout = std::time::Duration::from_secs(6);

    let cleaned_title = clean_track_title(track_title);

    // 1. Try LRCLIB exact get
    let lrclib_res = client
        .get("https://lrclib.net/api/get")
        .timeout(lrclib_timeout)
        .query(&[
            ("track_name", cleaned_title.as_str()),
            ("artist_name", artist_name),
        ])
        .header(
            USER_AGENT,
            "TetPlayer/1.0 (https://github.com/p0pes/TetPlayer)",
        )
        .send()
        .await;

    if let Ok(resp) = lrclib_res {
        if resp.status().is_success() {
            if let Ok(data) = resp.json::<Value>().await {
                let synced = data["syncedLyrics"].as_str().map(|s| s.to_string());
                let plain = data["plainLyrics"].as_str().map(|s| s.to_string());
                if synced.is_some() || plain.is_some() {
                    return Ok(LyricsData {
                        synced,
                        plain,
                        source: "LRCLIB".to_string(),
                    });
                }
            }
        }
    }

    // 2. Try LRCLIB search query
    let query_param = format!("{} {}", cleaned_title, artist_name);
    let search_res = client
        .get("https://lrclib.net/api/search")
        .timeout(lrclib_timeout)
        .query(&[("q", query_param.as_str())])
        .header(
            USER_AGENT,
            "TetPlayer/1.0 (https://github.com/p0pes/TetPlayer)",
        )
        .send()
        .await;

    if let Ok(resp) = search_res {
        if resp.status().is_success() {
            if let Ok(data) = resp.json::<Value>().await {
                if let Some(arr) = data.as_array() {
                    for item in arr {
                        let synced = item["syncedLyrics"].as_str().map(|s| s.to_string());
                        let plain = item["plainLyrics"].as_str().map(|s| s.to_string());
                        if synced.is_some() || plain.is_some() {
                            return Ok(LyricsData {
                                synced,
                                plain,
                                source: "LRCLIB".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    // 3. Fallback to YouTube Music lyrics
    if !video_id.is_empty() {
        if let Ok(Some(plain_lyrics)) = fetch_ytm_lyrics(session, video_id).await {
            return Ok(LyricsData {
                synced: None,
                plain: Some(plain_lyrics),
                source: "YouTube Music".to_string(),
            });
        }
    }

    Ok(LyricsData {
        synced: None,
        plain: None,
        source: "Nenhuma".to_string(),
    })
}

async fn fetch_ytm_lyrics(session: &AuthSession, video_id: &str) -> Result<Option<String>, String> {
    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/next?prettyPrint=false";
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
        "videoId": video_id
    });

    let resp = client
        .post(url)
        .headers(headers)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Erro ao buscar dados do player para letras: {e}"))?;

    let json_val: Value = resp
        .json()
        .await
        .map_err(|e| format!("Erro ao decodificar JSON de next: {e}"))?;

    fn find_lyrics_browse_id(v: &Value) -> Option<String> {
        if let Some(title) = v.get("title").and_then(|t| t.as_str()) {
            if title == "Letra" || title == "Lyrics" {
                if let Some(browse_id) = v
                    .get("endpoint")
                    .and_then(|ep| ep.get("browseEndpoint"))
                    .and_then(|b| b.get("browseId"))
                    .and_then(|id| id.as_str())
                {
                    return Some(browse_id.to_string());
                }
            }
        }
        if let Some(obj) = v.as_object() {
            for (_, val) in obj {
                if let Some(id) = find_lyrics_browse_id(val) {
                    return Some(id);
                }
            }
        } else if let Some(arr) = v.as_array() {
            for item in arr {
                if let Some(id) = find_lyrics_browse_id(item) {
                    return Some(id);
                }
            }
        }
        None
    }

    let browse_id = match find_lyrics_browse_id(&json_val) {
        Some(id) => id,
        None => return Ok(None),
    };

    let browse_url = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
    let headers2 = build_headers(session, "WEB_REMIX");
    let browse_payload = json!({
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

    let resp_br = client
        .post(browse_url)
        .headers(headers2)
        .json(&browse_payload)
        .send()
        .await
        .map_err(|e| format!("Erro ao buscar letra no YTM: {e}"))?;

    let br_json: Value = resp_br
        .json()
        .await
        .map_err(|e| format!("Erro ao decodificar JSON de browse da letra: {e}"))?;

    fn extract_shelf_lyrics(v: &Value) -> Option<String> {
        if let Some(shelf) = v.get("musicDescriptionShelfRenderer") {
            if let Some(runs) = shelf
                .get("description")
                .and_then(|d| d.get("runs"))
                .and_then(|r| r.as_array())
            {
                let parts: Vec<String> = runs
                    .iter()
                    .filter_map(|r| {
                        r.get("text")
                            .and_then(|t| t.as_str())
                            .map(|s| s.to_string())
                    })
                    .collect();
                if !parts.is_empty() {
                    return Some(parts.join("\n"));
                }
            }
        }
        if let Some(obj) = v.as_object() {
            for (_, val) in obj {
                if let Some(txt) = extract_shelf_lyrics(val) {
                    return Some(txt);
                }
            }
        } else if let Some(arr) = v.as_array() {
            for item in arr {
                if let Some(txt) = extract_shelf_lyrics(item) {
                    return Some(txt);
                }
            }
        }
        None
    }

    Ok(extract_shelf_lyrics(&br_json))
}

/// Busca informações do perfil do usuário autenticado no YouTube Music (Nome, E-mail, Avatar)
pub async fn fetch_account_info(session: &AuthSession) -> (Option<String>, Option<String>, Option<String>) {
    if !session.is_authenticated || session.cookie_header.is_empty() {
        return (None, None, None);
    }

    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/account/account_menu?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");
    let payload = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "pt",
                "gl": "BR"
            }
        }
    });

    if let Ok(resp) = client.post(url).headers(headers).json(&payload).send().await {
        if resp.status().is_success() {
            if let Ok(val) = resp.json::<Value>().await {
                // Tenta extrair o activeAccountHeaderRenderer
                let header = &val["actions"][0]["openPopupAction"]["popup"]["multiPageMenuRenderer"]["header"]["activeAccountHeaderRenderer"];
                let name = header["accountName"]["runs"][0]["text"].as_str().map(|s| s.to_string());
                let email = header["email"]["runs"][0]["text"].as_str().map(|s| s.to_string());
                let avatar = header["avatar"]["thumbnails"][0]["url"].as_str().map(|s| s.to_string());
                return (name, email, avatar);
            }
        }
    }
    (None, None, None)
}


// ==========================================
// MÓDULO DE SUPORTE A ÁLBUNS (Item 2.11)
// ==========================================

fn parse_album_two_row(item: &Value) -> Option<Album> {
    let nav = &item["navigationEndpoint"]["browseEndpoint"];
    let browse_id = nav["browseId"].as_str()?;
    let page_type = nav["browseEndpointContextSupportedConfigs"]["browseEndpointContextMusicConfig"]["pageType"]
        .as_str()
        .unwrap_or("");

    let is_album = browse_id.starts_with("MPREb_")
        || browse_id.starts_with("OLAK5uy_")
        || page_type == "MUSIC_PAGE_TYPE_ALBUM";

    if !is_album {
        return None;
    }

    let title = item["title"]["runs"]
        .as_array()
        .and_then(|r| r.first())
        .and_then(|t| t["text"].as_str())
        .unwrap_or("Álbum")
        .to_string();

    let mut artist = "Artista".to_string();
    let mut artist_id = None;
    let mut year = None;
    let mut album_type = Some("album".to_string());

    if let Some(runs) = item["subtitle"]["runs"].as_array() {
        for r in runs {
            if let Some(txt) = r["text"].as_str() {
                let trimmed = txt.trim();
                let lower = trimmed.to_lowercase();
                if lower.contains("single") {
                    album_type = Some("single".to_string());
                } else if lower.contains("ep") {
                    album_type = Some("ep".to_string());
                } else if trimmed.len() == 4 && trimmed.chars().all(|c| c.is_ascii_digit()) {
                    year = Some(trimmed.to_string());
                } else if !trimmed.is_empty()
                    && trimmed != "•"
                    && trimmed != "Álbum"
                    && trimmed != "Album"
                    && trimmed != "Single"
                    && trimmed != "EP"
                {
                    artist = trimmed.to_string();
                    if let Some(a_id) = r["navigationEndpoint"]["browseEndpoint"]["browseId"].as_str() {
                        artist_id = Some(a_id.to_string());
                    }
                }
            }
        }
    }

    let artwork_url = extract_thumbnail_from_renderer(&item["thumbnailRenderer"])
        .or_else(|| extract_thumbnail_from_renderer(&item["thumbnail"]));

    Some(Album {
        id: browse_id.to_string(),
        title,
        artist,
        artist_id,
        year,
        artwork_url,
        track_count: None,
        duration_text: None,
        album_type,
    })
}

fn parse_album_responsive_item(item: &Value) -> Option<Album> {
    let nav = &item["navigationEndpoint"]["browseEndpoint"];
    let browse_id = nav["browseId"].as_str().or_else(|| {
        item["flexColumns"].as_array()?.iter().find_map(|c| {
            c["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"]
                .as_array()?
                .iter()
                .find_map(|r| r["navigationEndpoint"]["browseEndpoint"]["browseId"].as_str())
                .filter(|id| id.starts_with("MPREb_") || id.starts_with("OLAK5uy_"))
        })
    })?;

    let page_type = nav["browseEndpointContextSupportedConfigs"]["browseEndpointContextMusicConfig"]["pageType"]
        .as_str()
        .unwrap_or("");

    let is_album = browse_id.starts_with("MPREb_")
        || browse_id.starts_with("OLAK5uy_")
        || page_type == "MUSIC_PAGE_TYPE_ALBUM";

    if !is_album {
        return None;
    }

    let flex = item["flexColumns"].as_array()?;
    let title = flex.get(0)
        .and_then(|c| c["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"].as_array())
        .and_then(|runs| runs.first())
        .and_then(|r| r["text"].as_str())
        .unwrap_or("Álbum")
        .to_string();

    let mut artist = "Artista".to_string();
    let mut artist_id = None;
    let mut year = None;
    let mut album_type = Some("album".to_string());

    if let Some(col1) = flex.get(1) {
        if let Some(runs) = col1["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"].as_array() {
            for r in runs {
                if let Some(txt) = r["text"].as_str() {
                    let trimmed = txt.trim();
                    let lower = trimmed.to_lowercase();
                    if lower.contains("single") {
                        album_type = Some("single".to_string());
                    } else if lower.contains("ep") {
                        album_type = Some("ep".to_string());
                    } else if trimmed.len() == 4 && trimmed.chars().all(|c| c.is_ascii_digit()) {
                        year = Some(trimmed.to_string());
                    } else if !trimmed.is_empty()
                        && trimmed != "•"
                        && trimmed != "Álbum"
                        && trimmed != "Album"
                        && trimmed != "Single"
                        && trimmed != "EP"
                    {
                        if artist == "Artista" {
                            artist = trimmed.to_string();
                            if let Some(a_id) = r["navigationEndpoint"]["browseEndpoint"]["browseId"].as_str() {
                                artist_id = Some(a_id.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    let artwork_url = extract_thumbnail_from_renderer(&item["thumbnailRenderer"])
        .or_else(|| extract_thumbnail_from_renderer(&item["thumbnail"]));

    Some(Album {
        id: browse_id.to_string(),
        title,
        artist,
        artist_id,
        year,
        artwork_url,
        track_count: None,
        duration_text: None,
        album_type,
    })
}

fn extract_albums_from_value(val: &Value, albums: &mut Vec<Album>) {
    match val {
        Value::Object(map) => {
            if let Some(item) = map.get("musicTwoRowItemRenderer") {
                if let Some(album) = parse_album_two_row(item) {
                    albums.push(album);
                }
            }
            if let Some(item) = map.get("musicResponsiveListItemRenderer") {
                if let Some(album) = parse_album_responsive_item(item) {
                    albums.push(album);
                }
            }
            for v in map.values() {
                extract_albums_from_value(v, albums);
            }
        }
        Value::Array(arr) => {
            for v in arr {
                extract_albums_from_value(v, albums);
            }
        }
        _ => {}
    }
}

fn find_header_renderer(val: &Value) -> Option<&Value> {
    match val {
        Value::Object(map) => {
            if let Some(h) = map.get("musicResponsiveHeaderRenderer") {
                return Some(h);
            }
            if let Some(h) = map.get("musicDetailHeaderRenderer") {
                return Some(h);
            }
            if let Some(h) = map.get("musicVisualHeaderRenderer") {
                return Some(h);
            }
            if let Some(h) = map.get("musicEditablePlaylistDetailHeaderRenderer") {
                return Some(h);
            }
            if let Some(h) = map.get("musicImmersiveHeaderRenderer") {
                return Some(h);
            }
            for v in map.values() {
                if let Some(found) = find_header_renderer(v) {
                    return Some(found);
                }
            }
            None
        }
        Value::Array(arr) => {
            for v in arr {
                if let Some(found) = find_header_renderer(v) {
                    return Some(found);
                }
            }
            None
        }
        _ => None,
    }
}

fn find_mpreb_in_value(val: &Value) -> Option<String> {
    match val {
        Value::String(s) => {
            if s.starts_with("MPREb_") {
                return Some(s.clone());
            }
            None
        }
        Value::Object(map) => {
            for v in map.values() {
                if let Some(found) = find_mpreb_in_value(v) {
                    return Some(found);
                }
            }
            None
        }
        Value::Array(arr) => {
            for v in arr {
                if let Some(found) = find_mpreb_in_value(v) {
                    return Some(found);
                }
            }
            None
        }
        _ => None,
    }
}

fn extract_album_header(
    val: &Value,
) -> (
    String,
    String,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
) {
    let header = find_header_renderer(val);

    let mut title = "Álbum".to_string();
    let mut artist = "Artista".to_string();
    let mut artist_id = None;
    let mut year = None;
    let mut artwork_url = None;
    let mut album_type = Some("album".to_string());
    let mut description = None;
    let mut release_date = None;
    let mut copyright = None;

    if let Some(h) = header {
        if let Some(t) = h["title"]["runs"]
            .as_array()
            .and_then(|r| r.first())
            .and_then(|x| x["text"].as_str())
        {
            title = t.to_string();
        } else if let Some(t) = h["title"]["simpleText"].as_str() {
            title = t.to_string();
        }

        if let Some(runs) = h["straplineTextOne"]["runs"].as_array() {
            if let Some(first) = runs.first() {
                if let Some(a) = first["text"].as_str() {
                    artist = a.to_string();
                }
                if let Some(id) = first["navigationEndpoint"]["browseEndpoint"]["browseId"].as_str() {
                    artist_id = Some(id.to_string());
                }
            }
        }

        // Subtitle e secondSubtitle runs (ano, formato e artista fallback)
        let subtitle_runs = h["subtitle"]["runs"].as_array();
        let second_runs = h["secondSubtitle"]["runs"].as_array();
        for runs in [subtitle_runs, second_runs].into_iter().flatten() {
            for r in runs {
                if let Some(txt) = r["text"].as_str() {
                    let trimmed = txt.trim();
                    let lower = trimmed.to_lowercase();
                    if lower.contains("single") {
                        album_type = Some("single".to_string());
                    } else if lower.contains("ep") {
                        album_type = Some("ep".to_string());
                    } else if trimmed.len() == 4 && trimmed.chars().all(|c| c.is_ascii_digit()) {
                        year = Some(trimmed.to_string());
                    } else if artist == "Artista"
                        && !trimmed.is_empty()
                        && trimmed != "•"
                        && trimmed != "Álbum"
                        && trimmed != "Album"
                        && trimmed != "Single"
                        && trimmed != "EP"
                    {
                        artist = trimmed.to_string();
                    }
                }
            }
        }

        artwork_url = extract_thumbnail_from_renderer(&h["thumbnail"])
            .or_else(|| extract_thumbnail_from_renderer(&h["thumbnailRenderer"]));

        if let Some(desc) = h["description"]["musicDescriptionShelfRenderer"]["description"]["runs"].as_array() {
            let d: String = desc.iter().filter_map(|r| r["text"].as_str()).collect::<Vec<_>>().join("");
            if !d.is_empty() {
                description = Some(d);
            }
        } else if let Some(desc) = h["description"]["runs"].as_array() {
            let d: String = desc.iter().filter_map(|r| r["text"].as_str()).collect::<Vec<_>>().join("");
            if !d.is_empty() {
                description = Some(d);
            }
        }
    }

    // Fallback para microformat do YouTube caso header renderer não tenha vindo completo
    if let Some(mf) = val["microformat"]["microformatDataRenderer"].as_object() {
        if title == "Álbum" || title.is_empty() {
            if let Some(t) = mf.get("title").and_then(|x| x.as_str()) {
                title = t.to_string();
            }
        }
        if artwork_url.is_none() {
            if let Some(thumbs) = mf.get("thumbnail").and_then(|t| t.get("thumbnails")).and_then(|t| t.as_array()) {
                artwork_url = thumbs.last().and_then(|t| t["url"].as_str()).map(|s| s.to_string());
            }
        }
        if artist == "Artista" || artist.is_empty() {
            if let Some(d) = mf.get("description").and_then(|x| x.as_str()) {
                if let Some(part) = d.split('•').nth(1) {
                    let a = part.trim();
                    if !a.is_empty() {
                        artist = a.to_string();
                    }
                }
            }
        }
        if let Some(pub_date) = mf
            .get("publishDate")
            .or_else(|| mf.get("uploadDate"))
            .and_then(|x| x.as_str())
        {
            let trimmed_date = pub_date.split('T').next().unwrap_or(pub_date).trim();
            if !trimmed_date.is_empty() {
                release_date = Some(trimmed_date.to_string());
                if year.is_none() && trimmed_date.len() >= 4 {
                    year = Some(trimmed_date[..4].to_string());
                }
            }
        }
    }

    if let Some(desc_str) = &description {
        for line in desc_str.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('℗') || trimmed.starts_with('©') || trimmed.to_lowercase().starts_with("provided to youtube by") {
                copyright = Some(trimmed.to_string());
                break;
            }
        }
    }

    (
        title,
        artist,
        artist_id,
        year,
        artwork_url,
        album_type,
        description,
        release_date,
        copyright,
    )
}

fn extract_album_tracks_from_value(
    val: &Value,
    album_title: &str,
    album_artist: &str,
    album_id: &str,
    default_artwork: Option<&str>,
    tracks: &mut Vec<Track>,
) {
    match val {
        Value::Object(map) => {
            if let Some(item) = map.get("musicResponsiveListItemRenderer") {
                if let Some(mut track) = parse_responsive_item(item) {
                    if track.album.is_none() || track.album.as_deref() == Some("") {
                        track.album = Some(album_title.to_string());
                    }
                    if track.album_id.is_none() {
                        track.album_id = Some(album_id.to_string());
                    }
                    if track.artist == "Artista" || track.artist.is_empty() {
                        track.artist = album_artist.to_string();
                    }
                    if track.artwork_url.is_none() && default_artwork.is_some() {
                        track.artwork_url = default_artwork.map(|s| s.to_string());
                    }
                    tracks.push(track);
                }
            } else {
                for (k, v) in map {
                    if k == "musicCarouselShelfRenderer" {
                        continue;
                    }
                    extract_album_tracks_from_value(
                        v,
                        album_title,
                        album_artist,
                        album_id,
                        default_artwork,
                        tracks,
                    );
                }
            }
        }
        Value::Array(arr) => {
            for v in arr {
                extract_album_tracks_from_value(v, album_title, album_artist, album_id, default_artwork, tracks);
            }
        }
        _ => {}
    }
}

pub async fn get_user_albums(session: &AuthSession) -> Result<Vec<Album>, String> {
    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let mut albums = Vec::new();

    // 1. Se autenticado, busca da biblioteca do usuário FEmusic_liked_albums
    if session.is_authenticated {
        let payload = json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20240401.01.00",
                    "hl": "pt",
                    "gl": "BR"
                }
            },
            "browseId": "FEmusic_liked_albums"
        });

        if let Ok(resp) = client.post(url).headers(headers.clone()).json(&payload).send().await {
            if resp.status().is_success() {
                if let Ok(json_val) = resp.json::<Value>().await {
                    extract_albums_from_value(&json_val, &mut albums);
                }
            }
        }
    }

    // 2. Se a biblioteca estiver vazia (ou usuário anônimo), busca lançamentos / novidades de álbuns
    if albums.is_empty() {
        let payload = json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20240401.01.00",
                    "hl": "pt",
                    "gl": "BR"
                }
            },
            "browseId": "FEmusic_new_releases"
        });

        if let Ok(resp) = client.post(url).headers(headers.clone()).json(&payload).send().await {
            if resp.status().is_success() {
                if let Ok(json_val) = resp.json::<Value>().await {
                    extract_albums_from_value(&json_val, &mut albums);
                }
            }
        }
    }

    // 3. Fallback extra: busca "top albums"
    if albums.is_empty() {
        let search_url = "https://music.youtube.com/youtubei/v1/search?prettyPrint=false";
        let search_payload = json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20240401.01.00",
                    "hl": "pt",
                    "gl": "BR"
                }
            },
            "query": "top albums",
            "params": "EgWKAQIYAWoKEAMQBBAJEAoQBQ%3D%3D"
        });

        if let Ok(resp) = client.post(search_url).headers(headers).json(&search_payload).send().await {
            if resp.status().is_success() {
                if let Ok(json_val) = resp.json::<Value>().await {
                    extract_albums_from_value(&json_val, &mut albums);
                }
            }
        }
    }

    // Deduplica mantendo a ordem
    let mut seen = std::collections::HashSet::new();
    albums.retain(|a| seen.insert(a.id.clone()));

    Ok(albums)
}

pub async fn get_album_details(session: &AuthSession, browse_id: &str) -> Result<AlbumDetail, String> {
    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let clean_id = if browse_id.starts_with("VL") {
        browse_id.to_string()
    } else if browse_id.starts_with("OLAK5uy_") {
        format!("VL{browse_id}")
    } else {
        browse_id.to_string()
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
        "browseId": clean_id
    });

    let resp = client
        .post(url)
        .headers(headers.clone())
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Erro ao buscar álbum ({browse_id}): {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("YouTube Music retornou status {} ao buscar álbum", resp.status()));
    }

    let json_val: Value = resp.json().await.map_err(|e| format!("Erro ao parsear dados do álbum: {e}"))?;

    // Se recebemos um playlist ID (VL / OLAK5uy_) e não há header de álbum,
    // verifica se encontramos o browseId canônico do álbum (MPREb_) para redirecionamento transparente
    if find_header_renderer(&json_val).is_none() && clean_id.starts_with("VL") {
        if let Some(canonical_mpreb) = find_mpreb_in_value(&json_val) {
            return Box::pin(get_album_details(session, &canonical_mpreb)).await;
        }
    }

    // Extrair Header do Álbum
    let (mut title, mut artist, artist_id, year, mut artwork_url, album_type, description, release_date, copyright) =
        extract_album_header(&json_val);

    // Extrair Faixas (com suporte a paginação por continuation token para álbuns extensos — #90)
    let mut tracks = Vec::new();
    extract_album_tracks_from_value(
        &json_val,
        &title,
        &artist,
        browse_id,
        artwork_url.as_deref(),
        &mut tracks,
    );

    let mut current_token = extract_continuation_token(&json_val);
    let mut pages_fetched = 1;
    const MAX_ALBUM_PAGES: usize = 10;

    while let Some(token) = current_token {
        if pages_fetched >= MAX_ALBUM_PAGES {
            break;
        }
        pages_fetched += 1;

        let cont_url = format!(
            "https://music.youtube.com/youtubei/v1/browse?continuation={token}&prettyPrint=false"
        );
        let cont_payload = json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20240401.01.00",
                    "hl": "pt",
                    "gl": "BR"
                }
            },
            "continuation": token
        });

        let cont_resp = match client
            .post(&cont_url)
            .headers(headers.clone())
            .json(&cont_payload)
            .send()
            .await
        {
            Ok(r) if r.status().is_success() => r,
            _ => break,
        };

        let cont_json: Value = match cont_resp.json().await {
            Ok(v) => v,
            Err(_) => break,
        };

        let prev_len = tracks.len();
        extract_album_tracks_from_value(
            &cont_json,
            &title,
            &artist,
            browse_id,
            artwork_url.as_deref(),
            &mut tracks,
        );
        if tracks.len() == prev_len {
            break;
        }

        current_token = extract_continuation_token(&cont_json);
    }

    // Deduplica faixas preservando ordem
    let mut seen_tracks = std::collections::HashSet::new();
    tracks.retain(|t| seen_tracks.insert(t.id.clone()));

    // Fallbacks essenciais caso o header não tenha trazido metadados completos
    if artwork_url.is_none() {
        artwork_url = tracks.iter().find_map(|t| t.artwork_url.clone());
    }
    if (artist == "Artista" || artist.is_empty()) && !tracks.is_empty() {
        artist = tracks[0].artist.clone();
    }
    if (title == "Álbum" || title.is_empty()) && !tracks.is_empty() {
        if let Some(a) = tracks.iter().find_map(|t| t.album.clone()).filter(|a| !a.is_empty()) {
            title = a;
        }
    }

    // Garante que todas as faixas tenham artwork_url e álbum definidos
    if let Some(art) = &artwork_url {
        for t in &mut tracks {
            if t.artwork_url.is_none() {
                t.artwork_url = Some(art.clone());
            }
            if t.album.is_none() || t.album.as_deref() == Some("") {
                t.album = Some(title.clone());
            }
        }
    }

    let track_count = Some(tracks.len() as u32);

    let total_secs: u64 = tracks
        .iter()
        .filter_map(|t| {
            t.duration.as_deref().and_then(|d| {
                let parts: Vec<&str> = d.split(':').collect();
                if parts.len() == 2 {
                    let m: u64 = parts[0].parse().ok()?;
                    let s: u64 = parts[1].parse().ok()?;
                    Some(m * 60 + s)
                } else if parts.len() == 3 {
                    let h: u64 = parts[0].parse().ok()?;
                    let m: u64 = parts[1].parse().ok()?;
                    let s: u64 = parts[2].parse().ok()?;
                    Some(h * 3600 + m * 60 + s)
                } else {
                    None
                }
            })
        })
        .sum();

    let duration_text = if total_secs > 0 {
        let mins = total_secs / 60;
        let secs = total_secs % 60;
        Some(format!("{mins} min {secs} s"))
    } else {
        None
    };

    // Extrair álbuns relacionados (More by artist)
    let mut related_albums = Vec::new();
    extract_albums_from_value(&json_val, &mut related_albums);
    related_albums.retain(|a| a.id != browse_id && !a.title.is_empty() && a.title != title);
    related_albums.truncate(6);

    Ok(AlbumDetail {
        id: browse_id.to_string(),
        title,
        artist,
        artist_id,
        year,
        artwork_url,
        track_count,
        duration_text,
        album_type,
        description,
        release_date,
        copyright,
        tracks,
        related_albums,
    })
}

pub async fn search_albums(session: &AuthSession, query: &str) -> Result<Vec<Album>, String> {
    let client = &HTTP_CLIENT;
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
        "query": query,
        "params": "EgWKAQIYAWoKEAkQBRAKEAMQBA%3D%3D"
    });

    let mut albums = Vec::new();

    if let Ok(resp) = client.post(url).headers(headers.clone()).json(&payload).send().await {
        if resp.status().is_success() {
            if let Ok(json_val) = resp.json::<Value>().await {
                extract_albums_from_value(&json_val, &mut albums);
            }
        }
    }

    // Fallback de busca caso params restrito não retorne nada
    if albums.is_empty() {
        let fallback_payload = json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20240401.01.00",
                    "hl": "pt",
                    "gl": "BR"
                }
            },
            "query": format!("{query} album")
        });

        if let Ok(resp) = client.post(url).headers(headers).json(&fallback_payload).send().await {
            if resp.status().is_success() {
                if let Ok(json_val) = resp.json::<Value>().await {
                    extract_albums_from_value(&json_val, &mut albums);
                }
            }
        }
    }

    // Deduplicação estrita por id de álbum
    let mut seen = std::collections::HashSet::new();
    albums.retain(|a| seen.insert(a.id.clone()));

    Ok(albums)
}

pub async fn search_album_by_name(session: &AuthSession, query: &str) -> Result<Option<Album>, String> {
    let albums = search_albums(session, query).await?;
    Ok(albums.into_iter().next())
}

pub fn extract_artist_browse_id_from_search(val: &Value, target_name: &str) -> Option<String> {
    let target_lower = target_name.trim().to_lowercase();
    let tabs = val["contents"]["tabbedSearchResultsRenderer"]["tabs"].as_array()?;

    for tab in tabs {
        let Some(sec_contents) = tab["tabRenderer"]["content"]["sectionListRenderer"]["contents"].as_array() else {
            continue;
        };

        // 1. Prioridade: musicCardShelfRenderer (Card de destaque do artista)
        for sec in sec_contents {
            if let Some(card) = sec.get("musicCardShelfRenderer") {
                if let Some(bid) = card["title"]["runs"]
                    .as_array()
                    .and_then(|r| r.first())
                    .and_then(|x| x["navigationEndpoint"]["browseEndpoint"]["browseId"].as_str())
                    .filter(|id| id.starts_with("UC"))
                {
                    return Some(bid.to_string());
                }
                if let Some(bid) = card["onTap"]["browseEndpoint"]["browseId"]
                    .as_str()
                    .filter(|id| id.starts_with("UC"))
                {
                    return Some(bid.to_string());
                }
            }
        }

        // 2. Linhas diretas de resultado de artista (musicResponsiveListItemRenderer com navigationEndpoint UC...)
        for sec in sec_contents {
            if let Some(shelf) = sec.get("musicShelfRenderer") {
                if let Some(items) = shelf["contents"].as_array() {
                    for item in items {
                        let r = &item["musicResponsiveListItemRenderer"];
                        if let Some(bid) = r["navigationEndpoint"]["browseEndpoint"]["browseId"]
                            .as_str()
                            .filter(|id| id.starts_with("UC"))
                        {
                            return Some(bid.to_string());
                        }
                    }
                }
            }
        }

        // 3. Fallback: procurar dentro das colunas de faixas pelo run do artista correspondente
        let mut first_fallback_uc: Option<String> = None;
        for sec in sec_contents {
            if let Some(shelf) = sec.get("musicShelfRenderer") {
                if let Some(items) = shelf["contents"].as_array() {
                    for item in items {
                        let r = &item["musicResponsiveListItemRenderer"];
                        if let Some(flex) = r["flexColumns"].as_array() {
                            if flex.len() > 1 {
                                if let Some(runs) = flex[1]["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"].as_array() {
                                    for run in runs {
                                        if let Some(bid) = run["navigationEndpoint"]["browseEndpoint"]["browseId"]
                                            .as_str()
                                            .filter(|id| id.starts_with("UC"))
                                        {
                                            let run_text = run["text"].as_str().unwrap_or("").trim().to_lowercase();
                                            if !target_lower.is_empty() && (run_text == target_lower || run_text.contains(&target_lower) || target_lower.contains(&run_text)) {
                                                return Some(bid.to_string());
                                            }
                                            if first_fallback_uc.is_none() {
                                                first_fallback_uc = Some(bid.to_string());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if first_fallback_uc.is_none() {
                            if let Some(menu_items) = r["menu"]["menuRenderer"]["items"].as_array() {
                                for mi in menu_items {
                                    if let Some(bid) = mi["menuNavigationItemRenderer"]["navigationEndpoint"]["browseEndpoint"]["browseId"]
                                        .as_str()
                                        .filter(|id| id.starts_with("UC"))
                                    {
                                        first_fallback_uc = Some(bid.to_string());
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if first_fallback_uc.is_some() {
            return first_fallback_uc;
        }
    }

    None
}

async fn resolve_artist_browse_id(session: &AuthSession, query: &str) -> Option<String> {
    let client = &HTTP_CLIENT;
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

    if let Ok(resp) = client.post(url).headers(headers).json(&payload).send().await {
        if resp.status().is_success() {
            if let Ok(json_val) = resp.json::<Value>().await {
                if let Some(bid) = extract_artist_browse_id_from_search(&json_val, query) {
                    return Some(bid);
                }
            }
        }
    }

    None
}

fn clean_artist_query(raw: &str) -> String {
    raw.replace(" - Tema", "")
        .replace(" - Topic", "")
        .trim()
        .to_string()
}

pub async fn get_artist_details(
    session: &AuthSession,
    artist_id: Option<&str>,
    artist_name: Option<&str>,
) -> Result<ArtistDetail, String> {
    let fallback_name = artist_name
        .map(clean_artist_query)
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "Artista".to_string());

    let mut resolved_uc_id = artist_id
        .map(|s| s.trim())
        .filter(|s| s.starts_with("UC"))
        .map(|s| s.to_string());

    if resolved_uc_id.is_none() && fallback_name != "Artista" {
        resolved_uc_id = resolve_artist_browse_id(session, &fallback_name).await;

        if resolved_uc_id.is_none() {
            // Se for uma string composta ex: "MIMI (part. Kasane Teto)" ou "MIMI & TAK", tenta o artista principal
            let primary = fallback_name
                .split(['(', ',', '&', '/'])
                .next()
                .map(|s| s.trim())
                .unwrap_or("");
            if !primary.is_empty() && primary != fallback_name {
                resolved_uc_id = resolve_artist_browse_id(session, primary).await;
            }
        }
    }

    if let Some(uc_id) = resolved_uc_id {
        let client = &HTTP_CLIENT;
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
            "browseId": uc_id
        });

        if let Ok(resp) = client.post(url).headers(headers).json(&payload).send().await {
            if resp.status().is_success() {
                if let Ok(json_val) = resp.json::<Value>().await {
                    let hdr_obj = &json_val["header"];
                    let hdr = hdr_obj
                        .get("musicImmersiveHeaderRenderer")
                        .or_else(|| hdr_obj.get("musicVisualHeaderRenderer"))
                        .or_else(|| hdr_obj.get("musicResponsiveHeaderRenderer"))
                        .or_else(|| hdr_obj.get("c4TabbedHeaderRenderer"));

                    let mut name = fallback_name.clone();
                    let mut subscribers = None;
                    let mut monthly_listeners = None;
                    let mut description = None;
                    let mut artwork_url = None;

                    if let Some(h) = hdr {
                        if let Some(runs) = h["title"]["runs"].as_array() {
                            let joined: String = runs.iter().filter_map(|r| r["text"].as_str()).collect();
                            if !joined.trim().is_empty() {
                                name = joined.trim().to_string();
                            }
                        } else if let Some(t) = h["title"].as_str() {
                            if !t.trim().is_empty() {
                                name = t.trim().to_string();
                            }
                        }

                        if let Some(runs) = h["subscriptionButton"]["subscribeButtonRenderer"]["longSubscriberCountText"]["runs"].as_array() {
                            let s: String = runs.iter().filter_map(|r| r["text"].as_str()).collect();
                            if !s.trim().is_empty() {
                                subscribers = Some(s.replace('\u{a0}', " ").trim().to_string());
                            }
                        }
                        if subscribers.is_none() {
                            if let Some(runs) = h["subscriptionButton"]["subscribeButtonRenderer"]["subscriberCountText"]["runs"].as_array() {
                                let s: String = runs.iter().filter_map(|r| r["text"].as_str()).collect();
                                if !s.trim().is_empty() {
                                    subscribers = Some(s.replace('\u{a0}', " ").trim().to_string());
                                }
                            }
                        }

                        if let Some(runs) = h["monthlyListenerCount"]["runs"].as_array() {
                            let m: String = runs.iter().filter_map(|r| r["text"].as_str()).collect();
                            if !m.trim().is_empty() {
                                monthly_listeners = Some(m.replace('\u{a0}', " ").trim().to_string());
                            }
                        }

                        if let Some(runs) = h["description"]["runs"].as_array() {
                            let d: String = runs.iter().filter_map(|r| r["text"].as_str()).collect();
                            if !d.trim().is_empty() {
                                description = Some(d.trim().to_string());
                            }
                        }

                        artwork_url = extract_thumbnail_from_renderer(&h["thumbnail"])
                            .or_else(|| extract_thumbnail_from_renderer(&h["foregroundThumbnail"]))
                            .or_else(|| extract_thumbnail_from_renderer(&h["avatar"]));
                    }

                    let mut shelf_tracks = Vec::new();
                    let mut songs_playlist_id: Option<String> = None;
                    let mut albums = Vec::new();

                    if let Some(shelves) = json_val["contents"]["singleColumnBrowseResultsRenderer"]["tabs"]
                        .as_array()
                        .and_then(|t| t.first())
                        .and_then(|t| t["tabRenderer"]["content"]["sectionListRenderer"]["contents"].as_array())
                    {
                        for s in shelves {
                            if let Some(ms) = s.get("musicShelfRenderer") {
                                extract_tracks_from_value(ms, &mut shelf_tracks);
                                if songs_playlist_id.is_none() {
                                    if let Some(bid) = ms["bottomEndpoint"]["browseEndpoint"]["browseId"].as_str() {
                                        if !bid.trim().is_empty() {
                                            songs_playlist_id = Some(bid.to_string());
                                        }
                                    }
                                }
                            } else if let Some(cs) = s.get("musicCarouselShelfRenderer") {
                                extract_albums_from_value(cs, &mut albums);
                            } else if let Some(ds) = s.get("musicDescriptionShelfRenderer") {
                                if description.is_none() {
                                    if let Some(runs) = ds["description"]["runs"].as_array() {
                                        let d: String = runs.iter().filter_map(|r| r["text"].as_str()).collect();
                                        if !d.trim().is_empty() {
                                            description = Some(d.trim().to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }

                    let mut tracks = if let Some(pl_id) = songs_playlist_id {
                        match get_playlist_tracks_with_limit(session, &pl_id, 2).await {
                            Ok(mut full_tracks) if !full_tracks.is_empty() => {
                                for st in shelf_tracks {
                                    if !full_tracks.iter().any(|t| t.id == st.id) {
                                        full_tracks.push(st);
                                    }
                                }
                                full_tracks
                            }
                            _ => shelf_tracks,
                        }
                    } else {
                        shelf_tracks
                    };

                    if tracks.is_empty() {
                        if let Ok(searched) = search_music(session, &name).await {
                            tracks = searched;
                        }
                    }

                    let mut seen_tracks = std::collections::HashSet::new();
                    tracks.retain(|t| seen_tracks.insert(t.id.clone()));
                    for t in &mut tracks {
                        if t.artist == "Artista" || t.artist.trim().is_empty() {
                            t.artist = name.clone();
                        }
                        if t.artist_id.is_none() {
                            t.artist_id = Some(uc_id.clone());
                        }
                    }

                    let mut seen_albums = std::collections::HashSet::new();
                    albums.retain(|a| seen_albums.insert(a.id.clone()));
                    for a in &mut albums {
                        if a.artist == "Artista" || a.artist.trim().is_empty() {
                            a.artist = name.clone();
                        }
                        if a.artist_id.is_none() {
                            a.artist_id = Some(uc_id.clone());
                        }
                    }

                    if artwork_url.is_none() {
                        artwork_url = tracks
                            .iter()
                            .find_map(|t| t.artwork_url.clone())
                            .or_else(|| albums.iter().find_map(|a| a.artwork_url.clone()));
                    }

                    return Ok(ArtistDetail {
                        id: uc_id,
                        name,
                        description,
                        subscribers,
                        monthly_listeners,
                        artwork_url,
                        tracks,
                        albums,
                    });
                }
            }
        }
    }

    // Fallback caso não exista página oficial de canal UC... (ex: uploaders independentes)
    let mut tracks = search_music(session, &fallback_name).await.unwrap_or_default();
    let lower_fallback = fallback_name.to_lowercase();
    let filtered: Vec<Track> = tracks
        .iter()
        .filter(|t| {
            let al = t.artist.to_lowercase();
            al.contains(&lower_fallback) || lower_fallback.contains(&al)
        })
        .cloned()
        .collect();
    if !filtered.is_empty() {
        tracks = filtered;
    }

    let artwork_url = tracks.iter().find_map(|t| t.artwork_url.clone());

    Ok(ArtistDetail {
        id: format!("artist_{fallback_name}"),
        name: fallback_name,
        description: None,
        subscribers: None,
        monthly_listeners: None,
        artwork_url,
        tracks,
        albums: Vec::new(),
    })
}

// =========================================================================
// OPERAÇÕES DE MANIPULAÇÃO DE PLAYLIST (InnerTube API)
// =========================================================================

pub async fn create_playlist(
    session: &AuthSession,
    title: &str,
    description: Option<&str>,
    privacy_status: Option<&str>,
) -> Result<Playlist, String> {
    if !session.is_authenticated {
        return Err("Usuário não autenticado no YouTube Music".to_string());
    }

    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/playlist/create?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let privacy = match privacy_status.unwrap_or("PRIVATE").to_uppercase().as_str() {
        "PUBLIC" => "PUBLIC",
        "UNLISTED" => "UNLISTED",
        _ => "PRIVATE",
    };

    let mut payload = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "pt",
                "gl": "BR"
            }
        },
        "title": title.trim(),
        "privacyStatus": privacy
    });

    if let Some(desc) = description {
        if !desc.trim().is_empty() {
            payload["description"] = json!(desc.trim());
        }
    }

    let resp = client
        .post(url)
        .headers(headers)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Falha de conexão ao criar playlist: {e}"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Falha ao ler resposta da criação de playlist: {e}"))?;

    if !status.is_success() {
        return Err(format!("YouTube Music retornou status {status} ao criar playlist: {text}"));
    }

    let json_val: Value = serde_json::from_str(&text)
        .map_err(|e| format!("Resposta inválida ao criar playlist: {e}"))?;

    let playlist_id = json_val["playlistId"]
        .as_str()
        .ok_or_else(|| format!("YouTube Music não retornou ID da playlist criada. Resposta: {text}"))?;

    let canonical_id = if playlist_id.starts_with("VL") {
        playlist_id.to_string()
    } else {
        format!("VL{playlist_id}")
    };

    let sub = match privacy {
        "PUBLIC" => "Pública",
        "UNLISTED" => "Não listada",
        _ => "Privada",
    };

    Ok(Playlist {
        id: canonical_id,
        title: title.trim().to_string(),
        subtitle: Some(sub.to_string()),
        artwork_url: None,
        track_count: Some("0 músicas".to_string()),
    })
}

pub async fn add_track_to_playlist(
    session: &AuthSession,
    playlist_id: &str,
    video_id: &str,
) -> Result<(), String> {
    if !session.is_authenticated {
        return Err("Usuário não autenticado no YouTube Music".to_string());
    }

    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/browse/edit_playlist?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    // InnerTube edit_playlist requer o ID limpo sem prefixo "VL"
    let clean_id = playlist_id.strip_prefix("VL").unwrap_or(playlist_id);

    let payload = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "pt",
                "gl": "BR"
            }
        },
        "playlistId": clean_id,
        "actions": [
            {
                "action": "ACTION_ADD_VIDEO",
                "addedVideoId": video_id
            }
        ]
    });

    let resp = client
        .post(url)
        .headers(headers)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Falha de conexão ao adicionar música: {e}"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Falha ao ler resposta da adição de música: {e}"))?;

    if !status.is_success() {
        return Err(format!("YouTube Music retornou status {status} ao adicionar música: {text}"));
    }

    let json_val: Value = serde_json::from_str(&text)
        .map_err(|e| format!("Resposta inválida ao adicionar música: {e}"))?;

    let res_status = json_val["status"].as_str().unwrap_or("");
    if !res_status.is_empty() && res_status != "STATUS_SUCCEEDED" && res_status != "STATUS_SUCCESS" {
        return Err(format!("Operação rejeitada pelo YouTube Music: {res_status}"));
    }

    Ok(())
}

pub async fn remove_track_from_playlist(
    session: &AuthSession,
    playlist_id: &str,
    video_id: &str,
    set_video_id: Option<&str>,
) -> Result<(), String> {
    if !session.is_authenticated {
        return Err("Usuário não autenticado no YouTube Music".to_string());
    }

    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/browse/edit_playlist?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let clean_id = playlist_id.strip_prefix("VL").unwrap_or(playlist_id);

    // Se temos set_video_id, usamos ACTION_REMOVE_VIDEO (específico desta entrada na playlist)
    // Se falhar ou não tivermos set_video_id, tentamos ACTION_REMOVE_VIDEO_BY_VIDEO_ID
    let action = if let Some(svid) = set_video_id.filter(|s| !s.is_empty()) {
        json!({
            "action": "ACTION_REMOVE_VIDEO",
            "setVideoId": svid
        })
    } else {
        json!({
            "action": "ACTION_REMOVE_VIDEO_BY_VIDEO_ID",
            "removedVideoId": video_id
        })
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
        "playlistId": clean_id,
        "actions": [action]
    });

    let resp = client
        .post(url)
        .headers(headers.clone())
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Falha de conexão ao remover música: {e}"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Falha ao ler resposta da remoção de música: {e}"))?;

    if !status.is_success() {
        // Se tentou com set_video_id e falhou, tenta o fallback por removedVideoId
        if set_video_id.is_some() {
            let fallback_payload = json!({
                "context": {
                    "client": {
                        "clientName": "WEB_REMIX",
                        "clientVersion": "1.20240401.01.00",
                        "hl": "pt",
                        "gl": "BR"
                    }
                },
                "playlistId": clean_id,
                "actions": [
                    {
                        "action": "ACTION_REMOVE_VIDEO_BY_VIDEO_ID",
                        "removedVideoId": video_id
                    }
                ]
            });

            if let Ok(fallback_resp) = client.post(url).headers(headers).json(&fallback_payload).send().await {
                if fallback_resp.status().is_success() {
                    return Ok(());
                }
            }
        }
        return Err(format!("YouTube Music retornou status {status} ao remover música: {text}"));
    }

    Ok(())
}

pub async fn edit_playlist_metadata(
    session: &AuthSession,
    playlist_id: &str,
    title: &str,
    description: Option<&str>,
) -> Result<(), String> {
    if !session.is_authenticated {
        return Err("Usuário não autenticado no YouTube Music".to_string());
    }

    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/browse/edit_playlist?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let clean_id = playlist_id.strip_prefix("VL").unwrap_or(playlist_id);

    let mut actions = vec![
        json!({
            "action": "ACTION_SET_PLAYLIST_NAME",
            "playlistName": title.trim()
        })
    ];

    if let Some(desc) = description {
        actions.push(json!({
            "action": "ACTION_SET_PLAYLIST_DESCRIPTION",
            "playlistDescription": desc.trim()
        }));
    }

    let payload = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240401.01.00",
                "hl": "pt",
                "gl": "BR"
            }
        },
        "playlistId": clean_id,
        "actions": actions
    });

    let resp = client
        .post(url)
        .headers(headers)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Falha de conexão ao editar metadados: {e}"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Falha ao ler resposta da edição de metadados: {e}"))?;

    if !status.is_success() {
        return Err(format!("YouTube Music retornou status {status} ao editar playlist: {text}"));
    }

    Ok(())
}

fn extract_library_remove_feedback_token(val: &Value) -> Option<String> {
    match val {
        Value::Object(map) => {
            if let Some(toggle) = map.get("toggleButtonRenderer").or_else(|| map.get("toggleMenuServiceItemRenderer")) {
                let icon_type = toggle
                    .get("defaultIcon")
                    .and_then(|i| i.get("iconType"))
                    .and_then(|t| t.as_str())
                    .unwrap_or("");
                let toggled_icon_type = toggle
                    .get("toggledIcon")
                    .and_then(|i| i.get("iconType"))
                    .and_then(|t| t.as_str())
                    .unwrap_or("");
                let is_toggled = toggle.get("isToggled").and_then(|b| b.as_bool()).unwrap_or(false);

                if icon_type == "BOOKMARK" || icon_type == "LIBRARY_SAVED" {
                    if let Some(tok) = toggle["defaultServiceEndpoint"]["feedbackEndpoint"]["feedbackToken"].as_str() {
                        if !tok.is_empty() {
                            return Some(tok.to_string());
                        }
                    }
                }
                if (icon_type == "BOOKMARK_BORDER" || icon_type == "LIBRARY_ADD" || toggled_icon_type == "BOOKMARK" || toggled_icon_type == "LIBRARY_SAVED") && is_toggled {
                    if let Some(tok) = toggle["toggledServiceEndpoint"]["feedbackEndpoint"]["feedbackToken"].as_str() {
                        if !tok.is_empty() {
                            return Some(tok.to_string());
                        }
                    }
                }
            }
            for (k, v) in map {
                if k == "musicPlaylistShelfRenderer" {
                    continue;
                }
                if let Some(found) = extract_library_remove_feedback_token(v) {
                    return Some(found);
                }
            }
            None
        }
        Value::Array(arr) => {
            for v in arr {
                if let Some(found) = extract_library_remove_feedback_token(v) {
                    return Some(found);
                }
            }
            None
        }
        _ => None,
    }
}

pub async fn delete_playlist(
    session: &AuthSession,
    playlist_id: &str,
) -> Result<(), String> {
    if !session.is_authenticated {
        return Err("Usuário não autenticado no YouTube Music".to_string());
    }

    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/playlist/delete?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let clean_id = playlist_id.strip_prefix("VL").unwrap_or(playlist_id);
    let context_obj = json!({
        "client": {
            "clientName": "WEB_REMIX",
            "clientVersion": "1.20240401.01.00",
            "hl": "pt",
            "gl": "BR"
        }
    });

    // 1. Tenta excluir a playlist diretamente (para playlists criadas pelo próprio usuário)
    let payload = json!({
        "context": context_obj,
        "playlistId": clean_id
    });

    let resp = client
        .post(url)
        .headers(headers.clone())
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Falha de conexão ao excluir playlist: {e}"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Falha ao ler resposta da exclusão: {e}"))?;

    if status.is_success() {
        return Ok(());
    }

    // 2. Fallback para playlists de terceiros/comunidade salvas na biblioteca do usuário:
    // No YouTube Music, playlists criadas por outros usuários (ex: amigos/canais) retornam 403 Forbidden
    // em `playlist/delete`, pois devem ser removidas da biblioteca via `like/removelike` (status INDIFFERENT).
    let removelike_url = "https://music.youtube.com/youtubei/v1/like/removelike?prettyPrint=false";
    for candidate_id in [clean_id, playlist_id] {
        let removelike_payload = json!({
            "context": context_obj,
            "target": {
                "playlistId": candidate_id
            }
        });

        if let Ok(rem_resp) = client
            .post(removelike_url)
            .headers(headers.clone())
            .json(&removelike_payload)
            .send()
            .await
        {
            if rem_resp.status().is_success() {
                return Ok(());
            }
        }
    }

    // 3. Fallback adicional via feedbackToken da página da playlist (caso a biblioteca use feedbackEndpoint)
    let browse_id = if playlist_id.starts_with("VL") || playlist_id.starts_with("FE") {
        playlist_id.to_string()
    } else {
        format!("VL{playlist_id}")
    };
    let browse_url = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
    let browse_payload = json!({
        "context": context_obj,
        "browseId": browse_id
    });

    if let Ok(b_resp) = client
        .post(browse_url)
        .headers(headers.clone())
        .json(&browse_payload)
        .send()
        .await
    {
        if b_resp.status().is_success() {
            if let Ok(b_json) = b_resp.json::<Value>().await {
                if let Some(token) = extract_library_remove_feedback_token(&b_json) {
                    let feedback_url = "https://music.youtube.com/youtubei/v1/feedback?prettyPrint=false";
                    let feedback_payload = json!({
                        "context": context_obj,
                        "feedbackTokens": [token]
                    });
                    if let Ok(fb_resp) = client
                        .post(feedback_url)
                        .headers(headers)
                        .json(&feedback_payload)
                        .send()
                        .await
                    {
                        if fb_resp.status().is_success() {
                            return Ok(());
                        }
                    }
                }
            }
        }
    }

    if status.as_u16() == 403 {
        return Err(
            "O YouTube Music recusou a operação (403 Permissão Negada). Verifique se sua conta está autenticada corretamente."
                .to_string(),
        );
    }

    Err(format!("YouTube Music retornou status {status} ao excluir playlist: {text}"))
}

pub async fn reorder_playlist_track(
    session: &AuthSession,
    playlist_id: &str,
    set_video_id: &str,
    successor_set_video_id: Option<&str>,
    predecessor_set_video_id: Option<&str>,
    was_adjacent_to_end: bool,
) -> Result<(), String> {
    if !session.is_authenticated {
        return Err("Usuário não autenticado no YouTube Music".to_string());
    }

    if set_video_id.trim().is_empty() {
        return Err("Esta faixa ainda não possui identificador de posição (setVideoId). Recarregue a playlist.".to_string());
    }

    let client = &HTTP_CLIENT;
    let url = "https://music.youtube.com/youtubei/v1/browse/edit_playlist?prettyPrint=false";
    let headers = build_headers(session, "WEB_REMIX");

    let clean_id = playlist_id.strip_prefix("VL").unwrap_or(playlist_id);

    let actions = if let Some(succ) = successor_set_video_id.filter(|s| !s.trim().is_empty()) {
        vec![json!({
            "action": "ACTION_MOVE_VIDEO_BEFORE",
            "setVideoId": set_video_id,
            "movedSetVideoIdSuccessor": succ
        })]
    } else if let Some(pred) = predecessor_set_video_id.filter(|s| !s.trim().is_empty()) {
        // Movendo para a última posição da playlist de forma 100% determinística via ACTION_MOVE_VIDEO_BEFORE:
        // Se já estava imediatamente antes do último item (was_adjacent_to_end), basta mover o último antes dele.
        // Caso contrário, posiciona antes do último e em seguida move o último para antes dele na mesma transação.
        if was_adjacent_to_end {
            vec![json!({
                "action": "ACTION_MOVE_VIDEO_BEFORE",
                "setVideoId": pred,
                "movedSetVideoIdSuccessor": set_video_id
            })]
        } else {
            vec![
                json!({
                    "action": "ACTION_MOVE_VIDEO_BEFORE",
                    "setVideoId": set_video_id,
                    "movedSetVideoIdSuccessor": pred
                }),
                json!({
                    "action": "ACTION_MOVE_VIDEO_BEFORE",
                    "setVideoId": pred,
                    "movedSetVideoIdSuccessor": set_video_id
                }),
            ]
        }
    } else {
        vec![json!({
            "action": "ACTION_MOVE_VIDEO_BEFORE",
            "setVideoId": set_video_id
        })]
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
        "playlistId": clean_id,
        "actions": actions
    });

    let resp = client
        .post(url)
        .headers(headers)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Falha de conexão ao reordenar música: {e}"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Falha ao ler resposta da reordenação: {e}"))?;

    if !status.is_success() {
        return Err(format!("YouTube Music retornou status {status} ao reordenar playlist: {text}"));
    }

    let json_val: Value = serde_json::from_str(&text)
        .map_err(|e| format!("Resposta inválida ao reordenar música: {e}"))?;

    let res_status = json_val["status"].as_str().unwrap_or("");
    if !res_status.is_empty() && res_status != "STATUS_SUCCEEDED" && res_status != "STATUS_SUCCESS" {
        return Err(format!("Reordenação rejeitada pelo YouTube Music: {res_status}"));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::load_saved_google_session;

    #[test]
    fn test_extract_continuation_token_command() {
        let json_data = json!({
            "contents": {
                "musicPlaylistShelfRenderer": {
                    "continuations": [
                        {
                            "nextContinuationData": {
                                "continuation": "token_abc_123"
                            }
                        }
                    ]
                }
            }
        });

        assert_eq!(extract_continuation_token(&json_data), Some("token_abc_123".to_string()));
    }

    #[test]
    fn test_extract_continuation_token_continuation_command() {
        let json_data = json!({
            "sectionListContinuation": {
                "continuations": [
                    {
                        "continuationCommand": {
                            "token": "token_xyz_456"
                        }
                    }
                ]
            }
        });

        assert_eq!(extract_continuation_token(&json_data), Some("token_xyz_456".to_string()));
    }

    #[test]
    fn test_extract_continuation_token_none() {
        let json_data = json!({
            "contents": {
                "musicPlaylistShelfRenderer": {
                    "contents": []
                }
            }
        });

        assert_eq!(extract_continuation_token(&json_data), None);
    }

    #[test]
    fn test_extract_continuation_token_item_renderer_priority() {
        let json_data = json!({
            "contents": {
                "twoColumnBrowseResultsRenderer": {
                    "tabs": [{
                        "tabRenderer": {
                            "content": {
                                "sectionListRenderer": {
                                    "contents": [{
                                        "musicPlaylistShelfRenderer": {
                                            "contents": [
                                                {"musicResponsiveListItemRenderer": {}},
                                                {
                                                    "continuationItemRenderer": {
                                                        "continuationEndpoint": {
                                                            "continuationCommand": {
                                                                "token": "token_playlist_shelf_789"
                                                            }
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }],
                                    "continuations": [{
                                        "nextContinuationData": {
                                            "continuation": "token_wrong_section_carousel"
                                        }
                                    }]
                                }
                            }
                        }
                    }]
                }
            }
        });

        assert_eq!(
            extract_continuation_token(&json_data),
            Some("token_playlist_shelf_789".to_string())
        );
    }

    #[test]
    fn test_extract_continuation_token_continuation_contents() {
        let json_data = json!({
            "continuationContents": {
                "musicPlaylistShelfContinuation": {
                    "continuations": [
                        {
                            "nextContinuationData": {
                                "continuation": "next_page_token_999"
                            }
                        }
                    ]
                }
            }
        });

        assert_eq!(
            extract_continuation_token(&json_data),
            Some("next_page_token_999".to_string())
        );
    }

    #[test]
    fn test_extract_artist_browse_id_from_search() {
        let json_data = json!({
            "contents": {
                "tabbedSearchResultsRenderer": {
                    "tabs": [{
                        "tabRenderer": {
                            "content": {
                                "sectionListRenderer": {
                                    "contents": [{
                                        "musicCardShelfRenderer": {
                                            "title": {
                                                "runs": [{
                                                    "text": "HOYO-MiX",
                                                    "navigationEndpoint": {
                                                        "browseEndpoint": {
                                                            "browseId": "UCJ4yjqc1XuGgiE35NsSSkYA"
                                                        }
                                                    }
                                                }]
                                            }
                                        }
                                    }]
                                }
                            }
                        }
                    }]
                }
            }
        });

        assert_eq!(
            extract_artist_browse_id_from_search(&json_data, "HOYO-MiX"),
            Some("UCJ4yjqc1XuGgiE35NsSSkYA".to_string())
        );
    }

    #[tokio::test]
    async fn test_fetch_liked() {
        let session = load_saved_google_session().unwrap_or_default();
        if session.is_authenticated {
            assert!(
                session.cookie_header.len() < 8192,
                "Cabeçalho de cookies não deve exceder 8KB para evitar HTTP 413 (tamanho atual: {})",
                session.cookie_header.len()
            );

            let res = get_playlist_tracks(&session, "VLLM").await;
            assert!(res.is_ok(), "Falha ao carregar faixas de VLLM: {:?}", res.err());
            let tracks = res.unwrap();
            assert!(!tracks.is_empty(), "Deveria ter retornado faixas da playlist curtidas");

            let playlists_res = get_user_playlists(&session).await;
            assert!(playlists_res.is_ok(), "Falha ao buscar playlists: {:?}", playlists_res.err());
        }
    }
}
