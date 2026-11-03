import { Plus, RefreshCw, X } from "lucide-react";

type ProcessFooterProps = {
  fileCount?: number;
  onClearAll?: () => void;
  onAddMore?: () => void;
  onConvert?: () => void;
  isEmpty?: boolean;
};

export default function ProcessFooter({
  fileCount = 0,
  onClearAll,
  onAddMore,
  onConvert,
  isEmpty = false,
}: ProcessFooterProps) {
  return (
    <footer className="border-ink/10 bg-cream/80 sticky bottom-0 border-t px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <p className="text-muted-foreground hidden text-xs sm:block">
          {fileCount} file(s) selected
        </p>

        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          <button
            onClick={onClearAll}
            className="border-ink/15 bg-cream text-ink hover:bg-soft flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition"
          >
            <X className="size-4" />
            Clear all
          </button>
          <button
            onClick={onAddMore}
            className="border-ink/15 bg-cream text-ink hover:bg-soft flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition"
          >
            <Plus className="size-4" />
            Add more files
          </button>
          <button
            onClick={onConvert}
            disabled={isEmpty}
            className={[
              "shadow-chip flex items-center gap-2 rounded-md px-6 py-2 text-sm font-medium transition",
              isEmpty
                ? "bg-plum/60 text-cream cursor-not-allowed opacity-80"
                : "bg-plum text-cream hover:brightness-110 active:scale-[0.98]",
            ].join(" ")}
          >
            <RefreshCw className="size-4" />
            Convert
          </button>
        </div>
      </div>
    </footer>
  );
}
