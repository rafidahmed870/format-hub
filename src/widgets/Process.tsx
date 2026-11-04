import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

import FileList from "@/components/FileList";
import FilePickerSection from "@/components/FilePickerSection";
import ProcessFooter from "@/components/ProcessFooter";
import ProcessHeader from "@/components/ProcessHeader";
import { useSelectedFiles } from "@/context/SelectedFilesContext";
import { pickFilesFromDialog } from "@/lib/file-picker";

/** Payload of the backend's `conversion-progress` event. */
type ProgressPayload = {
  inputPath: string;
  percent: number;
  currentTime: string;
  totalSecs: number;
};

/** One row of the `convert_media_batch` response. */
type BatchResult = {
  inputPath: string;
  outputFile: string | null;
  outputFolder: string | null;
  error: string | null;
  sizeBefore: number | null;
  sizeAfter: number | null;
};

/** How many files are sent to the backend per batch call. */
const BATCH_SIZE = 5;

/** Reports a finished batch through an OS notification. */
async function notifyBatchFinished(succeeded: number, failed: number) {
  let granted = await isPermissionGranted();

  if (!granted) {
    granted = (await requestPermission()) === "granted";
  }

  if (!granted) return;

  sendNotification({
    title: "Convert Complete",
    body:
      failed === 0
        ? `${succeeded} files converted successfully.`
        : `${succeeded} files converted, ${failed} failed.`,
    sound: "Default",
  });
}

export default function Process() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { files, addFiles, removeFile, updateTargetFormat, clearFiles } = useSelectedFiles();
  const [convertingIds, setConvertingIds] = useState<string[]>([]);
  const [conversionProgress, setConversionProgress] = useState<Record<string, number>>({});
  const [convertedFolders, setConvertedFolders] = useState<Record<string, string>>({});
  const [sizeInfo, setSizeInfo] = useState<Record<string, { before: number; after: number }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // The progress listener is registered once, so it reads the current file
  // list through a ref instead of re-subscribing on every change.
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Live per-file progress: every conversion emits `conversion-progress`
  // events carrying its own input path, which we map back to the file row.
  useEffect(() => {
    const unlisten = listen<ProgressPayload>("conversion-progress", ({ payload }) => {
      const file = filesRef.current.find((item) => item.path === payload.inputPath);
      if (!file) return;

      setConversionProgress((prev) => ({ ...prev, [file.id]: Math.round(payload.percent) }));
    });

    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);

  if (files.length === 0) {
    return (
      <div className="bg-clay flex h-screen flex-col">
        <div className="px-6 py-8">
          <div className="mx-auto max-w-4xl">
            <ProcessHeader />
          </div>
        </div>

        <div className="border-ink/10 border-b" />

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-4xl">
            <FilePickerSection
              onFiles={(incoming) => {
                void addFiles(incoming);
                navigate("/process");
              }}
            />
          </div>
        </div>

        <ProcessFooter
          fileCount={0}
          onClearAll={clearFiles}
          onAddMore={async () => {
            const picked = await pickFilesFromDialog({
              multiple: true,
              accept: "image/*,audio/*,video/*",
            });

            if (picked.length > 0) {
              await addFiles(picked);
            }
          }}
          isEmpty
        />
      </div>
    );
  }

  const handleRemove = (id: string) => {
    removeFile(id);
  };

  const handleFormatChange = (id: string, format: string) => {
    updateTargetFormat(id, format);
  };

  const handleAddMore = async () => {
    const picked = await pickFilesFromDialog({ multiple: true, accept: "image/*,audio/*,video/*" });

    if (picked.length > 0) {
      await addFiles(picked);
    }
  };

  const handleClearAll = () => {
    clearFiles();
  };

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (!selected || selected.length === 0) return;

    addFiles(Array.from(selected));
    event.target.value = "";
  };

  const handleConvert = async () => {
    const hasEmpty = files.some((file) => !file.targetFormat);
    if (hasEmpty) {
      return alert("Please select format for all files.");
    }

    // new conversion — all file progress 0
    const initialProgress: Record<string, number> = {};
    files.forEach((file) => {
      initialProgress[file.id] = 0;
    });

    setConversionProgress(initialProgress);
    setConvertedFolders({});
    setSizeInfo({});
    setErrors({});

    let succeeded = 0;
    let failed = 0;

    try {
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const chunk = files.slice(i, i + BATCH_SIZE);

        // each chunk convert media batch
        setConvertingIds(chunk.map((file) => file.id));

        // eslint-disable-next-line no-await-in-loop
        const results = await invoke<BatchResult[]>("convert_media_batch", {
          items: chunk.map((file) => ({
            inputPath: file.path,
            targetFormat: file.targetFormat,
          })),
        });

        // each result process — path to file id
        for (const result of results) {
          const matched = files.find((file) => file.path === result.inputPath);
          if (!matched) continue;

          if (result.error) {
            failed += 1;
            setErrors((prev) => ({ ...prev, [matched.id]: result.error as string }));
            continue;
          }

          succeeded += 1;
          setConvertedFolders((prev) => ({ ...prev, [matched.id]: result.outputFolder ?? "" }));
          setConversionProgress((prev) => ({ ...prev, [matched.id]: 100 }));

          if (result.sizeBefore != null && result.sizeAfter != null) {
            setSizeInfo((prev) => ({
              ...prev,
              [matched.id]: { before: result.sizeBefore as number, after: result.sizeAfter as number },
            }));
          }
        }
      }

      // if multiple files, send OS notification
      if (files.length > 1) {
        await notifyBatchFinished(succeeded, failed);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Conversion failed.";
      alert(message);
    } finally {
      setConvertingIds([]);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*,video/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <FileList
        files={files}
        convertedFolders={convertedFolders}
        convertingIds={convertingIds}
        conversionProgress={conversionProgress}
        sizeInfo={sizeInfo}
        errors={errors}
        onRemove={handleRemove}
        onFormatChange={handleFormatChange}
        onAddMore={handleAddMore}
        onClearAll={handleClearAll}
        onConvert={handleConvert}
        onOpenFolder={async (folderPath) => {
          try {
            // rust function to open folder in os
            await invoke("open_folder", { folderPath });
          } catch (error) {
            console.error("Failed to open folder:", error);
            alert("Could not open the output folder.");
          }
        }}
      />
    </>
  );
}
