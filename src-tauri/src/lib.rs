use chrono::Local;
use serde::Serialize;
use std::{fs, path::PathBuf, process::Command};
use tauri::Manager;

#[derive(Serialize)]
struct ConvertResult {
    output_file: String,
    output_folder: String,
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

    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = current_exe.parent().ok_or("Cannot find exe directory")?;

    let date_str = Local::now().format("%Y-%m-%d").to_string();
    let output_folder_name = format!("format-hub-{}", date_str);
    let output_dir = exe_dir.join(&output_folder_name);

    if !output_dir.exists() {
        fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    }

    let output_file_name = format!("{}.{}", file_stem, target_format);
    let output_path_buf = output_dir.join(&output_file_name);

    // Resolve FFmpeg path (Dev vs Prod)
    let ffmpeg_name = if cfg!(windows) {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };

    let ffmpeg_bin = {
        let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("bin")
            .join(ffmpeg_name);

        if dev_path.exists() {
            dev_path
        } else {
            app.path()
                .resolve(
                    format!("bin/{}", ffmpeg_name),
                    tauri::path::BaseDirectory::Resource,
                )
                .map_err(|e| format!("Failed to resolve ffmpeg path: {}", e))?
        }
    };

    if !ffmpeg_bin.exists() {
        return Err(
            "FFmpeg executable not found. Please ensure it's placed in the bin folder.".into(),
        );
    }

    let output = Command::new(ffmpeg_bin)
        .args([
            "-i",
            &input_path,
            "-y",
            output_path_buf.to_str().ok_or("Invalid output path")?,
        ])
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    if output.status.success() {
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
        })
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("Conversion failed: {}", err))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![convert_media, open_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
