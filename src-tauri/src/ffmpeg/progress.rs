use std::{
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

use tauri::{AppHandle, Emitter, Manager};

use crate::error::AppError;
use crate::ffmpeg::info::parse_duration_secs;

// ── Event payload ─────────────────────────────────────────────────────────────

/// Payload emitted on the `conversion-progress` Tauri event.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    /// Source file this update belongs to.  Several files may be converted
    /// at the same time, so the UI needs this to route progress to the
    /// matching row.
    pub input_path: String,
    /// Progress percentage in the range `[0.0, 100.0]`.
    pub percent: f64,
    /// Current encode position as an `HH:MM:SS.mm` string.
    pub current_time: String,
    /// Total duration of the source file in seconds.
    pub total_secs: f64,
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Spawns FFmpeg, reads stderr line-by-line looking for the `time=…` progress
/// token, converts each timestamp into a percentage of `total_duration_secs`,
/// and emits a `"conversion-progress"` Tauri event for every update.
///
/// Blocks until FFmpeg exits.  Returns `Ok(())` on success or an `AppError`
/// on failure.
///
/// # Arguments
/// * `app`                 – Tauri `AppHandle` used to emit events.
/// * `ffmpeg_path`         – Path to the FFmpeg binary.
/// * `input_path`          – Source media file.
/// * `output_path`         – Destination file.
/// * `total_duration_secs` – Duration of the source (from `MediaInfo`), used
///                           to compute the percentage.  Pass `0.0` to skip
///                           progress reporting.
/// * `extra_args`          – Any additional FFmpeg arguments inserted between
///                           the input flag and the output path.
pub fn run_ffmpeg_with_progress(
    app: &AppHandle,
    ffmpeg_path: impl AsRef<Path>,
    input_path: impl AsRef<Path>,
    output_path: impl AsRef<Path>,
    total_duration_secs: f64,
    extra_args: &[String],
) -> Result<(), AppError> {
    let ffmpeg_path = ffmpeg_path.as_ref();
    let input_path = input_path.as_ref();
    let output_path = output_path.as_ref();

    // Reported back with every event so the UI can tell parallel
    // conversions apart.
    let source = input_path.display().to_string();

    if !ffmpeg_path.exists() {
        return Err(AppError::FfmpegMissing {
            path: ffmpeg_path.display().to_string(),
        });
    }
    if !input_path.exists() {
        return Err(AppError::FileNotFound {
            path: input_path.display().to_string(),
        });
    }

    let mut cmd = Command::new(ffmpeg_path);
    cmd.arg("-y")
        .args(["-i", input_path.to_str().unwrap_or_default()])
        // Ask FFmpeg to write progress info on stderr in a parseable way
        .args(["-progress", "pipe:2", "-nostats"])
        .args(extra_args)
        .arg(output_path.to_str().unwrap_or_default())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| AppError::ExecutionFailed {
        reason: e.to_string(),
    })?;

    // Read stderr in the calling thread (FFmpeg writes progress there)
    if let Some(stderr) = child.stderr.take() {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            let line = match line {
                Ok(l) => l,
                Err(_) => continue,
            };

            // Parse either `time=HH:MM:SS.mm` (from -progress pipe) or the
            // legacy `out_time=HH:MM:SS.mm` token that appears in progress output.
            if let Some(time_str) = extract_time_value(&line) {
                if total_duration_secs > 0.0 {
                    if let Some(current_secs) = parse_duration_secs(&time_str) {
                        let percent =
                            (current_secs / total_duration_secs * 100.0).clamp(0.0, 100.0);

                        let payload = ProgressPayload {
                            input_path: source.clone(),
                            percent,
                            current_time: time_str,
                            total_secs: total_duration_secs,
                        };

                        // Best-effort: ignore emit errors (window may have closed)
                        let _ = app.emit("conversion-progress", payload);
                    }
                }
            }
        }
    }

    let status = child.wait().map_err(|e| AppError::ExecutionFailed {
        reason: e.to_string(),
    })?;

    if status.success() {
        // Emit a final 100 % event so the UI can display "done"
        if total_duration_secs > 0.0 {
            let _ = app.emit(
                "conversion-progress",
                ProgressPayload {
                    input_path: source,
                    percent: 100.0,
                    current_time: String::new(),
                    total_secs: total_duration_secs,
                },
            );
        }
        Ok(())
    } else {
        Err(AppError::ConversionFailed {
            stderr: "FFmpeg exited with a non-zero status code.".into(),
        })
    }
}

// ── Private helpers ───────────────────────────────────────────────────────────

/// Extracts the time value from a line like:
/// * `out_time=00:00:12.34`  (produced by `-progress pipe:2`)
/// * `time=00:00:12.34`      (from legacy stderr output)
fn extract_time_value(line: &str) -> Option<String> {
    // Try `out_time=` first (more reliable with -progress pipe:2)
    for prefix in &["out_time=", "time="] {
        if let Some(rest) = line.trim().strip_prefix(prefix) {
            let value = rest.trim();
            // Skip sentinel "N/A" values FFmpeg emits at the very start
            if !value.is_empty() && value != "N/A" {
                return Some(value.to_string());
            }
        }
    }
    None
}

// ── Path helper used by commands ─────────────────────────────────────────────

/// Resolves the FFmpeg binary path for both dev and production builds.
///
/// In dev the binary is expected at `<manifest_dir>/bin/ffmpeg[.exe]`.
/// In release it is looked up via Tauri's resource resolver.
pub fn resolve_ffmpeg(app: &AppHandle) -> Result<PathBuf, AppError> {
    let ffmpeg_name = if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" };

    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("bin")
        .join(ffmpeg_name);

    if dev_path.exists() {
        return Ok(dev_path);
    }

    app.path()
        .resolve(
            format!("bin/{}", ffmpeg_name),
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| AppError::FfmpegMissing {
            path: format!("bin/{} — {}", ffmpeg_name, e),
        })
}

/// Resolves the FFprobe binary path using the same strategy as [`resolve_ffmpeg`].
pub fn resolve_ffprobe(app: &AppHandle) -> Result<PathBuf, AppError> {
    let ffprobe_name = if cfg!(windows) {
        "ffprobe.exe"
    } else {
        "ffprobe"
    };

    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("bin")
        .join(ffprobe_name);

    if dev_path.exists() {
        return Ok(dev_path);
    }

    app.path()
        .resolve(
            format!("bin/{}", ffprobe_name),
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| AppError::FfmpegMissing {
            path: format!("bin/{} — {}", ffprobe_name, e),
        })
}
