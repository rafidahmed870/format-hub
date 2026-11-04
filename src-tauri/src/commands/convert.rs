use std::{
    fs,
    path::{Path, PathBuf},
};

use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::{
    error::AppError,
    ffmpeg::{
        builder::FfmpegBuilder,
        info::{get_media_info, parse_duration_secs},
        progress::{resolve_ffmpeg, resolve_ffprobe, run_ffmpeg_with_progress},
    },
    fs::validation::{validate_input_file, validate_target_format},
};

// ── Response types ────────────────────────────────────────────────────────────

/// Returned to the frontend after a successful single-file conversion.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertResult {
    pub output_file: String,
    pub output_folder: String,
    pub size_before: u64,
    pub size_after: u64,
}

/// One item in a batch conversion request.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchItem {
    pub input_path: String,
    pub target_format: String,
}

/// Per-file result in a batch response.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchResult {
    pub input_path: String,
    pub output_file: Option<String>,
    pub output_folder: Option<String>,
    pub error: Option<String>,
    pub size_before: Option<u64>,
    pub size_after: Option<u64>,
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Collects the codec flags and extra arguments a [`FfmpegBuilder`] would
/// pass to FFmpeg, so they can be handed to the progress-aware runner.
fn collect_ffmpeg_args(builder: &FfmpegBuilder) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();

    if let Some(vc) = builder.video_codec() {
        args.extend(["-vcodec".into(), vc.clone()]);
    }
    if let Some(ac) = builder.audio_codec() {
        args.extend(["-acodec".into(), ac.clone()]);
    }
    args.extend_from_slice(builder.extra_args());

    args
}

/// Reads the duration of `input_path` in seconds, which the progress runner
/// turns into a percentage.  Returns `0.0` when FFprobe cannot tell (e.g. a
/// still image), in which case no percentage is emitted.
fn probe_duration_secs(ffprobe_path: &Path, input_path: &Path) -> f64 {
    get_media_info(ffprobe_path, input_path)
        .ok()
        .and_then(|info| {
            info.format
                .duration
                .as_deref()
                .and_then(parse_duration_secs)
        })
        .unwrap_or(0.0)
}

/// Builds (or reuses) a date-stamped output directory next to the binary.
fn get_output_dir() -> Result<PathBuf, AppError> {
    let exe_dir = std::env::current_exe()?
        .parent()
        .ok_or_else(|| AppError::ConfigError("Cannot locate exe directory".into()))?
        .to_path_buf();

    let date_str = Local::now().format("%Y-%m-%d").to_string();
    let output_dir = exe_dir.join(format!("format-hub-{}", date_str));

    if !output_dir.exists() {
        fs::create_dir_all(&output_dir)?;
    }

    Ok(output_dir)
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// Converts a single media file to `target_format`.
///
/// Emits real-time `"conversion-progress"` events on the Tauri event bus.
///
/// # Errors
/// Returns an `AppError` (serialised as `String`) when:
/// - The input file is missing.
/// - The FFmpeg / FFprobe binary cannot be found.
/// - FFmpeg exits with a non-zero status.
#[tauri::command]
pub async fn convert_media(
    app: AppHandle,
    input_path: String,
    target_format: String,
) -> Result<ConvertResult, String> {
    // ── Validate input ────────────────────────────────────────────────────────
    let input_buf = PathBuf::from(&input_path);
    validate_input_file(&input_buf).map_err(String::from)?;
    validate_target_format(&target_format).map_err(String::from)?;

    // ── Resolve binaries ──────────────────────────────────────────────────────
    let ffmpeg_path = resolve_ffmpeg(&app).map_err(String::from)?;
    let ffprobe_path = resolve_ffprobe(&app).map_err(String::from)?;

    // ── Build output path ─────────────────────────────────────────────────────
    let file_stem = input_buf
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| AppError::ConfigError("Invalid file name".into()).to_string())?
        .to_string();

    let output_dir = get_output_dir().map_err(String::from)?;
    let output_path = output_dir.join(format!("{}.{}", file_stem, target_format));

    // ── Probe duration for progress tracking ──────────────────────────────────
    let total_secs = probe_duration_secs(&ffprobe_path, &input_buf);

    // ── Build the FFmpeg command ───────────────────────────────────────────────
    // FfmpegBuilder is used for validation & codec configuration; the actual
    // execution is delegated to run_ffmpeg_with_progress so we get live events.
    let builder =
        FfmpegBuilder::new(&ffmpeg_path, &input_buf, &output_path).map_err(String::from)?;
    let extra_args = collect_ffmpeg_args(&builder);

    // ── File sizes ────────────────────────────────────────────────────────────
    let size_before = fs::metadata(&input_path).map(|m| m.len()).unwrap_or(0);

    // ── Execute with progress ─────────────────────────────────────────────────
    run_ffmpeg_with_progress(
        &app,
        &ffmpeg_path,
        &input_buf,
        &output_path,
        total_secs,
        &extra_args,
    )
    .map_err(String::from)?;

    let size_after = fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);

    let output_file = output_path
        .to_str()
        .ok_or_else(|| "Invalid output path encoding".to_string())?
        .to_string();

    let output_folder = output_dir
        .to_str()
        .ok_or_else(|| "Invalid output folder encoding".to_string())?
        .to_string();

    Ok(ConvertResult {
        output_file,
        output_folder,
        size_before,
        size_after,
    })
}

/// Converts a single batch item in its own thread.
///
/// Every failure — validation, FFmpeg, threading — is captured in the returned
/// [`BatchResult`] so the rest of the batch keeps going.
fn convert_batch_item(
    app: &AppHandle,
    ffmpeg_path: &Path,
    ffprobe_path: &Path,
    output_dir: &Path,
    item: BatchItem,
) -> BatchResult {
    let failure = |input_path: String, error: String| BatchResult {
        input_path,
        output_file: None,
        output_folder: None,
        error: Some(error),
        size_before: None,
        size_after: None,
    };

    let input_buf = PathBuf::from(&item.input_path);

    if let Err(error) = validate_input_file(&input_buf) {
        return failure(item.input_path, error.to_string());
    }
    if let Err(error) = validate_target_format(&item.target_format) {
        return failure(item.input_path, error.to_string());
    }

    let Some(file_stem) = input_buf.file_stem().and_then(|s| s.to_str()) else {
        return failure(item.input_path, "Invalid file name".into());
    };

    let output_path = output_dir.join(format!("{}.{}", file_stem, item.target_format));

    let builder = match FfmpegBuilder::new(ffmpeg_path, &input_buf, &output_path) {
        Ok(builder) => builder,
        Err(error) => return failure(item.input_path, error.to_string()),
    };

    // Executed through the progress runner (rather than `builder.execute()`)
    // so this file reports live progress like the single-file command does.
    let extra_args = collect_ffmpeg_args(&builder);
    let total_secs = probe_duration_secs(ffprobe_path, &input_buf);
    let size_before = fs::metadata(&item.input_path).map(|m| m.len()).unwrap_or(0);

    if let Err(error) = run_ffmpeg_with_progress(
        app,
        ffmpeg_path,
        &input_buf,
        &output_path,
        total_secs,
        &extra_args,
    ) {
        return failure(item.input_path, error.to_string());
    }

    let size_after = fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);

    BatchResult {
        input_path: item.input_path,
        output_file: Some(output_path.to_string_lossy().into_owned()),
        output_folder: Some(output_dir.to_string_lossy().into_owned()),
        error: None,
        size_before: Some(size_before),
        size_after: Some(size_after),
    }
}

/// Converts multiple media files concurrently (up to OS thread limits).
///
/// Each file is converted independently; a failure in one item does **not**
/// abort the others.  Every file emits `"conversion-progress"` events that
/// carry its `inputPath`, so the UI can track them all in parallel.
#[tauri::command]
pub async fn convert_media_batch(
    app: AppHandle,
    items: Vec<BatchItem>,
) -> Result<Vec<BatchResult>, String> {
    use std::sync::Arc;
    use std::thread;

    if items.is_empty() {
        return Ok(vec![]);
    }

    let ffmpeg_path = Arc::new(resolve_ffmpeg(&app).map_err(String::from)?);
    let ffprobe_path = Arc::new(resolve_ffprobe(&app).map_err(String::from)?);
    let output_dir = Arc::new(get_output_dir().map_err(String::from)?);

    let mut handles = Vec::with_capacity(items.len());

    for item in items {
        let ffmpeg_path = Arc::clone(&ffmpeg_path);
        let ffprobe_path = Arc::clone(&ffprobe_path);
        let output_dir = Arc::clone(&output_dir);
        let app = app.clone();

        let handle = thread::spawn(move || -> BatchResult {
            convert_batch_item(&app, &ffmpeg_path, &ffprobe_path, &output_dir, item)
        });

        handles.push(handle);
    }

    let results = handles
        .into_iter()
        .map(|h| {
            h.join().unwrap_or_else(|_| BatchResult {
                input_path: String::new(),
                output_file: None,
                output_folder: None,
                error: Some("Thread panicked during conversion".into()),
                size_before: None,
                size_after: None,
            })
        })
        .collect();

    Ok(results)
}

