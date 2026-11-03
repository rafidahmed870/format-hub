use chrono::Local;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, process::Command};
use tauri::Manager;

#[derive(Serialize)]
struct ConvertResult {
    output_file: String,
    output_folder: String,
    size_before: u64,
    size_after: u64,
}

/// একটি batch item — input path + target format
#[derive(Deserialize)]
struct BatchItem {
    input_path: String,
    target_format: String,
}

/// Batch result per-file — error থাকলে `error` field-এ থাকবে
#[derive(Serialize)]
struct BatchResult {
    input_path: String,
    output_file: Option<String>,
    output_folder: Option<String>,
    error: Option<String>,
    size_before: Option<u64>,
    size_after: Option<u64>,
}

/// FFmpeg binary path resolve করে (dev এবং prod উভয় ক্ষেত্রে)
fn resolve_ffmpeg(app: &tauri::AppHandle) -> Result<PathBuf, String> {
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
        .map_err(|e| format!("Failed to resolve ffmpeg path: {}", e))
}

/// Output directory তৈরি করে এবং path return করে
fn get_output_dir() -> Result<PathBuf, String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = current_exe.parent().ok_or("Cannot find exe directory")?;
    let date_str = Local::now().format("%Y-%m-%d").to_string();
    let output_dir = exe_dir.join(format!("format-hub-{}", date_str));
    if !output_dir.exists() {
        fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    }
    Ok(output_dir)
}

/// একটি single file convert করে (shared helper)
fn run_ffmpeg_convert(
    ffmpeg_bin: &PathBuf,
    input_path: &str,
    output_path: &PathBuf,
) -> Result<(), String> {
    let output = Command::new(ffmpeg_bin)
        .args([
            "-i",
            input_path,
            "-y",
            output_path.to_str().ok_or("Invalid output path")?,
        ])
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("Conversion failed: {}", err))
    }
}

#[tauri::command]
async fn open_folder(folder_path: String) -> Result<(), String> {
    let path = PathBuf::from(&folder_path);
    if !path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn convert_media(
    app: tauri::AppHandle,
    input_path: String,
    target_format: String,
) -> Result<ConvertResult, String> {
    let input_path_buf = PathBuf::from(&input_path);

    if !input_path_buf.exists() {
        return Err("Input file does not exist".into());
    }

    let file_stem = input_path_buf
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or("Invalid file name")?
        .to_string();

    let ffmpeg_bin = resolve_ffmpeg(&app)?;
    if !ffmpeg_bin.exists() {
        return Err(
            "FFmpeg executable not found. Please ensure it's placed in the bin folder.".into(),
        );
    }

    let output_dir = get_output_dir()?;
    let output_file_name = format!("{}.{}", file_stem, target_format);
    let output_path_buf = output_dir.join(&output_file_name);

    // Conversion এর আগে input file size নিই
    let size_before = fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    run_ffmpeg_convert(&ffmpeg_bin, &input_path, &output_path_buf)?;

    // Conversion এর পরে output file size নিই
    let size_after = fs::metadata(&output_path_buf)
        .map(|m| m.len())
        .unwrap_or(0);

    let output_file = output_path_buf
        .to_str()
        .ok_or("Invalid output path encoding")?
        .to_string();
    let output_folder = output_dir
        .to_str()
        .ok_or("Invalid output folder encoding")?
        .to_string();

    Ok(ConvertResult {
        output_file,
        output_folder,
        size_before,
        size_after,
    })
}

/// Batch conversion — একসাথে ৫টি file পর্যন্ত parallel-এ process করে।
/// প্রতিটি file-এর result আলাদাভাবে return হয়, একটা fail হলে বাকিগুলো চলতে থাকে।
#[tauri::command]
async fn convert_media_batch(
    app: tauri::AppHandle,
    items: Vec<BatchItem>,
) -> Result<Vec<BatchResult>, String> {
    use std::sync::Arc;
    use std::thread;

    if items.is_empty() {
        return Ok(vec![]);
    }

    // FFmpeg path & output dir একবার resolve করি সবার জন্য
    let ffmpeg_bin = resolve_ffmpeg(&app)?;
    if !ffmpeg_bin.exists() {
        return Err(
            "FFmpeg executable not found. Please ensure it's placed in the bin folder.".into(),
        );
    }
    let output_dir = get_output_dir()?;

    let ffmpeg_bin = Arc::new(ffmpeg_bin);
    let output_dir = Arc::new(output_dir);

    // Thread handles collect করি
    let mut handles = Vec::with_capacity(items.len());

    for item in items {
        let ffmpeg_bin = Arc::clone(&ffmpeg_bin);
        let output_dir = Arc::clone(&output_dir);

        let handle = thread::spawn(move || {
            let input_path_buf = PathBuf::from(&item.input_path);

            if !input_path_buf.exists() {
                return BatchResult {
                    input_path: item.input_path,
                    output_file: None,
                    output_folder: None,
                    error: Some("Input file does not exist".to_string()),
                    size_before: None,
                    size_after: None,
                };
            }

            let file_stem = match input_path_buf
                .file_stem()
                .and_then(|s| s.to_str())
            {
                Some(s) => s.to_string(),
                None => {
                    return BatchResult {
                        input_path: item.input_path,
                        output_file: None,
                        output_folder: None,
                        error: Some("Invalid file name".to_string()),
                        size_before: None,
                        size_after: None,
                    }
                }
            };

            let output_file_name = format!("{}.{}", file_stem, item.target_format);
            let output_path_buf = output_dir.join(&output_file_name);

            // Conversion এর আগে input file size নিই
            let size_before = fs::metadata(&item.input_path)
                .map(|m| m.len())
                .unwrap_or(0);

            match run_ffmpeg_convert(&ffmpeg_bin, &item.input_path, &output_path_buf) {
                Ok(()) => {
                    // Conversion এর পরে output file size নিই
                    let size_after = fs::metadata(&output_path_buf)
                        .map(|m| m.len())
                        .unwrap_or(0);
                    let output_file = output_path_buf.to_str().unwrap_or("").to_string();
                    let output_folder = output_dir.to_str().unwrap_or("").to_string();
                    BatchResult {
                        input_path: item.input_path,
                        output_file: Some(output_file),
                        output_folder: Some(output_folder),
                        error: None,
                        size_before: Some(size_before),
                        size_after: Some(size_after),
                    }
                }
                Err(e) => BatchResult {
                    input_path: item.input_path,
                    output_file: None,
                    output_folder: None,
                    error: Some(e),
                    size_before: None,
                    size_after: None,
                },
            }
        });

        handles.push(handle);
    }

    // সব thread শেষ হওয়ার জন্য wait করি
    let results = handles
        .into_iter()
        .map(|h| h.join().unwrap_or_else(|_| BatchResult {
            input_path: String::new(),
            output_file: None,
            output_folder: None,
            error: Some("Thread panicked during conversion".to_string()),
            size_before: None,
            size_after: None,
        }))
        .collect();

    Ok(results)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![convert_media, convert_media_batch, open_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
