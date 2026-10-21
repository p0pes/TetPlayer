pub mod auth;
pub mod ytm;

use auth::{find_youtube_session, AuthSession};
use std::sync::Mutex;
use tauri::State;
use ytm::{get_audio_stream, get_home_recommendations, search_music, StreamInfo, Track};

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
async fn get_track_stream(state: State<'_, AppState>, video_id: String) -> Result<StreamInfo, String> {
    let session = { state.session.lock().unwrap().clone() };
    get_audio_stream(&session, &video_id).await
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
            get_track_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
