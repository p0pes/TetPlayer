pub mod auth;
pub mod stats;
pub mod ytm;

use auth::{clear_saved_google_session, load_saved_google_session, save_google_session, AuthSession};
use stats::PlaybackStats;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, State};
use ytm::{
    create_playlist as api_create_playlist, add_track_to_playlist as api_add_track_to_playlist,
    remove_track_from_playlist as api_remove_track_from_playlist,
    edit_playlist_metadata as api_edit_playlist_metadata, delete_playlist as api_delete_playlist,
    reorder_playlist_track as api_reorder_playlist_track,
    fetch_lyrics, get_home_recommendations, get_playlist_tracks as fetch_playlist_tracks,
    get_radio_tracks as fetch_radio_tracks, get_stream_info as fetch_stream_info,
    get_user_playlists as fetch_user_playlists, get_user_albums as fetch_user_albums,
    get_album_details as fetch_album_details, search_album_by_name as fetch_search_album_by_name,
    search_music, Album, AlbumDetail, LyricsData, Playlist, StreamInfo, Track,
};

pub struct AppState {
    pub session: Mutex<AuthSession>,
}

#[tauri::command]
fn get_auth_status(state: State<'_, AppState>) -> AuthSession {
    state.session.lock().unwrap().clone()
}

#[tauri::command]
async fn refresh_auth(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<AuthSession, String> {
    let mut session = load_saved_google_session().unwrap_or_default();
    if session.is_authenticated {
        let (name, email, avatar) = ytm::fetch_account_info(&session).await;
        if let Some(n) = name {
            session.user_name = Some(n);
        }
        if email.is_some() {
            session.email = email;
        }
        if avatar.is_some() {
            session.avatar_url = avatar;
        }
        let _ = save_google_session(&session);
    }
    *state.session.lock().unwrap() = session.clone();
    let _ = app.emit("auth-changed", &session);
    Ok(session)
}

#[tauri::command]
async fn start_google_login(app: tauri::AppHandle, _state: State<'_, AppState>) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("google_login") {
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }

    let login_url = "https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fmusic.youtube.com%2F";
    let parsed_url = tauri::WebviewUrl::External(
        login_url.parse().map_err(|e| format!("URL inválida: {e}"))?
    );

    let window = tauri::WebviewWindowBuilder::new(&app, "google_login", parsed_url)
        .title("Login com Conta Google — TetPlayer")
        .inner_size(520.0, 720.0)
        .min_inner_size(400.0, 500.0)
        .center()
        .resizable(true)
        .visible(true)
        .build()
        .map_err(|e| format!("Falha ao criar janela de login do Google: {e}"))?;

    let _ = window.set_focus();

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut attempts = 0;
        let mut on_ytm_ticks = 0;
        while attempts < 750 {
            tokio::time::sleep(std::time::Duration::from_millis(800)).await;
            attempts += 1;

            let win = match app_handle.get_webview_window("google_login") {
                Some(w) => w,
                None => break, // Usuário fechou a janela de login
            };

            let current_url = win.url().map(|u| u.to_string()).unwrap_or_default();
            let is_on_ytm = current_url.contains("music.youtube.com")
                || (current_url.contains("youtube.com")
                    && !current_url.contains("accounts.google.com")
                    && !current_url.contains("accounts.youtube.com"));

            if is_on_ytm {
                on_ytm_ticks += 1;
            }

            let cookies_res = win.cookies();
            if let Ok(cookies) = cookies_res {
                let mut yt_cookies = std::collections::HashMap::new();
                let mut google_cookies = std::collections::HashMap::new();

                for c in cookies {
                    let name = c.name().to_string();
                    let val = c.value().to_string();
                    let domain = c.domain().unwrap_or("").to_lowercase();
                    if auth::is_relevant_youtube_cookie(&name) && auth::is_valid_cookie_val(&val) {
                        if domain.contains("youtube.com") {
                            yt_cookies.insert(name, val);
                        } else {
                            google_cookies.insert(name, val);
                        }
                    }
                }

                // Cookies do domínio YouTube tem precedência sobre cookies genéricos do Google
                let mut merged_cookies = google_cookies;
                for (k, v) in yt_cookies {
                    merged_cookies.insert(k, v);
                }

                let has_login_info = merged_cookies.contains_key("LOGIN_INFO");
                let has_sapisid = merged_cookies.contains_key("SAPISID")
                    || merged_cookies.contains_key("__Secure-3PAPISID");
                let has_psid = merged_cookies.contains_key("__Secure-3PSID")
                    || merged_cookies.contains_key("SID");

                // CRÍTICO: Não fecha a janela prematuramente na tela accounts.google.com!
                // Requer expressamente:
                // 1. Navegação completa até music.youtube.com
                // 2. Presença do cookie LOGIN_INFO (definido pelo YouTube)
                // 3. Credenciais completas de autenticação (SAPISID + PSID/SID)
                if is_on_ytm && has_login_info && has_sapisid && has_psid {
                    let sapisid = merged_cookies
                        .get("SAPISID")
                        .or_else(|| merged_cookies.get("__Secure-3PAPISID"))
                        .cloned();

                    let cookie_header = merged_cookies
                        .iter()
                        .map(|(k, v)| format!("{k}={v}"))
                        .collect::<Vec<_>>()
                        .join("; ");

                    let mut session = AuthSession {
                        is_authenticated: true,
                        user_name: Some("Conta Google".to_string()),
                        email: None,
                        avatar_url: None,
                        cookie_header,
                        sapisid,
                        auth_user: Some("0".to_string()),
                        browser: "Conta Google".to_string(),
                        profile: "Sessão Integrada".to_string(),
                    };

                    let (name, email, avatar) = ytm::fetch_account_info(&session).await;

                    // Conclui apenas se a API do YouTube Music validou o perfil
                    // ou após aguardar estabilização do redirecionamento
                    if name.is_some() || email.is_some() || on_ytm_ticks >= 4 {
                        if let Some(n) = name {
                            session.user_name = Some(n);
                        }
                        session.email = email;
                        session.avatar_url = avatar;

                        let _ = save_google_session(&session);

                        let app_state: State<AppState> = app_handle.state();
                        *app_state.session.lock().unwrap() = session.clone();

                        let _ = app_handle.emit("auth-changed", &session);

                        let _ = win.close();
                        break;
                    }
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn logout_google(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let _ = clear_saved_google_session();
    let empty = AuthSession::default();
    *state.session.lock().unwrap() = empty.clone();
    let _ = app.emit("auth-changed", &empty);

    if let Some(win) = app.get_webview_window("google_login") {
        let _ = win.close();
    }

    Ok(())
}

#[tauri::command]
async fn search_tracks(state: State<'_, AppState>, query: String) -> Result<Vec<Track>, String> {
    let session = { state.session.lock().unwrap().clone() };
    search_music(&session, &query).await
}

#[tauri::command]
async fn get_quick_tracks(state: State<'_, AppState>) -> Result<Vec<Track>, String> {
    let session = { state.session.lock().unwrap().clone() };
    get_home_recommendations(&session).await
}

#[tauri::command]
async fn get_user_playlists(state: State<'_, AppState>) -> Result<Vec<Playlist>, String> {
    let session = { state.session.lock().unwrap().clone() };
    fetch_user_playlists(&session).await
}

#[tauri::command]
async fn get_playlist_tracks(
    state: State<'_, AppState>,
    playlist_id: String,
) -> Result<Vec<Track>, String> {
    let session = { state.session.lock().unwrap().clone() };
    fetch_playlist_tracks(&session, &playlist_id).await
}

#[tauri::command]
async fn create_playlist(
    state: State<'_, AppState>,
    title: String,
    description: Option<String>,
    privacy_status: Option<String>,
) -> Result<Playlist, String> {
    let session = { state.session.lock().unwrap().clone() };
    api_create_playlist(&session, &title, description.as_deref(), privacy_status.as_deref()).await
}

#[tauri::command]
async fn add_track_to_playlist(
    state: State<'_, AppState>,
    playlist_id: String,
    video_id: String,
) -> Result<(), String> {
    let session = { state.session.lock().unwrap().clone() };
    api_add_track_to_playlist(&session, &playlist_id, &video_id).await
}

#[tauri::command]
async fn remove_track_from_playlist(
    state: State<'_, AppState>,
    playlist_id: String,
    video_id: String,
    set_video_id: Option<String>,
) -> Result<(), String> {
    let session = { state.session.lock().unwrap().clone() };
    api_remove_track_from_playlist(&session, &playlist_id, &video_id, set_video_id.as_deref()).await
}

#[tauri::command]
async fn edit_playlist_metadata(
    state: State<'_, AppState>,
    playlist_id: String,
    title: String,
    description: Option<String>,
) -> Result<(), String> {
    let session = { state.session.lock().unwrap().clone() };
    api_edit_playlist_metadata(&session, &playlist_id, &title, description.as_deref()).await
}

#[tauri::command]
async fn delete_playlist(
    state: State<'_, AppState>,
    playlist_id: String,
) -> Result<(), String> {
    let session = { state.session.lock().unwrap().clone() };
    api_delete_playlist(&session, &playlist_id).await
}

#[tauri::command]
async fn reorder_playlist_track(
    state: State<'_, AppState>,
    playlist_id: String,
    set_video_id: String,
    successor_set_video_id: Option<String>,
    predecessor_set_video_id: Option<String>,
    was_adjacent_to_end: bool,
) -> Result<(), String> {
    let session = { state.session.lock().unwrap().clone() };
    api_reorder_playlist_track(
        &session,
        &playlist_id,
        &set_video_id,
        successor_set_video_id.as_deref(),
        predecessor_set_video_id.as_deref(),
        was_adjacent_to_end,
    )
    .await
}

#[tauri::command]
async fn get_user_albums(state: State<'_, AppState>) -> Result<Vec<Album>, String> {
    let session = { state.session.lock().unwrap().clone() };
    fetch_user_albums(&session).await
}

#[tauri::command]
async fn get_album_details(
    state: State<'_, AppState>,
    browse_id: String,
) -> Result<AlbumDetail, String> {
    let session = { state.session.lock().unwrap().clone() };
    fetch_album_details(&session, &browse_id).await
}

#[tauri::command]
async fn search_album_by_name(
    state: State<'_, AppState>,
    query: String,
) -> Result<Option<Album>, String> {
    let session = { state.session.lock().unwrap().clone() };
    fetch_search_album_by_name(&session, &query).await
}

#[tauri::command]
async fn get_radio_tracks(
    state: State<'_, AppState>,
    video_id: String,
) -> Result<Vec<Track>, String> {
    let session = { state.session.lock().unwrap().clone() };
    fetch_radio_tracks(&session, &video_id).await
}

#[tauri::command]
async fn get_stream_info(
    state: State<'_, AppState>,
    video_id: String,
) -> Result<Option<StreamInfo>, String> {
    let session = { state.session.lock().unwrap().clone() };
    fetch_stream_info(&session, &video_id).await
}

#[tauri::command]
async fn get_track_lyrics(
    state: State<'_, AppState>,
    title: String,
    artist: String,
    video_id: String,
) -> Result<LyricsData, String> {
    let session = { state.session.lock().unwrap().clone() };
    fetch_lyrics(&session, &title, &artist, &video_id).await
}

// Stats commands (SQLite)
#[tauri::command]
fn record_track_played(track: Track) -> Result<(), String> {
    stats::record_track(
        &track.id,
        &track.title,
        &track.artist,
        track.album.as_deref(),
        track.duration_seconds,
        track.artwork_url.as_deref(),
    )
}

#[tauri::command]
fn get_playback_stats(timeframe_days: Option<i64>) -> Result<PlaybackStats, String> {
    stats::query_stats(timeframe_days)
}

#[tauri::command]
fn clear_playback_stats() -> Result<(), String> {
    stats::clear_stats()
}

#[tauri::command]
fn save_to_db_cache(key: String, value: String) -> Result<(), String> {
    stats::set_cache_entry(&key, &value)
}

#[tauri::command]
fn get_from_db_cache(key: String) -> Result<Option<String>, String> {
    stats::get_cache_entry(&key)
}

#[tauri::command]
fn delete_from_db_cache(key: String) -> Result<(), String> {
    stats::delete_cache_entry(&key)
}

#[tauri::command]
fn clear_all_db_cache() -> Result<(), String> {
    stats::clear_all_cache()
}

#[tauri::command]
fn get_app_storage_info() -> Result<serde_json::Value, String> {
    let storage_dir = stats::get_app_storage_dir();
    let music_dir = storage_dir.join("music");
    let db_path = stats::get_db_path();

    let db_size = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);

    Ok(serde_json::json!({
        "storageDir": storage_dir.to_string_lossy(),
        "musicDir": music_dir.to_string_lossy(),
        "dbPath": db_path.to_string_lossy(),
        "dbSizeBytes": db_size,
    }))
}

#[tauri::command]
fn open_app_storage_dir() -> Result<(), String> {
    let storage_dir = stats::get_app_storage_dir();
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&storage_dir)
            .spawn()
            .map_err(|e| format!("Falha ao abrir pasta de armazenamento: {e}"))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = storage_dir;
    }
    Ok(())
}

// Window commands
#[tauri::command]
fn show_main_window(window: tauri::Window) {
    let _ = window.show();
    let _ = window.set_focus();
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn hide_to_tray(window: tauri::Window) {
    let _ = window.hide();
}

#[tauri::command]
fn toggle_maximize_window(window: tauri::Window) -> bool {
    if let Ok(is_maximized) = window.is_maximized() {
        if is_maximized {
            let _ = window.unmaximize();
            return false;
        } else {
            let _ = window.maximize();
            return true;
        }
    }
    let _ = window.maximize();
    true
}

#[tauri::command]
fn close_window(window: tauri::Window) {
    let _ = window.close();
}

#[tauri::command]
fn is_window_maximized(window: tauri::Window) -> bool {
    window.is_maximized().unwrap_or(false)
}

#[tauri::command]
fn start_drag_window(window: tauri::Window) {
    let _ = window.start_dragging();
}

#[tauri::command]
fn set_mini_player_mode(window: tauri::Window, enabled: bool) -> Result<(), String> {
    if enabled {
        let _ = window.unmaximize();
        let _ = window.set_resizable(false);
        let _ = window.set_maximizable(false);
        let _ = window.set_always_on_top(true);
        let _ = window.set_min_size(Some(tauri::Size::Logical(tauri::LogicalSize {
            width: 340.0,
            height: 120.0,
        })));
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 380.0,
            height: 140.0,
        }));
    } else {
        let _ = window.set_always_on_top(false);
        let _ = window.set_resizable(true);
        let _ = window.set_maximizable(true);
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 1050.0,
            height: 720.0,
        }));
        let _ = window.set_min_size(Some(tauri::Size::Logical(tauri::LogicalSize {
            width: 800.0,
            height: 550.0,
        })));
    }
    Ok(())
}

#[tauri::command]
fn dock_mini_player(window: tauri::Window, side: String) -> Result<String, String> {
    let _ = window.unmaximize();
    let _ = window.set_resizable(false);
    let _ = window.set_maximizable(false);

    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Nenhum monitor encontrado".to_string())?;

    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let scale_factor = monitor.scale_factor();

    let mon_logical_pos = mon_pos.to_logical::<f64>(scale_factor);
    let mon_logical_size = mon_size.to_logical::<f64>(scale_factor);

    let win_pos = window
        .outer_position()
        .unwrap_or(*mon_pos)
        .to_logical::<f64>(scale_factor);

    let docked_w = 38.0;
    let docked_h = 90.0;

    let target_x = if side == "left" {
        mon_logical_pos.x
    } else {
        mon_logical_pos.x + mon_logical_size.width - docked_w
    };

    let min_y = mon_logical_pos.y;
    let max_y = mon_logical_pos.y + mon_logical_size.height - docked_h;
    let target_y = win_pos.y.clamp(min_y, max_y.max(min_y));

    let _ = window.set_min_size(Some(tauri::Size::Logical(tauri::LogicalSize {
        width: 30.0,
        height: 60.0,
    })));
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
        width: docked_w,
        height: docked_h,
    }));
    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
        x: target_x,
        y: target_y,
    }));

    Ok(side)
}

#[tauri::command]
fn undock_mini_player(window: tauri::Window, side: Option<String>) -> Result<(), String> {
    let _ = window.unmaximize();
    let _ = window.set_resizable(false);
    let _ = window.set_maximizable(false);

    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Nenhum monitor encontrado".to_string())?;

    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let scale_factor = monitor.scale_factor();

    let mon_logical_pos = mon_pos.to_logical::<f64>(scale_factor);
    let mon_logical_size = mon_size.to_logical::<f64>(scale_factor);

    let win_pos = window
        .outer_position()
        .unwrap_or(*mon_pos)
        .to_logical::<f64>(scale_factor);

    let full_w = 380.0;
    let full_h = 140.0;

    let side_str = side.as_deref().unwrap_or("left");
    let offset = 16.0;

    let target_x = if side_str == "left" {
        mon_logical_pos.x + offset
    } else {
        mon_logical_pos.x + mon_logical_size.width - full_w - offset
    };

    let min_y = mon_logical_pos.y;
    let max_y = mon_logical_pos.y + mon_logical_size.height - full_h;
    let target_y = win_pos.y.clamp(min_y, max_y.max(min_y));

    let _ = window.set_min_size(Some(tauri::Size::Logical(tauri::LogicalSize {
        width: 340.0,
        height: 120.0,
    })));
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
        width: full_w,
        height: full_h,
    }));
    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
        x: target_x,
        y: target_y,
    }));

    Ok(())
}

#[tauri::command]
fn check_and_snap_mini_player(window: tauri::Window) -> Result<Option<String>, String> {
    let _ = window.unmaximize();

    let monitor = match window.current_monitor() {
        Ok(Some(m)) => m,
        _ => return Ok(None),
    };

    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let scale_factor = monitor.scale_factor();

    let mon_logical_pos = mon_pos.to_logical::<f64>(scale_factor);
    let mon_logical_size = mon_size.to_logical::<f64>(scale_factor);

    let win_pos = match window.outer_position() {
        Ok(p) => p.to_logical::<f64>(scale_factor),
        Err(_) => return Ok(None),
    };
    let win_size = match window.outer_size() {
        Ok(s) => s.to_logical::<f64>(scale_factor),
        Err(_) => return Ok(None),
    };

    // Margem ampla de snap magnético (100px lógicos)
    let threshold = 100.0;
    let mon_left = mon_logical_pos.x;
    let mon_right = mon_logical_pos.x + mon_logical_size.width;
    let win_left = win_pos.x;
    let win_right = win_pos.x + win_size.width;

    // Se o usuário soltou para a esquerda ou jogou além da borda esquerda
    if win_left <= mon_left + threshold {
        dock_mini_player(window, "left".to_string())?;
        return Ok(Some("left".to_string()));
    }
    // Se o usuário soltou para a direita ou jogou além da borda direita
    else if win_right >= mon_right - threshold || win_left >= mon_right - threshold {
        dock_mini_player(window, "right".to_string())?;
        return Ok(Some("right".to_string()));
    }
    // Caso contrário, clamp de segurança para impedir que a janela suma da tela
    else {
        let full_w = win_size.width;
        let full_h = win_size.height;
        let clamped_x = win_pos.x.clamp(mon_left, (mon_right - full_w).max(mon_left));
        let clamped_y = win_pos
            .y
            .clamp(mon_logical_pos.y, (mon_logical_pos.y + mon_logical_size.height - full_h).max(mon_logical_pos.y));
        if (clamped_x - win_pos.x).abs() > 1.0 || (clamped_y - win_pos.y).abs() > 1.0 {
            let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                x: clamped_x,
                y: clamped_y,
            }));
        }
    }

    Ok(None)
}

#[tauri::command]
async fn start_drag_and_snap(window: tauri::Window) -> Result<Option<String>, String> {
    let _ = window.start_dragging();

    // Aguarda o usuário soltar o botão esquerdo do mouse (LBUTTON) para avaliar o snap
    tokio::task::spawn_blocking(move || {
        while unsafe { (windows_sys::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState(0x01) as u16 & 0x8000) != 0 } {
            std::thread::sleep(std::time::Duration::from_millis(15));
        }
        std::thread::sleep(std::time::Duration::from_millis(30));

        let _ = window.unmaximize();
        check_and_snap_mini_player(window)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn move_docked_tab(
    window: tauri::Window,
    side: String,
    screen_y_logical: f64,
    grab_offset_y_logical: f64,
) -> Result<(), String> {
    let monitor = match window.current_monitor() {
        Ok(Some(m)) => m,
        _ => return Ok(()),
    };

    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let scale_factor = monitor.scale_factor();

    let mon_logical_pos = mon_pos.to_logical::<f64>(scale_factor);
    let mon_logical_size = mon_size.to_logical::<f64>(scale_factor);

    let docked_w = 38.0;
    let docked_h = 90.0;

    // X é ESTRITAMENTE travado na borda esquerda ou direita
    let target_x = if side == "left" {
        mon_logical_pos.x
    } else {
        mon_logical_pos.x + mon_logical_size.width - docked_w
    };

    let min_y = mon_logical_pos.y;
    let max_y = mon_logical_pos.y + mon_logical_size.height - docked_h;
    let target_y = (screen_y_logical - grab_offset_y_logical).clamp(min_y, max_y.max(min_y));

    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
        x: target_x,
        y: target_y,
    }));

    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Inicializar banco de dados SQLite nativo antes de carregar a sessão
    let _ = stats::init_db();
    let initial_session = load_saved_google_session().unwrap_or_default();

    let shortcut_plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, shortcut, event| {
            if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                let s = shortcut.to_string();
                if s.contains("MediaPlayPause") || s.contains("MediaStop") || s.contains("Space") {
                    let _ = app.emit("tray-action", "toggle-play");
                } else if s.contains("MediaTrackNext") || s.contains("ArrowRight") {
                    let _ = app.emit("tray-action", "next-track");
                } else if s.contains("MediaTrackPrevious") || s.contains("ArrowLeft") {
                    let _ = app.emit("tray-action", "prev-track");
                }
            }
        })
        .build();

    let single_instance_plugin = tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
        let _ = app.emit("app-already-running", "O TetPlayer já está aberto em segundo plano!");
    });

    tauri::Builder::default()
        .plugin(single_instance_plugin)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(shortcut_plugin)
        .manage(AppState {
            session: Mutex::new(initial_session),
        })
        .setup(|app| {
            // Inicializar banco de estatísticas SQLite
            let _ = stats::init_db();

            // Registrar atalhos globais de mídia no sistema operacional
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            let shortcuts = [
                "MediaPlayPause",
                "MediaTrackNext",
                "MediaTrackPrevious",
                "MediaStop",
                "Ctrl+Alt+Space",
                "Ctrl+Alt+Right",
                "Ctrl+Alt+Left",
            ];
            for sc in shortcuts {
                if let Ok(parsed) = sc.parse::<tauri_plugin_global_shortcut::Shortcut>() {
                    let _ = app.global_shortcut().register(parsed);
                }
            }

            // Configurar System Tray com Menu de Contexto
            if let Some(default_icon) = app.default_window_icon() {
                let play_i = MenuItem::with_id(app, "play_pause", "Reproduzir / Pausar", true, None::<&str>)?;
                let next_i = MenuItem::with_id(app, "next", "Próxima Faixa", true, None::<&str>)?;
                let prev_i = MenuItem::with_id(app, "prev", "Faixa Anterior", true, None::<&str>)?;
                let toggle_win_i = MenuItem::with_id(app, "toggle_win", "Mostrar / Ocultar TetPlayer", true, None::<&str>)?;
                let mini_player_i = MenuItem::with_id(app, "mini_player", "Alternar Mini Player", true, None::<&str>)?;
                let quit_i = MenuItem::with_id(app, "quit", "Sair do TetPlayer", true, None::<&str>)?;

                let menu = Menu::with_items(
                    app,
                    &[
                        &play_i,
                        &next_i,
                        &prev_i,
                        &PredefinedMenuItem::separator(app)?,
                        &toggle_win_i,
                        &mini_player_i,
                        &PredefinedMenuItem::separator(app)?,
                        &quit_i,
                    ],
                )?;

                let _tray = TrayIconBuilder::new()
                    .icon(default_icon.clone())
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "play_pause" => {
                            let _ = app.emit("tray-action", "toggle-play");
                        }
                        "next" => {
                            let _ = app.emit("tray-action", "next-track");
                        }
                        "prev" => {
                            let _ = app.emit("tray-action", "prev-track");
                        }
                        "mini_player" => {
                            let _ = app.emit("tray-action", "toggle-mini-player");
                        }
                        "toggle_win" => {
                            if let Some(window) = app.get_webview_window("main") {
                                if let Ok(is_visible) = window.is_visible() {
                                    if is_visible {
                                        let _ = window.hide();
                                    } else {
                                        let _ = window.show();
                                        let _ = window.unminimize();
                                        let _ = window.set_focus();
                                    }
                                }
                            }
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }

            // Fallback de segurança para garantir exibição mesmo em caso de erro no frontend
            if let Some(main_win) = app.get_webview_window("main") {
                let win_clone = main_win.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(1500));
                    let _ = win_clone.show();
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_main_window,
            get_auth_status,
            refresh_auth,
            start_google_login,
            logout_google,
            search_tracks,
            get_quick_tracks,
            get_user_playlists,
            get_playlist_tracks,
            create_playlist,
            add_track_to_playlist,
            remove_track_from_playlist,
            edit_playlist_metadata,
            delete_playlist,
            reorder_playlist_track,
            get_user_albums,
            get_album_details,
            search_album_by_name,
            get_radio_tracks,
            get_stream_info,
            get_track_lyrics,
            record_track_played,
            get_playback_stats,
            clear_playback_stats,
            save_to_db_cache,
            get_from_db_cache,
            delete_from_db_cache,
            clear_all_db_cache,
            minimize_window,
            hide_to_tray,
            toggle_maximize_window,
            close_window,
            is_window_maximized,
            start_drag_window,
            set_mini_player_mode,
            dock_mini_player,
            undock_mini_player,
            check_and_snap_mini_player,
            start_drag_and_snap,
            move_docked_tab,
            get_app_storage_info,
            open_app_storage_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
