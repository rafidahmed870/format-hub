import { useRef, useState } from "react";
import { ArrowRightLeft, Image as ImageIcon, UploadCloud, FileAudio, Video } from "lucide-react";
import { isTauriEnvironment, pickFilesFromDialog } from "@/lib/file-picker";

type AddFileProps = {
  onFiles?: (items: Array<string | File>) => void;
  accept?: string;
  multiple?: boolean;
};

export default function AddFile({
  onFiles,
  accept = "image/*,audio/*,video/*",
  multiple = true,
}: AddFileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    if (files.length > 0) {
      onFiles?.(files);
    }
  };

  const openPicker = async () => {
    if (isTauriEnvironment()) {
      const picked = await pickFilesFromDialog({ multiple, accept });

      if (picked.length > 0) {
        onFiles?.(picked);
      }

      return;
    }

    inputRef.current?.click();
  };

  return (
    <div className="bg-clay relative flex min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_oklch(0.32_0.024_305_/_0.12)_1px,_transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-8 lg:px-12">
        <div className="flex flex-col justify-center gap-8">
          <header className="space-y-2">
            <h1 className="font-heading text-ink text-4xl font-bold tracking-tight lg:text-5xl">
              Convert Any File
            </h1>
            <p className="text-muted-foreground max-w-md text-base">
              Drop a file and pick what to turn it into. FormatHub handles images, audio, and video
              instantly — straight from your desktop.
            </p>
          </header>

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

        <div className="relative hidden h-full min-h-[400px] w-full items-center justify-center lg:flex">
          <div className="bg-plum/5 absolute inset-0 m-auto size-[500px] rounded-full blur-[120px]" />

          <div className="relative flex w-full items-center justify-center gap-6 xl:gap-12">
            <div className="border-ink/10 bg-soft/80 relative flex w-32 flex-col items-center gap-3 rounded-2xl border p-6 shadow-lg backdrop-blur-sm transition-transform hover:-translate-y-2">
              <ImageIcon className="text-ink/70 size-12" strokeWidth={1.5} />
              <span className="font-heading text-ink/80 text-sm font-bold tracking-wider uppercase">
                WEBP
              </span>
            </div>

            <div className="relative flex size-20 items-center justify-center">
              <div className="bg-plum/20 absolute inset-0 animate-ping rounded-full" />
              <div className="border-plum/30 bg-cream text-plum shadow-plum relative flex size-20 items-center justify-center rounded-full border">
                <ArrowRightLeft className="size-7 animate-pulse" strokeWidth={2.5} />
              </div>
            </div>

            <div className="border-plum/30 bg-cream shadow-plum relative flex w-32 flex-col items-center gap-3 rounded-2xl border p-6 backdrop-blur-sm transition-transform hover:-translate-y-2">
              <ImageIcon className="text-plum size-12" strokeWidth={1.5} />
              <span className="font-heading text-plum text-sm font-bold tracking-wider uppercase">
                PNG
              </span>
            </div>
          </div>

          <div className="absolute top-[15%] left-[10%] animate-[bounce_5s_infinite] opacity-15">
            <FileAudio className="text-ink size-32" strokeWidth={1} />
          </div>
          <div className="absolute right-[10%] bottom-[15%] animate-[bounce_6s_infinite] opacity-15">
            <Video className="text-ink size-40" strokeWidth={1} />
          </div>
        </div>
      </div>
    </div>
  );
}
