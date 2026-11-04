use thiserror::Error;

/// Central error type for the entire Format Hub backend.
///
/// Every variant carries a human-readable message that the frontend
/// can display directly.  `From<AppError> for String` is implemented
/// so Tauri can serialize the error through its `Result<T, String>`
/// command return type without any extra boilerplate at the call site.
#[derive(Debug, Error)]
pub enum AppError {
    /// The file the user requested does not exist on disk.
    #[error("File not found: {path}")]
    FileNotFound { path: String },

    /// The selected file's extension is not a media type the app converts.
    #[error("Unsupported input file type: {extension}")]
    UnsupportedInputType { extension: String },

    /// The requested output format is not one the app can produce.
    #[error("Unsupported output format: {format}")]
    UnsupportedOutputFormat { format: String },

    /// The FFmpeg (or FFprobe) binary could not be located.
    #[error("FFmpeg binary not found at: {path}")]
    FfmpegMissing { path: String },

    /// Spawning or waiting on the FFmpeg process failed.
    #[error("FFmpeg execution failed: {reason}")]
    ExecutionFailed { reason: String },

    /// FFmpeg exited with a non-zero status code.
    #[error("Conversion failed: {stderr}")]
    ConversionFailed { stderr: String },

    /// A config file I/O error.
    #[error("Config error: {0}")]
    ConfigError(String),

    /// JSON (de)serialization error.
    #[error("Serialization error: {0}")]
    SerdeError(#[from] serde_json::Error),

    /// Any other I/O error not covered above.
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

/// Tauri commands return `Result<T, String>`, so we provide this
/// blanket conversion so the `?` operator works seamlessly.
impl From<AppError> for String {
    fn from(e: AppError) -> Self {
        e.to_string()
    }
}

