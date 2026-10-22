pub mod auth;
pub mod stats;
pub mod ytm;

use auth::{find_youtube_session, AuthSession};
use stats::PlaybackStats;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, State};
use ytm::{
    fetch_lyrics, get_home_recommendations, get_playlist_tracks as fetch_playlist_tracks,
    get_radio_tracks as fetch_radio_tracks, get_user_playlists as fetch_user_playlists,
    search_music, LyricsData, Playlist, Track,
};

pub struct AppState {
    pub session: Mutex<AuthSession>,
}

#[tauri::command]
fn get_auth_status(state: State<'_, AppState>) -> AuthSession {
    state.session.lock().unwrap().clone()
}

#[tauri::command]
fn refresh_auth(state: State<'_, AppState>) -> AuthSession {
    let session = find_youtube_session();
    let mut current = state.session.lock().unwrap();
    *current = session.clone();
    session
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
async fn get_radio_tracks(
    state: State<'_, AppState>,
    video_id: String,
) -> Result<Vec<Track>, String> {
    let session = { state.session.lock().unwrap().clone() };
    fetch_radio_tracks(&session, &video_id).await
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

// Window commands
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
    let initial_session = find_youtube_session();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            session: Mutex::new(initial_session),
        })
        .setup(|app| {
            // Inicializar banco de estatísticas SQLite
            let _ = stats::init_db();

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

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_auth_status,
            refresh_auth,
            search_tracks,
            get_quick_tracks,
            get_user_playlists,
            get_playlist_tracks,
            get_radio_tracks,
            get_track_lyrics,
            record_track_played,
            get_playback_stats,
            clear_playback_stats,
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
            move_docked_tab
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
