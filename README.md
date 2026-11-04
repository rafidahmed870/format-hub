# Format Hub

Convert images, audio, and video between formats — fast, offline, and private. Built with Tauri, Rust, and React.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/rafidahmed870/format-hub/blob/main/LICENSE) ![Platform: Windows](https://img.shields.io/badge/platform-Windows-0078D6.svg) ![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB.svg) ![Rust](https://img.shields.io/badge/Rust-stable-DEA584.svg)

## Overview

Format Hub is a lightweight desktop application that converts media files entirely on your machine. No uploads, no accounts, no internet connection required — every conversion runs locally through a bundled FFmpeg sidecar driven by a Rust backend.

## Features

- **Offline and private** — files never leave your computer.
- **Images, audio, and video** — one app for every media type.
- **Batch conversion** — drop 10–20 files at once and convert them together.
- **Real-time progress** — per-file percentage updates streamed from FFmpeg.
- **Desktop notification** — an OS toast tells you when a batch finishes.
- **Size comparison** — see the file size before and after each conversion.
- **Remembers your window** — reopens at the same position (unless it was moved off-screen).

## Supported formats

| Category | Output formats                            |
| -------- | ----------------------------------------- |
| Images   | AVIF, BMP, GIF, ICO, JPG, PNG, TIFF, WEBP |
| Audio    | AAC, AIFF, FLAC, M4A, MP3, OGG, WAV, WMA  |
| Video    | AVI, FLV, MKV, MOV, MP4, WEBM, WMV        |
| GIF      | MP4, WEBM, GIF                            |

Input files are auto-detected from their extension, so you can drop a source file in any common media format (including `ts`, `m4v`, `3gp`, `opus`, `jpeg`, and more) and pick the target from the dropdown.

## Tech stack

React · TypeScript · Tailwind CSS · Rust · Tauri · FFmpeg

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [FFmpeg binaries](#ffmpeg-setup) placed in `src-tauri/bin/`

## FFmpeg setup

Format Hub relies on FFmpeg for all conversions. To keep the repository lightweight, the binaries are **not** committed — you must add them before running or building the app.

1. Download the essentials build for Windows:
   [ffmpeg-release-essentials.zip](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip)
2. Extract the archive and open its `bin` folder.
3. Copy `ffmpeg.exe`, `ffprobe.exe`, and `ffplay.exe` into this project's `src-tauri/bin/` folder.

The resulting layout should look like this:

```
format-hub/
└── src-tauri/
    └── bin/
        ├── ffmpeg.exe
        ├── ffprobe.exe
        └── ffplay.exe
```

> The `bin` folder is git-ignored. Do not commit the executables. The app resolves the FFmpeg path automatically in both development and production builds.

## Getting started

```bash
# install dependencies
pnpm install

# run the app in development
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

The installer and executables are written to `src-tauri/target/release/bundle/`.

## Scripts

| Command            | Description                                     |
| ------------------ | ----------------------------------------------- |
| `pnpm dev`         | Start the Vite dev server (frontend only)       |
| `pnpm tauri dev`   | Run the full desktop app in development         |
| `pnpm build`       | Type-check and build the frontend               |
| `pnpm tauri build` | Build the production desktop app and installers |
| `pnpm lint`        | Run oxlint                                      |
| `pnpm format`      | Format the codebase with Prettier               |

## Project structure

```
format-hub/
├── src/                      # React + TypeScript frontend
│   ├── components/           # Reusable UI components
│   ├── context/              # Selected-files state
│   ├── data/                 # Format definitions and shared types
│   ├── lib/                  # Frontend helpers
│   └── widgets/              # Screens (Home, Process)
└── src-tauri/                # Rust backend
    ├── bin/                  # FFmpeg / FFprobe binaries (git-ignored)
    ├── capabilities/         # Tauri permissions
    └── src/
        ├── commands/         # Tauri commands (convert, system)
        ├── ffmpeg/           # FFmpeg builder, probe, and progress
        ├── fs/               # Input/output validation
        ├── config.rs         # Window position persistence (INI)
        └── error.rs          # Application error types
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request, and follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

Released under the [MIT License](./LICENSE).

Copyright (c) 2026 Rafid Ahmed.
