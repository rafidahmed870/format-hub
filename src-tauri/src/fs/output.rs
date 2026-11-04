use std::{fs, path::PathBuf};

use chrono::Local;

use crate::error::AppError;

/// Creates (if needed) and returns a date-stamped output directory adjacent
/// to the running binary.
///
/// The directory name has the form `format-hub-YYYY-MM-DD`.
pub fn get_output_dir() -> Result<PathBuf, AppError> {
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

/// Creates (if needed) and returns a custom output directory at `path`.
pub fn ensure_output_dir(path: impl Into<PathBuf>) -> Result<PathBuf, AppError> {
    let dir: PathBuf = path.into();
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

