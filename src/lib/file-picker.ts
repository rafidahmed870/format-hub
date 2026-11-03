import { open } from "@tauri-apps/plugin-dialog";

export function isTauriEnvironment() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function pickFilesFromDialog(options: { multiple?: boolean; accept?: string } = {}) {
  const { multiple = true, accept = "image/*,audio/*,video/*" } = options;

  if (!isTauriEnvironment()) {
    return [] as string[];
  }

  const selection = await open({
    multiple,
    directory: false,
    filters: [
      {
        name: "Supported Files",
        extensions: getExtensionsFromAccept(accept),
      },
    ],
  });

  if (!selection || (Array.isArray(selection) && selection.length === 0)) {
    return [] as string[];
  }

  return Array.isArray(selection) ? selection : [selection];
}

const extensionMap: Record<string, string[]> = {
  "image/*": ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tif", "tiff"],
  "audio/*": ["mp3", "wav", "aac", "flac", "ogg", "m4a", "webm"],
  "video/*": ["mp4", "webm", "mov", "avi", "mkv", "m4v", "wmv"],
};

function getExtensionsFromAccept(accept: string) {
  const values = accept
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const collected = values.flatMap((value) => {
    if (value in extensionMap) {
      return extensionMap[value];
    }

    if (value.startsWith(".")) {
      return [value.slice(1)];
    }

    if (value.includes("/*")) {
      return extensionMap[value] ?? [];
    }

    return [value];
  });

  return [...new Set(collected)];
}

function getMimeType(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".avi")) return "video/x-msvideo";
  if (lower.endsWith(".mkv")) return "video/x-matroska";

  return "application/octet-stream";
}

export function getFileMetadataFromPath(path: string) {
  const name = path.split(/[\\/]/).pop() ?? "selected-file";

  return {
    path,
    name,
    size: "0 B",
    type: getMimeType(name),
  };
}
