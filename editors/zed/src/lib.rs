//! Extension Zed cho `@porbit/style`: khởi chạy language server `presence-style lsp` qua Node.
//!
//! Thứ tự chọn server:
//!   1. `lsp.presence-style.binary` trong settings.json của Zed (đường dẫn + đối số tự chọn),
//!   2. `@porbit/style` cài trong dự án (`node_modules/@porbit/style/dist/cli-bin.js` ở gốc worktree),
//!   3. `@porbit/style` bản mới nhất trên npm, cài vào thư mục làm việc của extension.
//!
//! `lsp.presence-style.initialization_options` / `settings` được chuyển nguyên cho server
//! (`tailwindFunctions`, `tailwindStylesheet`, `configFile`).
use std::{env, fs};

use zed_extension_api::{self as zed, serde_json, settings::LspSettings, LanguageServerId, Result};

const SERVER_NAME: &str = "presence-style";
const PACKAGE_NAME: &str = "@porbit/style";
/// Bin `presence-style` của gói (tương đối với gốc dự án, hoặc với thư mục làm việc của extension).
const SERVER_PATH: &str = "node_modules/@porbit/style/dist/cli-bin.js";
/// Gói có language server khi "exports" có khoá "./lsp" (từ 1.0).
const LSP_EXPORT: &str = "\"./lsp\"";

struct PresenceStyleExtension {
    /// Đã kiểm tra/cài bản npm trong phiên này.
    did_find_server: bool,
}

impl PresenceStyleExtension {
    /// `@porbit/style` (có language server) trong node_modules của worktree.
    fn project_server(worktree: &zed::Worktree) -> Option<String> {
        let manifest = worktree.read_text_file("node_modules/@porbit/style/package.json").ok()?;
        if !manifest.contains(LSP_EXPORT) {
            return None;
        }
        Some(format!("{}/{}", worktree.root_path().trim_end_matches('/'), SERVER_PATH))
    }

    fn installed_server_exists() -> bool {
        fs::metadata(SERVER_PATH).map_or(false, |stat| stat.is_file())
    }

    /// Cài (hoặc cập nhật) `@porbit/style` vào thư mục làm việc của extension.
    fn installed_server(&mut self, language_server_id: &LanguageServerId) -> Result<String> {
        let exists = Self::installed_server_exists();
        if self.did_find_server && exists {
            return Ok(SERVER_PATH.to_string());
        }
        zed::set_language_server_installation_status(language_server_id, &zed::LanguageServerInstallationStatus::CheckingForUpdate);
        match zed::npm_package_latest_version(PACKAGE_NAME) {
            Ok(version) => {
                let installed = zed::npm_package_installed_version(PACKAGE_NAME)?;
                if !exists || installed.as_deref() != Some(version.as_str()) {
                    zed::set_language_server_installation_status(language_server_id, &zed::LanguageServerInstallationStatus::Downloading);
                    if let Err(error) = zed::npm_install_package(PACKAGE_NAME, &version) {
                        // Mất mạng mà đã có bản cũ: dùng tạm bản cũ.
                        if !Self::installed_server_exists() {
                            return Err(format!("không cài được {PACKAGE_NAME}@{version}: {error}"));
                        }
                    }
                }
            }
            Err(error) if !exists => return Err(format!("không đọc được phiên bản {PACKAGE_NAME} trên npm: {error}")),
            Err(_) => {}
        }
        if !Self::installed_server_exists() {
            return Err(format!("đã cài {PACKAGE_NAME} nhưng không thấy {SERVER_PATH}"));
        }
        zed::set_language_server_installation_status(language_server_id, &zed::LanguageServerInstallationStatus::None);
        self.did_find_server = true;
        Ok(SERVER_PATH.to_string())
    }

    /// Thiết lập người dùng (`lsp.presence-style.settings`), lồng dưới `presenceStyle` như server đọc.
    fn wrap(value: Option<serde_json::Value>) -> Option<serde_json::Value> {
        value.map(|value| match value {
            serde_json::Value::Object(ref map) if map.contains_key("presenceStyle") => value,
            other => serde_json::json!({ "presenceStyle": other }),
        })
    }
}

impl zed::Extension for PresenceStyleExtension {
    fn new() -> Self {
        Self { did_find_server: false }
    }

    fn language_server_command(&mut self, language_server_id: &LanguageServerId, worktree: &zed::Worktree) -> Result<zed::Command> {
        let settings = LspSettings::for_worktree(SERVER_NAME, worktree).unwrap_or_default();
        if let Some(binary) = settings.binary {
            if let Some(path) = binary.path {
                return Ok(zed::Command {
                    command: path,
                    args: binary.arguments.unwrap_or_else(|| vec!["lsp".into()]),
                    env: binary.env.map(|env| env.into_iter().collect()).unwrap_or_default(),
                });
            }
        }
        let script = match Self::project_server(worktree) {
            Some(path) => path,
            None => {
                let relative = self.installed_server(language_server_id)?;
                env::current_dir()
                    .map_err(|error| error.to_string())?
                    .join(relative)
                    .to_string_lossy()
                    .into_owned()
            }
        };
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![script, "lsp".into(), "--stdio".into()],
            env: Default::default(),
        })
    }

    fn language_server_initialization_options(&mut self, _language_server_id: &LanguageServerId, worktree: &zed::Worktree) -> Result<Option<serde_json::Value>> {
        let settings = LspSettings::for_worktree(SERVER_NAME, worktree).unwrap_or_default();
        Ok(Self::wrap(settings.initialization_options.or(settings.settings)))
    }

    fn language_server_workspace_configuration(&mut self, _language_server_id: &LanguageServerId, worktree: &zed::Worktree) -> Result<Option<serde_json::Value>> {
        let settings = LspSettings::for_worktree(SERVER_NAME, worktree).unwrap_or_default();
        Ok(Self::wrap(settings.settings))
    }
}

zed::register_extension!(PresenceStyleExtension);
