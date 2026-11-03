import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { stat } from "@tauri-apps/plugin-fs";
import type { SelectedFile } from "@/data/types";

type SelectedFilesContextValue = {
  files: SelectedFile[];
  setFiles: (files: SelectedFile[]) => void;
  addFiles: (incoming: Array<string | File>) => Promise<void>;
  removeFile: (id: string) => void;
  updateTargetFormat: (id: string, targetFormat: string) => void;
  clearFiles: () => void;
};

const SelectedFilesContext = createContext<SelectedFilesContextValue | undefined>(undefined);

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function SelectedFilesProvider({ children }: { children: ReactNode }) {
  // App restart এ সবসময় fresh — কোনো localStorage persist নেই
  const [files, setFiles] = useState<SelectedFile[]>([]);

  const addFiles = useCallback(async (incoming: Array<string | File>) => {
    const items = incoming.map((item) => {
      if (typeof item === "string") {
        return { rawPath: item, file: null };
      }

      const path = (item as File & { path?: string }).path ?? "";
      return { rawPath: path, file: item };
    });

    const nextFiles = await Promise.all(
      items.map(async ({ rawPath, file }) => {
        const path = rawPath || (file ? ((file as File & { path?: string }).path ?? "") : "");
        const name = file?.name ?? path.split(/[/\\]/).pop() ?? "selected-file";
        const fileType = name.toLowerCase();
        let type = "application/octet-stream";

        if (fileType.endsWith(".png")) type = "image/png";
        else if (fileType.endsWith(".jpg") || fileType.endsWith(".jpeg")) type = "image/jpeg";
        else if (fileType.endsWith(".webp")) type = "image/webp";
        else if (fileType.endsWith(".gif")) type = "image/gif";
        else if (fileType.endsWith(".mp3")) type = "audio/mpeg";
        else if (fileType.endsWith(".wav")) type = "audio/wav";
        else if (fileType.endsWith(".ogg")) type = "audio/ogg";
        else if (fileType.endsWith(".mp4")) type = "video/mp4";
        else if (fileType.endsWith(".webm")) type = "video/webm";
        else if (fileType.endsWith(".mov")) type = "video/quicktime";
        else if (fileType.endsWith(".avi")) type = "video/x-msvideo";
        else if (fileType.endsWith(".mkv")) type = "video/x-matroska";

        let size = "0 B";

        if (file && typeof file.size === "number" && file.size >= 0) {
          size = formatFileSize(file.size);
        } else if (path) {
          try {
            const info = await stat(path);
            size = formatFileSize(info.size);
          } catch {
            size = "0 B";
          }
        }

        return {
          id: makeId(),
          path,
          name,
          size,
          type,
          targetFormat: "",
        } satisfies SelectedFile;
      })
    );

    setFiles((prev) => [...prev, ...nextFiles.filter((item) => item.name)]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const updateTargetFormat = useCallback((id: string, targetFormat: string) => {
    setFiles((prev) => prev.map((file) => (file.id === id ? { ...file, targetFormat } : file)));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const value = useMemo<SelectedFilesContextValue>(
    () => ({
      files,
      setFiles,
      addFiles,
      removeFile,
      updateTargetFormat,
      clearFiles,
    }),
    [addFiles, clearFiles, files, removeFile, updateTargetFormat]
  );

  return <SelectedFilesContext.Provider value={value}>{children}</SelectedFilesContext.Provider>;
}

export function useSelectedFiles() {
  const context = useContext(SelectedFilesContext);

  if (!context) {
    throw new Error("useSelectedFiles must be used inside SelectedFilesProvider");
  }

  return context;
}
