# Format Hub

Convert images, audio, and video between formats — fast, offline, and private. Built with Tauri + Rust + React.

## Features
- Images: PNG, JPG, WEBP, GIF, BMP
- Audio: MP3, WAV, FLAC, AAC, OGG
- Video: MP4, MKV, MOV, WEBM, AVI
- Batch processing, custom quality/bitrate, 100% offline
- Windows currently, macOS/Linux latter.

## Tech Stack
React · TypeScript · Tailwind · Rust · Tauri · FFmpeg

## 🛠 Prerequisites & Setup (FFmpeg)

Format Hub uses FFmpeg to handle audio and video conversions. To keep the repository lightweight, the FFmpeg binaries (`.exe`) are **not included** in this repository. You need to download them manually before running or building the app.

### Step-by-Step Guide:

1. **Download FFmpeg:**
   Download the essentials build for Windows from the official Gyan.dev link:
   👉 [Download FFmpeg Release Essentials (.zip)](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip)

2. **Extract the Archive:**
   Extract the downloaded `.zip` file using WinRAR, 7-Zip, or Windows built-in extractor.

3. **Locate the Binaries:**
   Open the extracted folder and navigate to the `bin` directory. You will find three files:
   - `ffmpeg.exe`
   - `ffplay.exe`
   - `ffprobe.exe`

4. **Place them in the Project:**
   Copy these three `.exe` files and paste them into the `bin` folder located inside the `src-tauri` directory of this project.

   Your project structure should look like this:
   ```
   format-hub/
   └── src-tauri/
       └── bin/
           ├── ffmpeg.exe
           ├── ffplay.exe
           └── ffprobe.exe
   ```

5. **Run the App:**
   Once the files are in place, you can run the app normally:
   ```bash
   pnpm install
   pnpm tauri dev
   ```

> **Note for Developers:** The `bin` folder is added to `.gitignore`. Please do not commit the `.exe` files to the repository. The app dynamically resolves the FFmpeg path from this folder in both development and production environments.

## Run
```bash
pnpm install
pnpm tauri dev
```

## Build
```bash
pnpm tauri build
```

## License

[MIT License](./../../LICENSE)