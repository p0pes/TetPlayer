pub mod auth;
pub mod ytm;

use auth::{find_youtube_session, AuthSession};
use std::sync::Mutex;
use tauri::State;
use ytm::{
    get_home_recommendations, get_playlist_tracks as fetch_playlist_tracks,
    get_user_playlists as fetch_user_playlists, search_music, Playlist, Track,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_session = find_youtube_session();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            session: Mutex::new(initial_session),
        })
        .invoke_handler(tauri::generate_handler![
            get_auth_status,
            refresh_auth,
            search_tracks,
            get_quick_tracks,
            get_user_playlists,
            get_playlist_tracks
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
