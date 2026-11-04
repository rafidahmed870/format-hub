use std::{
    path::{Path, PathBuf},
    process::Command,
};

use crate::error::AppError;

// ── Builder ───────────────────────────────────────────────────────────────────

/// A fluent builder that constructs and executes an FFmpeg command.
///
/// # Example
/// ```rust,ignore
/// FfmpegBuilder::new(&ffmpeg_path, &input, &output)
///     .set_video_codec("libx264")
///     .set_audio_codec("aac")
///     .execute()?;
/// ```
#[derive(Debug)]
pub struct FfmpegBuilder {
    ffmpeg_path: PathBuf,
    input_path: PathBuf,
    output_path: PathBuf,
    video_codec: Option<String>,
    audio_codec: Option<String>,
    /// Any extra raw arguments appended before the output path.
    extra_args: Vec<String>,
}

impl FfmpegBuilder {
    /// Creates a new builder.  All paths are validated eagerly.
    pub fn new(
        ffmpeg_path: impl AsRef<Path>,
        input_path: impl AsRef<Path>,
        output_path: impl AsRef<Path>,
    ) -> Result<Self, AppError> {
        let ffmpeg_path = ffmpeg_path.as_ref().to_path_buf();
        let input_path = input_path.as_ref().to_path_buf();
        let output_path = output_path.as_ref().to_path_buf();

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

        Ok(Self {
            ffmpeg_path,
            input_path,
            output_path,
            video_codec: None,
            audio_codec: None,
            extra_args: Vec::new(),
        })
    }

    /// Sets the `-vcodec` argument (e.g. `"libx264"`, `"copy"`).
    pub fn set_video_codec(mut self, codec: impl Into<String>) -> Self {
        self.video_codec = Some(codec.into());
        self
    }

    /// Sets the `-acodec` argument (e.g. `"aac"`, `"libmp3lame"`).
    pub fn set_audio_codec(mut self, codec: impl Into<String>) -> Self {
        self.audio_codec = Some(codec.into());
        self
    }

    /// Appends arbitrary extra arguments before the output path.
    pub fn add_arg(mut self, arg: impl Into<String>) -> Self {
        self.extra_args.push(arg.into());
        self
    }

    /// Assembles and runs the FFmpeg command synchronously.
    ///
    /// Returns `Ok(())` on success, or an `AppError` describing the failure.
    pub fn execute(self) -> Result<(), AppError> {
        let mut cmd = Command::new(&self.ffmpeg_path);

        // Overwrite output without prompting
        cmd.arg("-y");

        // Input
        cmd.args(["-i", self.input_path.to_str().unwrap_or_default()]);

        // Optional codec flags
        if let Some(vc) = &self.video_codec {
            cmd.args(["-vcodec", vc]);
        }
        if let Some(ac) = &self.audio_codec {
            cmd.args(["-acodec", ac]);
        }

        // Any extra args
        for arg in &self.extra_args {
            cmd.arg(arg);
        }

        // Output path
        cmd.arg(self.output_path.to_str().unwrap_or_default());

        let output = cmd.output().map_err(|e| AppError::ExecutionFailed {
            reason: e.to_string(),
        })?;

        if output.status.success() {
            Ok(())
        } else {
            Err(AppError::ConversionFailed {
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            })
        }
    }

    // ── Accessors for the progress runner ────────────────────────────────────

    pub fn ffmpeg_path(&self) -> &PathBuf {
        &self.ffmpeg_path
    }

    pub fn input_path(&self) -> &PathBuf {
        &self.input_path
    }

    pub fn output_path(&self) -> &PathBuf {
        &self.output_path
    }

    pub fn video_codec(&self) -> Option<&String> {
        self.video_codec.as_ref()
    }

    pub fn audio_codec(&self) -> Option<&String> {
        self.audio_codec.as_ref()
    }

    pub fn extra_args(&self) -> &[String] {
        &self.extra_args
    }
}

