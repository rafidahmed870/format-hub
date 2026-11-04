import {
  Trash2,
  File,
  Image as ImageIcon,
  Video,
  FileAudio,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import ProcessFooter from "@/components/ProcessFooter";
import ProcessHeader from "@/components/ProcessHeader";
import { getAvailableFormatsForFile } from "@/data/available-formats";
import type { SelectedFile } from "@/data/types";

type FileListProps = {
  files: SelectedFile[];
  convertedFolders?: Record<string, string>;
  /** Ids of the files converting right now (several can run in parallel). */
  convertingIds?: string[];
  conversionProgress?: Record<string, number>;
  sizeInfo?: Record<string, { before: number; after: number }>;
  /** Id → error message for files that failed to convert. */
  errors?: Record<string, string>;
  onRemove: (id: string) => void;
  onFormatChange: (id: string, format: string) => void;
  onAddMore: () => void;
  onClearAll: () => void;
  onConvert: () => void;
  onOpenFolder?: (folderPath: string) => void;
};

function getFileIcon(type: string) {
  if (type.includes("image")) return <ImageIcon className="text-ink/60 size-5" />;
  if (type.includes("video")) return <Video className="text-ink/60 size-5" />;
  if (type.includes("audio")) return <FileAudio className="text-ink/60 size-5" />;
  return <File className="text-ink/60 size-5" />;
}

const EMPTY_FOLDERS: Record<string, string> = {};
const EMPTY_PROGRESS: Record<string, number> = {};
const EMPTY_SIZE: Record<string, { before: number; after: number }> = {};
const EMPTY_IDS: string[] = [];
const EMPTY_ERRORS: Record<string, string> = {};

function formatSizeLabel(before: number, after: number): string {
  if (before === 0) return "";
  const diff = after - before;
  const pct = Math.abs(Math.round((diff / before) * 100));
  if (diff < 0) return `↓ ${pct}% smaller`;
  if (diff > 0) return `↑ ${pct}% larger`;
  return "Same size";
}

export default function FileList({
  files,
  convertedFolders = EMPTY_FOLDERS,
  convertingIds = EMPTY_IDS,
  conversionProgress = EMPTY_PROGRESS,
  sizeInfo = EMPTY_SIZE,
  errors = EMPTY_ERRORS,
  onRemove,
  onFormatChange,
  onAddMore,
  onClearAll,
  onConvert,
  onOpenFolder,
}: FileListProps) {
  const converting = new Set(convertingIds);

  return (
    <div className="bg-clay flex h-screen flex-col">
      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <ProcessHeader />

          <div className="border-ink/10 border-b" />

          {/* Files List */}
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="border-ink/10 bg-cream flex flex-col gap-4 rounded-xl border p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* File Info */}
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="bg-soft border-ink/5 flex size-10 shrink-0 items-center justify-center rounded-lg border">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="truncate">
                      <p className="text-ink truncate text-sm font-medium">{file.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {file.size} • {file.type.split("/")[1]?.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <RefreshCw className="size-3.5" />
                      Convert
                    </div>

                    {/* Source Format Badge */}
                    <span className="bg-soft text-ink rounded px-2 py-1 text-xs font-bold uppercase">
                      {file.name.split(".").pop()}
                    </span>

                    <ArrowRight className="text-muted-foreground/50 size-4" />

                    {/* Target Format Dropdown */}
                    <select
                      value={file.targetFormat}
                      onChange={(e) => onFormatChange(file.id, e.target.value)}
                      className="border-plum/30 bg-plum/5 text-plum focus:border-plum focus:ring-plum cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus:ring-1"
                    >
                      <option value="" disabled>
                        Select Format
                      </option>
                      {getAvailableFormatsForFile(file.type).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {/* Delete Button */}
                    <button
                      onClick={() => onRemove(file.id)}
                      className="text-muted-foreground hover:bg-soft hover:text-destructive cursor-pointer rounded p-1.5 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Shown while converting, once done, or when it failed */}
                {(converting.has(file.id) || convertedFolders[file.id] || errors[file.id]) && (
                  <div className="space-y-2">
                    <div className="text-plum/70 flex items-center justify-between text-[11px] font-medium tracking-[0.12em] uppercase">
                      <span>
                        {errors[file.id]
                          ? "Failed"
                          : convertedFolders[file.id]
                            ? "Completed"
                            : "Processing"}
                      </span>
                      {!errors[file.id] && (
                        <span>
                          {convertedFolders[file.id]
                            ? "100%"
                            : `${conversionProgress[file.id] ?? 0}%`}
                        </span>
                      )}
                    </div>

                    {errors[file.id] ? (
                      <p className="text-destructive text-[11px] font-medium">{errors[file.id]}</p>
                    ) : (
                      <>
                        {/* Track */}
                        <div className="bg-soft relative h-2 w-full overflow-hidden rounded-full">
                          {converting.has(file.id) && !convertedFolders[file.id] ? (
                            (conversionProgress[file.id] ?? 0) === 0 ? (
                              /* No percentage yet (e.g. still images) → shimmer */
                              <div className="bg-plum/30 absolute inset-0 rounded-full">
                                <div className="via-plum absolute inset-0 -translate-x-full animate-[shimmer_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent to-transparent" />
                              </div>
                            ) : (
                              /* Live percentage streamed from FFmpeg */
                              <div
                                className="bg-plum h-full rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${conversionProgress[file.id] ?? 0}%` }}
                              />
                            )
                          ) : (
                            /* Determinate fill — 0% → 100% */
                            <div
                              className="bg-plum h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: convertedFolders[file.id]
                                  ? "100%"
                                  : `${conversionProgress[file.id] ?? 0}%`,
                              }}
                            />
                          )}
                        </div>

                        {convertedFolders[file.id] && (
                          <div className="flex items-center justify-between">
                            {/* Size comparison label — left aligned */}
                            {sizeInfo[file.id] ? (
                              <span
                                className={`text-[11px] font-medium ${
                                  sizeInfo[file.id].after < sizeInfo[file.id].before
                                    ? "text-green-600"
                                    : sizeInfo[file.id].after > sizeInfo[file.id].before
                                      ? "text-amber-500"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {formatSizeLabel(sizeInfo[file.id].before, sizeInfo[file.id].after)}
                              </span>
                            ) : (
                              <span />
                            )}

                            {/* Open folder button — right side */}
                            {onOpenFolder && (
                              <button
                                type="button"
                                onClick={() => onOpenFolder(convertedFolders[file.id])}
                                className="border-ink/15 bg-cream text-ink hover:bg-soft cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition"
                              >
                                Open folder
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ProcessFooter
        fileCount={files.length}
        onClearAll={onClearAll}
        onAddMore={onAddMore}
        onConvert={onConvert}
      />
    </div>
  );
}
