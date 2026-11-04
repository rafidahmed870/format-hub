use std::{path::Path, process::Command};

use serde::{Deserialize, Serialize};

use crate::error::AppError;

// ── Structs ───────────────────────────────────────────────────────────────────

/// Top-level media information returned by `ffprobe`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaInfo {
    /// All streams found in the container (video, audio, subtitle …).
    pub streams: Vec<StreamInfo>,
    /// Container-level metadata.
    pub format: FormatInfo,
}

/// Information about a single stream inside a media container.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamInfo {
    /// Stream index (0-based).
    pub index: u32,
    /// Codec type: `"video"`, `"audio"`, `"subtitle"`, etc.
    pub codec_type: Option<String>,
    /// Short codec name, e.g. `"h264"`, `"aac"`.
    pub codec_name: Option<String>,
    /// Human-readable codec long name.
    pub codec_long_name: Option<String>,
    /// Video width in pixels (video streams only).
    pub width: Option<u32>,
    /// Video height in pixels (video streams only).
    pub height: Option<u32>,
    /// Frame rate as a ratio string, e.g. `"30000/1001"`.
    pub r_frame_rate: Option<String>,
    /// Bit rate string in bits per second.
    pub bit_rate: Option<String>,
    /// Duration of the stream in seconds (as a string from ffprobe).
    pub duration: Option<String>,
    /// Sample rate for audio streams (e.g. `"44100"`).
    pub sample_rate: Option<String>,
    /// Number of channels for audio streams.
    pub channels: Option<u32>,
}

/// Container-level (format) information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormatInfo {
    /// The file name as reported by ffprobe.
    pub filename: Option<String>,
    /// Number of streams inside the file.
    pub nb_streams: Option<u32>,
    /// Short format name(s), e.g. `"mov,mp4,m4a,3gp,3g2,mj2"`.
    pub format_name: Option<String>,
    /// Human-readable format long name.
    pub format_long_name: Option<String>,
    /// Total file duration in seconds (as a string from ffprobe).
    pub duration: Option<String>,
    /// Total file size in bytes (as a string from ffprobe).
    pub size: Option<String>,
    /// Overall bit rate in bits per second (as a string from ffprobe).
    pub bit_rate: Option<String>,
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Runs `ffprobe` against `file_path` and parses the JSON output into a
/// [`MediaInfo`] struct.
///
/// # Arguments
/// * `ffprobe_path` – Path to the `ffprobe` (or `ffprobe.exe`) binary.
/// * `file_path`    – Path to the media file to inspect.
pub fn get_media_info(
    ffprobe_path: impl AsRef<Path>,
    file_path: impl AsRef<Path>,
) -> Result<MediaInfo, AppError> {
    let ffprobe_path = ffprobe_path.as_ref();
    let file_path = file_path.as_ref();

    // Validate paths before spawning a process
    if !ffprobe_path.exists() {
        return Err(AppError::FfmpegMissing {
            path: ffprobe_path.display().to_string(),
        });
    }
    if !file_path.exists() {
        return Err(AppError::FileNotFound {
            path: file_path.display().to_string(),
        });
    }

    let output = Command::new(ffprobe_path)
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_streams",
            "-show_format",
            file_path.to_str().unwrap_or_default(),
        ])
        .output()
        .map_err(|e| AppError::ExecutionFailed {
            reason: format!("ffprobe: {}", e),
        })?;

    if !output.status.success() {
        return Err(AppError::ExecutionFailed {
            reason: String::from_utf8_lossy(&output.stderr).to_string(),
        });
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let info: MediaInfo = serde_json::from_str(&json_str)?;

    Ok(info)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Parses a duration string like `"00:01:23.456"` or `"83.456"` (seconds)
/// into a total number of seconds as `f64`.
///
/// Returns `None` if the string cannot be parsed.
pub fn parse_duration_secs(s: &str) -> Option<f64> {
    let s = s.trim();

    // Try HH:MM:SS.mmm format first
    let parts: Vec<&str> = s.splitn(3, ':').collect();
    if parts.len() == 3 {
        let h: f64 = parts[0].parse().ok()?;
        let m: f64 = parts[1].parse().ok()?;
        let s: f64 = parts[2].parse().ok()?;
        return Some(h * 3600.0 + m * 60.0 + s);
    }

    // Fall back to plain seconds string
    s.parse().ok()
}

