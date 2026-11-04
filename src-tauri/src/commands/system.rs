use std::{path::PathBuf, process::Command};

use serde::Serialize;
use tauri::AppHandle;

use crate::{
    config::{load_config, save_config, AppConfig},
    error::AppError,
    ffmpeg::{
        info::{get_media_info, MediaInfo},
        progress::{resolve_ffprobe},
    },
};

// ── Folder / shell commands ───────────────────────────────────────────────────

/// Opens `folder_path` in the native OS file manager (Explorer / Finder /
/// Nautilus).
///
/// Returns an error if the path does not exist or the OS command fails.
#[tauri::command]
pub async fn open_folder(folder_path: String) -> Result<(), String> {
    let path = PathBuf::from(&folder_path);

    if !path.exists() {
        return Err(AppError::FileNotFound {
            path: folder_path,
        }
        .to_string());
    }

    #[cfg(target_os = "windows")]
    Command::new("explorer.exe")
        .arg(&folder_path)
        .spawn()
        .map_err(|e| AppError::ExecutionFailed { reason: e.to_string() }.to_string())?;

    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(&folder_path)
        .spawn()
        .map_err(|e| AppError::ExecutionFailed { reason: e.to_string() }.to_string())?;

    #[cfg(target_os = "linux")]
    Command::new("xdg-open")
        .arg(&folder_path)
        .spawn()
        .map_err(|e| AppError::ExecutionFailed { reason: e.to_string() }.to_string())?;

    Ok(())
}

// ── Config commands ───────────────────────────────────────────────────────────

/// Reads the persisted `AppConfig` from disk and returns it to the frontend.
#[tauri::command]
pub async fn get_config() -> Result<AppConfig, String> {
    load_config().map_err(String::from)
}

/// Writes the provided `AppConfig` to disk.
#[tauri::command]
pub async fn set_config(config: AppConfig) -> Result<(), String> {
    save_config(&config).map_err(String::from)
}

// ── Media info command ────────────────────────────────────────────────────────

/// Wraps [`get_media_info`] as a Tauri command so the frontend can inspect
/// any file before converting it.
#[tauri::command]
pub async fn probe_media(app: AppHandle, file_path: String) -> Result<MediaInfo, String> {
    let ffprobe_path = resolve_ffprobe(&app).map_err(String::from)?;
    get_media_info(ffprobe_path, &file_path).map_err(String::from)
}

// ── System diagnostics ────────────────────────────────────────────────────────

/// A quick health-check payload returned by [`check_system`].
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStatus {
    pub ffmpeg_available: bool,
    pub ffprobe_available: bool,
    pub ffmpeg_path: Option<String>,
    pub ffprobe_path: Option<String>,
}

/// Checks whether the FFmpeg and FFprobe binaries are reachable and returns
/// their paths.  Useful for the app's "About / Diagnostics" screen.
#[tauri::command]
pub async fn check_system(app: AppHandle) -> Result<SystemStatus, String> {
    use crate::ffmpeg::progress::resolve_ffmpeg;

    let ffmpeg = resolve_ffmpeg(&app);
    let ffprobe = resolve_ffprobe(&app);

    Ok(SystemStatus {
        ffmpeg_available: ffmpeg.is_ok(),
        ffprobe_available: ffprobe.is_ok(),
        ffmpeg_path: ffmpeg.ok().and_then(|p| p.to_str().map(String::from)),
        ffprobe_path: ffprobe.ok().and_then(|p| p.to_str().map(String::from)),
    })
}

