use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSession {
    pub is_authenticated: bool,
    pub user_name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub cookie_header: String,
    pub sapisid: Option<String>,
    pub auth_user: Option<String>,
    pub browser: String,
    pub profile: String,
}

impl Default for AuthSession {
    fn default() -> Self {
        Self {
            is_authenticated: false,
            user_name: None,
            email: None,
            avatar_url: None,
            cookie_header: String::new(),
            sapisid: None,
            auth_user: Some("0".to_string()),
            browser: "Conta Google".to_string(),
            profile: "Default".to_string(),
        }
    }
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

/// Verifica se um cookie é estritamente relevante para a autenticação e sessão do YouTube Music.
/// Descarta cookies de outros serviços Google (ex: Docs, Drive, Gmail, Ads, Cloud)
/// que chegam a acumular 70KB+ e disparam o erro HTTP 413 (Payload Too Large).
pub fn is_relevant_youtube_cookie(name: &str) -> bool {
    matches!(
        name,
        "SAPISID"
            | "__Secure-1PAPISID"
            | "__Secure-3PAPISID"
            | "APISID"
            | "SSID"
            | "HSID"
            | "SID"
            | "__Secure-1PSID"
            | "__Secure-3PSID"
            | "LOGIN_INFO"
            | "VISITOR_INFO1_LIVE"
            | "VISITOR_PRIVACY_METADATA"
            | "YSC"
            | "PREF"
            | "wide"
            | "SIDCC"
            | "__Secure-1PSIDCC"
            | "__Secure-3PSIDCC"
            | "__Secure-1PSIDTS"
            | "__Secure-3PSIDTS"
            | "__Secure-ROLLOUT_TOKEN"
            | "__Secure-OSID"
            | "SOCS"
            | "CONSENT"
            | "DEVICE_INFO"
            | "GPS"
    )
}

/// Valida se o valor do cookie é ASCII válido para uso em cabeçalhos HTTP
pub fn is_valid_cookie_val(v: &str) -> bool {
    !v.is_empty() && v.bytes().all(|b| b >= 0x20 && b <= 0x7E && b != b';')
}

const GOOGLE_AUTH_CACHE_KEY: &str = "tetplayer_google_session";

/// Carrega a sessão salva da conta Google persistida no SQLite do app
pub fn load_saved_google_session() -> Option<AuthSession> {
    if let Ok(Some(json_str)) = crate::stats::get_cache_entry(GOOGLE_AUTH_CACHE_KEY) {
        if let Ok(session) = serde_json::from_str::<AuthSession>(&json_str) {
            // Requer obrigatoriamente LOGIN_INFO para garantir que a sessão é válida no YouTube Music
            if session.is_authenticated
                && session.cookie_header.contains("LOGIN_INFO")
                && (!session.cookie_header.is_empty() || session.sapisid.is_some())
            {
                return Some(session);
            } else {
                // Descarta sessões gravadas incompletas (ex: fechamento antes do redirect ao YTM)
                let _ = clear_saved_google_session();
            }
        }
    }
    None
}

/// Salva a sessão ativa da conta Google no SQLite para persistência automática entre reinicializações
pub fn save_google_session(session: &AuthSession) -> Result<(), String> {
    let json_str = serde_json::to_string(session)
        .map_err(|e| format!("Erro ao serializar sessão Google: {e}"))?;
    crate::stats::set_cache_entry(GOOGLE_AUTH_CACHE_KEY, &json_str)
}

/// Remove a sessão da conta Google (logout completo)
pub fn clear_saved_google_session() -> Result<(), String> {
    crate::stats::delete_cache_entry(GOOGLE_AUTH_CACHE_KEY)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_relevant_youtube_cookie_filter() {
        assert!(is_relevant_youtube_cookie("SAPISID"));
        assert!(is_relevant_youtube_cookie("__Secure-3PAPISID"));
        assert!(is_relevant_youtube_cookie("LOGIN_INFO"));
        assert!(is_relevant_youtube_cookie("VISITOR_INFO1_LIVE"));

        // Cookies irrelevantes/ruidosos de outros serviços Google que devem ser filtrados
        assert!(!is_relevant_youtube_cookie("ST-1099qfh"));
        assert!(!is_relevant_youtube_cookie("__Host-GMAIL_SCH_GML"));
        assert!(!is_relevant_youtube_cookie("django_language"));
        assert!(!is_relevant_youtube_cookie("ACCOUNT_CHOOSER"));
        assert!(!is_relevant_youtube_cookie("_GRECAPTCHA"));
    }

    #[test]
    fn test_valid_cookie_val() {
        assert!(is_valid_cookie_val("valid_value_123_abc"));
        assert!(!is_valid_cookie_val(""));
        assert!(!is_valid_cookie_val("val;with;semicolon"));
    }

    #[test]
    fn test_auth_session_default() {
        let session = AuthSession::default();
        assert!(!session.is_authenticated);
        assert_eq!(session.browser, "Conta Google");
    }
}
