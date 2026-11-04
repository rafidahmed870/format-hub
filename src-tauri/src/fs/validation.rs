use std::path::Path;

use crate::error::AppError;

/// Extensions accepted as conversion **input**.
const SUPPORTED_INPUT_EXTENSIONS: &[&str] = &[
    // Video
    "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "ts", "m4v", "3gp",
    // Audio
    "mp3", "aac", "ogg", "wav", "flac", "m4a", "opus", "wma", "aiff",
    // Image
    "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "avif", "ico",
];

/// Lower-cased extension of `path`, without the leading dot.
fn extension_of(path: &Path) -> String {
    path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase()
}

/// Checks that `file_path` exists and is a media type we can convert.
///
/// Returns `Ok(())` on success or an `AppError` describing the problem.
pub fn validate_input_file(file_path: impl AsRef<Path>) -> Result<(), AppError> {
    let path = file_path.as_ref();

    if !path.exists() {
        return Err(AppError::FileNotFound {
            path: path.display().to_string(),
        });
    }

    let ext = extension_of(path);

    if !SUPPORTED_INPUT_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AppError::UnsupportedInputType {
            extension: if ext.is_empty() {
                "(none)".to_string()
            } else {
                format!(".{ext}")
            },
        });
    }

    Ok(())
}

/// Checks that `format` is a supported output target.
pub fn validate_target_format(format: &str) -> Result<(), AppError> {
    let format = format.trim().to_lowercase();

    if !SUPPORTED_INPUT_EXTENSIONS.contains(&format.as_str()) {
        return Err(AppError::UnsupportedOutputFormat { format });
    }

    Ok(())
}
