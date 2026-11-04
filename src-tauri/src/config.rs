use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

use crate::error::AppError;

// ── File names ──────────────────────────────────────────────────────────────

const CONFIG_FILE: &str = "format-hub-config.json";

/// Plain INI file holding the last window position.  Kept separate from
/// the JSON config so a hand-edited value can never corrupt user settings.
const WINDOW_STATE_FILE: &str = "format-hub-window.ini";

/// Section used inside [`WINDOW_STATE_FILE`].
const WINDOW_SECTION: &str = "window";

// ── Struct ───────────────────────────────────────────────────────────────────

/// Persistent user preferences stored in the OS config directory.
///
/// All fields have serde defaults so a partial / missing config file
/// is handled gracefully.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// The format that is pre-selected when the app opens (e.g. `"mp4"`).
    #[serde(default = "default_format")]
    pub default_format: String,

    /// Where converted files are saved.  Empty string means "next to the
    /// source file" (resolved at conversion time).
    #[serde(default)]
    pub output_directory: String,

    /// Whether to open the output folder in the OS file manager after a
    /// successful conversion.
    #[serde(default = "default_auto_open")]
    pub auto_open_folder: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            default_format: default_format(),
            output_directory: String::new(),
            auto_open_folder: default_auto_open(),
        }
    }
}

fn default_format() -> String {
    "mp4".to_string()
}

fn default_auto_open() -> bool {
    true
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Returns the app's config directory (`<OS config dir>/format-hub`),
/// creating it on first use.
fn app_dir() -> Result<PathBuf, AppError> {
    let dir = dirs::config_dir()
        .ok_or_else(|| AppError::ConfigError("Cannot locate OS config directory".into()))?
        .join("format-hub");

    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }

    Ok(dir)
}

/// Path to the JSON preferences file.
fn config_path() -> Result<PathBuf, AppError> {
    Ok(app_dir()?.join(CONFIG_FILE))
}

// ── Public API ───────────────────────────────────────────────────────────────

/// Reads `AppConfig` from disk.  Returns the default config if the
/// file does not yet exist so the caller never has to handle "first run"
/// specially.
pub fn load_config() -> Result<AppConfig, AppError> {
    let path = config_path()?;

    if !path.exists() {
        return Ok(AppConfig::default());
    }

    let contents = fs::read_to_string(&path)?;
    let config: AppConfig = serde_json::from_str(&contents)?;
    Ok(config)
}

/// Serialises `config` to disk, overwriting any previous version.
pub fn save_config(config: &AppConfig) -> Result<(), AppError> {
    let path = config_path()?;
    let json = serde_json::to_string_pretty(config)?;
    fs::write(path, json)?;
    Ok(())
}

// ── Window position (INI) ────────────────────────────────────────────────────
//
// The file looks like:
//
//     [window]
//     x=420
//     y=240
//
// Only `x` / `y` (physical pixels of the window's top-left corner) are
// stored; the size keeps coming from `tauri.conf.json`.

/// Path to the window-position INI file.
fn window_state_path() -> Result<PathBuf, AppError> {
    Ok(app_dir()?.join(WINDOW_STATE_FILE))
}

/// Reads the last saved window position.
///
/// Returns `None` on a first run or when the file is missing / malformed,
/// so the caller can simply fall back to the default placement.
pub fn load_window_position() -> Option<(i32, i32)> {
    let contents = fs::read_to_string(window_state_path().ok()?).ok()?;
    parse_window_position(&contents)
}

/// Persists the window's top-left corner to the INI file.
pub fn save_window_position(x: i32, y: i32) -> Result<(), AppError> {
    let ini = format!("[{WINDOW_SECTION}]\nx={x}\ny={y}\n");
    fs::write(window_state_path()?, ini)?;
    Ok(())
}

/// Minimal INI reader: walks the `[window]` section and collects `x` / `y`.
fn parse_window_position(contents: &str) -> Option<(i32, i32)> {
    let mut in_window_section = false;
    let (mut x, mut y) = (None, None);

    for line in contents.lines().map(str::trim) {
        if line.is_empty() || line.starts_with(';') || line.starts_with('#') {
            continue;
        }

        if let Some(section) = line.strip_prefix('[').and_then(|l| l.strip_suffix(']')) {
            in_window_section = section.trim().eq_ignore_ascii_case(WINDOW_SECTION);
            continue;
        }

        if !in_window_section {
            continue;
        }

        if let Some((key, value)) = line.split_once('=') {
            if let Ok(value) = value.trim().parse::<i32>() {
                match key.trim() {
                    k if k.eq_ignore_ascii_case("x") => x = Some(value),
                    k if k.eq_ignore_ascii_case("y") => y = Some(value),
                    _ => {}
                }
            }
        }
    }

    x.zip(y)
}

