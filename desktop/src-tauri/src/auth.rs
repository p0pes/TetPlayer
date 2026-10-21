use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::ptr;
use std::time::{SystemTime, UNIX_EPOCH};
use windows_sys::Win32::Security::Cryptography::{
    CryptUnprotectData, CRYPT_INTEGER_BLOB,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSession {
    pub is_authenticated: bool,
    pub browser: String,
    pub profile: String,
    pub cookie_header: String,
    pub sapisid: Option<String>,
    pub auth_user: Option<String>,
}

impl Default for AuthSession {
    fn default() -> Self {
        Self {
            is_authenticated: false,
            browser: "None".to_string(),
            profile: "None".to_string(),
            cookie_header: String::new(),
            sapisid: None,
            auth_user: Some("0".to_string()),
        }
    }
}

pub fn dpapi_decrypt(encrypted: &[u8]) -> Result<Vec<u8>, String> {
    let mut input = CRYPT_INTEGER_BLOB {
        cbData: encrypted.len() as u32,
        pbData: encrypted.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: ptr::null_mut(),
    };

    let res = unsafe {
        CryptUnprotectData(
            &mut input,
            ptr::null_mut(),
            ptr::null_mut(),
            ptr::null_mut(),
            ptr::null_mut(),
            0,
            &mut output,
        )
    };

    if res != 0 && !output.pbData.is_null() {
        let slice = unsafe {
            std::slice::from_raw_parts(output.pbData, output.cbData as usize)
        };
        let decrypted = slice.to_vec();
        unsafe {
            unsafe extern "system" {
                fn LocalFree(hmem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
            }
            LocalFree(output.pbData as _);
        }
        Ok(decrypted)
    } else {
        Err("Falha na descriptografia DPAPI do Windows".into())
    }
}

pub fn decrypt_aes_gcm(key: &[u8], encrypted_val: &[u8]) -> Result<String, String> {
    if encrypted_val.len() < 3 + 12 + 16 {
        return Err("Tamanho de payload de cookie inválido".into());
    }

    let prefix = &encrypted_val[..3];
    if prefix != b"v10" && prefix != b"v20" {
        // Tenta fallback com DPAPI legado se não for v10/v20
        if let Ok(dec) = dpapi_decrypt(encrypted_val) {
            return String::from_utf8(dec).map_err(|e| e.to_string());
        }
        return Err("Prefixo de cookie desconhecido (não é v10 nem v20)".into());
    }

    let nonce_bytes = &encrypted_val[3..15];
    let ciphertext = &encrypted_val[15..];

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Erro ao inicializar cifra AES-GCM: {e}"))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    let decrypted = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Falha ao descriptografar AES-GCM: {e}"))?;

    String::from_utf8(decrypted).map_err(|e| format!("String UTF-8 inválida: {e}"))
}

pub fn get_browser_master_key(user_data_path: &Path) -> Result<Vec<u8>, String> {
    let local_state_path = user_data_path.join("Local State");
    if !local_state_path.exists() {
        return Err(format!("Local State não encontrado em {:?}", local_state_path));
    }

    let content = fs::read_to_string(&local_state_path)
        .map_err(|e| format!("Falha ao ler Local State: {e}"))?;
    let v: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("JSON do Local State inválido: {e}"))?;

    let encrypted_key_b64 = v["os_crypt"]["encrypted_key"]
        .as_str()
        .ok_or_else(|| "Chave os_crypt.encrypted_key ausente no Local State".to_string())?;

    let encrypted_key = BASE64
        .decode(encrypted_key_b64)
        .map_err(|e| format!("Base64 inválido na chave: {e}"))?;

    if encrypted_key.len() < 5 || &encrypted_key[..5] != b"DPAPI" {
        return Err("Chave criptografada não possui prefixo DPAPI".into());
    }

    dpapi_decrypt(&encrypted_key[5..])
}

pub fn generate_sapisid_hash(sapisid: &str, origin: &str) -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let to_hash = format!("{now} {sapisid} {origin}");
    let mut hasher = Sha1::new();
    hasher.update(to_hash.as_bytes());
    let hash = hex::encode(hasher.finalize());
    format!("SAPISIDHASH {now}_{hash}")
}

pub fn extract_cookies_from_profile(
    user_data_path: &Path,
    profile_name: &str,
    master_key: &[u8],
) -> Result<HashMap<String, String>, String> {
    let network_cookies = user_data_path
        .join(profile_name)
        .join("Network")
        .join("Cookies");
    let legacy_cookies = user_data_path.join(profile_name).join("Cookies");

    let cookies_path = if network_cookies.exists() {
        network_cookies
    } else if legacy_cookies.exists() {
        legacy_cookies
    } else {
        return Err(format!("Banco de cookies não encontrado no perfil {profile_name}"));
    };

    // Copia o SQLite para a pasta temporária para evitar locks pelo navegador em execução
    let temp_dir = std::env::temp_dir();
    let temp_copy = temp_dir.join(format!("tetplayer_cookies_{}_{}.db", profile_name, std::process::id()));
    fs::copy(&cookies_path, &temp_copy)
        .map_err(|e| format!("Erro ao copiar arquivo de cookies: {e}"))?;

    let conn = Connection::open(&temp_copy)
        .map_err(|e| format!("Erro ao abrir SQLite de cookies: {e}"))?;

    let mut stmt = conn
        .prepare(
            "SELECT name, encrypted_value FROM cookies WHERE host_key LIKE '%.youtube.com' OR host_key LIKE '%.google.com'",
        )
        .map_err(|e| format!("Erro na query SQL: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            let name: String = row.get(0)?;
            let encrypted_value: Vec<u8> = row.get(1)?;
            Ok((name, encrypted_value))
        })
        .map_err(|e| format!("Erro ao ler linhas do SQLite: {e}"))?;

    let mut cookies = HashMap::new();
    for row in rows.flatten() {
        let (name, enc_val) = row;
        if let Ok(decrypted) = decrypt_aes_gcm(master_key, &enc_val) {
            cookies.insert(name, decrypted);
        }
    }

    let _ = fs::remove_file(&temp_copy);
    Ok(cookies)
}

pub fn find_youtube_session() -> AuthSession {
    let local_app_data = match std::env::var("LOCALAPPDATA") {
        Ok(v) => PathBuf::from(v),
        Err(_) => return AuthSession::default(),
    };

    let browsers = [
        ("Google Chrome", local_app_data.join("Google").join("Chrome").join("User Data")),
        ("Microsoft Edge", local_app_data.join("Microsoft").join("Edge").join("User Data")),
        ("Brave Browser", local_app_data.join("BraveSoftware").join("Brave-Browser").join("User Data")),
    ];

    let profiles = ["Default", "Profile 1", "Profile 2", "Profile 3", "Profile 4"];

    for (browser_name, user_data_path) in browsers.iter() {
        if !user_data_path.exists() {
            continue;
        }

        let master_key = match get_browser_master_key(user_data_path) {
            Ok(k) => k,
            Err(_) => continue,
        };

        for profile in profiles.iter() {
            if let Ok(cookies) = extract_cookies_from_profile(user_data_path, profile, &master_key) {
                // Checa se tem cookies essenciais do YouTube
                let has_sapisid = cookies.contains_key("SAPISID") || cookies.contains_key("__Secure-3PAPISID");
                let has_psid = cookies.contains_key("__Secure-3PSID") || cookies.contains_key("LOGIN_INFO");

                if has_sapisid || has_psid {
                    let sapisid = cookies.get("SAPISID")
                        .or_else(|| cookies.get("__Secure-3PAPISID"))
                        .cloned();

                    let mut cookie_parts = Vec::new();
                    for (k, v) in cookies.iter() {
                        cookie_parts.push(format!("{k}={v}"));
                    }
                    let cookie_header = cookie_parts.join("; ");

                    return AuthSession {
                        is_authenticated: true,
                        browser: browser_name.to_string(),
                        profile: profile.to_string(),
                        cookie_header,
                        sapisid,
                        auth_user: Some("0".to_string()),
                    };
                }
            }
        }
    }

    AuthSession::default()
}
