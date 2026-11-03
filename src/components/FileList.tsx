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
  onRemove: (id: string) => void;
  onFormatChange: (id: string, format: string) => void;
  onAddMore: () => void;
  onClearAll: () => void;
  onConvert: () => void;
};

function getFileIcon(type: string) {
  if (type.includes("image")) return <ImageIcon className="text-ink/60 size-5" />;
  if (type.includes("video")) return <Video className="text-ink/60 size-5" />;
  if (type.includes("audio")) return <FileAudio className="text-ink/60 size-5" />;
  return <File className="text-ink/60 size-5" />;
}

export default function FileList({
  files,
  onRemove,
  onFormatChange,
  onAddMore,
  onClearAll,
  onConvert,
}: FileListProps) {
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
                className="border-ink/10 bg-cream flex flex-col gap-4 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
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
                    className="border-plum/30 bg-plum/5 text-plum focus:border-plum focus:ring-plum rounded-md border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus:ring-1"
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
                    className="text-muted-foreground hover:bg-soft hover:text-destructive rounded p-1.5 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
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
