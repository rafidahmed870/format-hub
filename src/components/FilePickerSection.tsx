import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { isTauriEnvironment, pickFilesFromDialog } from "@/lib/file-picker";

type FilePickerSectionProps = {
  onFiles?: (items: Array<string | File>) => void;
  accept?: string;
  multiple?: boolean;
  autoOpen?: boolean;
};

export default function FilePickerSection({
  onFiles,
  accept = "image/*,audio/*,video/*",
  multiple = true,
  autoOpen = false,
}: FilePickerSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = useCallback(async () => {
    if (isTauriEnvironment()) {
      const picked = await pickFilesFromDialog({ multiple, accept });

      if (picked.length > 0) {
        onFiles?.(picked);
      }

      return;
    }

    inputRef.current?.click();
  }, [accept, multiple, onFiles]);

  useEffect(() => {
    if (!autoOpen) return;

    const timeoutId = window.setTimeout(() => {
      void openPicker();
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [autoOpen, openPicker]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    if (files.length > 0) {
      onFiles?.(files);
    }
  };

  return (
    <div className="bg-clay flex items-center justify-center px-6 py-12">
      <section className="border-ink/5 bg-cream shadow-window w-full max-w-lg overflow-hidden rounded-2xl border">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => {
            void openPicker();
          }}
          className={[
            "group flex cursor-pointer flex-col items-center justify-center gap-4",
            "m-3 rounded-xl border-2 border-dashed p-12 text-center transition-all",
            isDragging
              ? "border-plum bg-soft scale-[1.02]"
              : "border-ink/15 hover:border-plum/60 hover:bg-soft/60",
          ].join(" ")}
        >
          <div className="bg-plum text-cream shadow-plum flex size-16 items-center justify-center rounded-2xl transition-transform group-hover:-translate-y-1">
            <UploadCloud className="size-8" strokeWidth={2} />
          </div>

          <div className="space-y-1">
            <h2 className="font-heading text-ink text-xl font-semibold">
              Drop files here or click to browse
            </h2>
            <p className="text-muted-foreground text-sm">
              Images, audio, and video — we&apos;ll handle the rest.
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void openPicker();
            }}
            className="bg-plum text-cream shadow-chip mt-2 rounded-lg px-6 py-2.5 text-sm font-medium transition hover:brightness-110 active:scale-[0.98]"
          >
            Choose files
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      </section>
    </div>
  );
}
