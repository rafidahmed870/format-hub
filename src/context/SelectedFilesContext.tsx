import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SelectedFile } from "@/data/types";

type PersistedFile = Omit<SelectedFile, "file"> & {
  file?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
};

type SelectedFilesContextValue = {
  files: SelectedFile[];
  setFiles: (files: SelectedFile[]) => void;
  addFiles: (incoming: File[]) => void;
  removeFile: (id: string) => void;
  updateTargetFormat: (id: string, targetFormat: string) => void;
  clearFiles: () => void;
};

const STORAGE_KEY = "format-hub-selected-files";
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

function parseStoredFiles(): SelectedFile[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as PersistedFile[];

    return parsed.map((item) => {
      const file = item.file
        ? new File([], item.name, {
            type: item.type,
            lastModified: item.file.lastModified ?? Date.now(),
          })
        : new File([], item.name, { type: item.type });

      return {
        ...item,
        file,
        size: item.size || formatFileSize(file.size),
      };
    });
  } catch {
    return [];
  }
}

export function SelectedFilesProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<SelectedFile[]>(() => parseStoredFiles());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const payload = files.map(({ id, name, size, type, targetFormat }) => ({
      id,
      name,
      size,
      type,
      targetFormat,
    }));

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [files]);

  const addFiles = useCallback((incoming: File[]) => {
    const nextFiles = incoming.map((file) => ({
      id: makeId(),
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || "application/octet-stream",
      targetFormat: "",
    }));

    setFiles((prev) => [...prev, ...nextFiles]);
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
    [addFiles, clearFiles, files, removeFile, setFiles, updateTargetFormat]
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
