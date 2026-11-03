export type FormatOption = {
  value: string;
  label: string;
};

export const availableFormats: Record<string, FormatOption[]> = {
  image: [
    { value: "avif", label: "AVIF" },
    { value: "bmp", label: "BMP" },
    { value: "eps", label: "EPS" },
    { value: "gif", label: "GIF" },
    { value: "icns", label: "ICNS" },
    { value: "ico", label: "ICO" },
    { value: "jpg", label: "JPG" },
    { value: "odd", label: "ODD" },
    { value: "png", label: "PNG" },
    { value: "ps", label: "PS" },
    { value: "psd", label: "PSD" },
    { value: "tiff", label: "TIFF" },
    { value: "webp", label: "WEBP" },
  ],
  audio: [
    { value: "aac", label: "AAC" },
    { value: "aiff", label: "AIFF" },
    { value: "flac", label: "FLAC" },
    { value: "m4a", label: "M4A" },
    { value: "mp3", label: "MP3" },
    { value: "ogg", label: "OGG" },
    { value: "wav", label: "WAV" },
    { value: "wma", label: "WMA" },
  ],
  video: [
    { value: "avi", label: "AVI" },
    { value: "flv", label: "FLV" },
    { value: "mkv", label: "MKV" },
    { value: "mov", label: "MOV" },
    { value: "mp4", label: "MP4" },
    { value: "webm", label: "WEBM" },
    { value: "wmv", label: "WMV" },
    { value: "gif", label: "GIF" },
  ],
  gif: [
    { value: "mp4", label: "MP4" },
    { value: "webm", label: "WEBM" },
    { value: "gif", label: "GIF" },
  ],
};

export function getAvailableFormatsForFile(fileType: string): FormatOption[] {
  if (fileType.includes("gif")) return availableFormats.gif;
  if (fileType.includes("image")) return availableFormats.image;
  if (fileType.includes("audio")) return availableFormats.audio;
  if (fileType.includes("video")) return availableFormats.video;

  return [];
}
