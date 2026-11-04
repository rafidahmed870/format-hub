// ── Module declarations ───────────────────────────────────────────────────────

/// Centralised error type used throughout the backend.
pub mod error;

/// Persistent user configuration (load / save via `dirs`).
pub mod config;

/// FFmpeg wrapper: builder, media info prober, and progress emitter.
pub mod ffmpeg;

/// File-system utilities: output directory management and input validation.
pub mod fs;

/// Tauri command handlers exposed to the frontend.
pub mod commands;

// ── App entry point ───────────────────────────────────────────────────────────

use std::{
    sync::Mutex,
    time::{Duration, Instant},
};

use tauri::{Manager, PhysicalPosition, Window, WindowEvent};

use commands::{
    convert::{convert_media, convert_media_batch},
    system::{check_system, get_config, open_folder, probe_media, set_config},
};

/// Label of the app's single window (see `tauri.conf.json`).
const MAIN_WINDOW: &str = "main";

/// Shortest gap between two position writes while the window is dragged,
/// so the INI file is not rewritten on every mouse-move event.
const POSITION_WRITE_INTERVAL: Duration = Duration::from_millis(1_000);

/// Remembers when the position was last flushed to disk.
#[derive(Default)]
struct PositionTracker {
    last_write: Mutex<Option<Instant>>,
}

/// Moves the window back to its last position — but only when the whole
/// window still fits inside a connected monitor.  Anything that is even
/// partially off-screen is ignored, so the window keeps the centred
/// placement `center: true` gives it at startup.
fn restore_window_position(window: &Window) {
    let Some((x, y)) = config::load_window_position() else {
        return;
    };

    if !fits_on_screen(window, x, y) {
        return;
    }

    if let Err(error) = window.set_position(PhysicalPosition::new(x, y)) {
        eprintln!("failed to restore window position: {error}");
    }
}

/// Checks whether the window rectangle at `(x, y)` lies completely inside
/// at least one of the currently connected monitors.
fn fits_on_screen(window: &Window, x: i32, y: i32) -> bool {
    let Ok(window_size) = window.outer_size() else {
        return false;
    };
    let Ok(monitors) = window.available_monitors() else {
        return false;
    };

    monitors.iter().any(|monitor| {
        let origin = monitor.position();
        let screen = monitor.size();

        let right = x.saturating_add(window_size.width as i32);
        let bottom = y.saturating_add(window_size.height as i32);
        let screen_right = origin.x.saturating_add(screen.width as i32);
        let screen_bottom = origin.y.saturating_add(screen.height as i32);

        x >= origin.x && y >= origin.y && right <= screen_right && bottom <= screen_bottom
    })
}

/// Writes the window's current position to the INI file.
fn persist_window_position(window: &Window) {
    let Ok(position) = window.outer_position() else {
        return;
    };

    if let Err(error) = config::save_window_position(position.x, position.y) {
        eprintln!("failed to save window position: {error}");
    }
}

/// Keeps the persisted position in sync with the window.
fn handle_window_event(window: &Window, event: &WindowEvent) {
    match event {
        // Throttled while dragging.  This is also the only chance to record
        // the position on an OS shutdown, where no close event arrives.
        WindowEvent::Moved(_) => {
            let tracker = window.state::<PositionTracker>();
            let mut last_write = tracker.last_write.lock().unwrap();

            let elapsed = last_write.map_or(true, |last| last.elapsed() >= POSITION_WRITE_INTERVAL);
            if elapsed {
                *last_write = Some(Instant::now());
                drop(last_write);
                persist_window_position(window);
            }
        }
        // Exact position right before the window goes away.
        WindowEvent::CloseRequested { .. } => {
            if window.label() == MAIN_WINDOW {
                persist_window_position(window);
            }
        }
        _ => {}
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ───────────────────────────────────────────────────────────
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        // ── Window position ───────────────────────────────────────────────────
        .manage(PositionTracker::default())
        .setup(|app| {
            // `Manager::get_window` requires the `unstable` feature, so the
            // window is reached through its webview instead.
            let window = app
                .get_webview_window(MAIN_WINDOW)
                .map(|webview_window| webview_window.as_ref().window());

            if let Some(window) = window {
                restore_window_position(&window);
            }
            Ok(())
        })
        .on_window_event(handle_window_event)
        // ── Commands ──────────────────────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            // Conversion
            convert_media,
            convert_media_batch,
            // System / shell
            open_folder,
            check_system,
            // Config
            get_config,
            set_config,
            // Media probe
            probe_media,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
