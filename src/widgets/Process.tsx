import { useNavigate } from "react-router-dom";
import { useRef, useState, type ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";

import FileList from "@/components/FileList";
import FilePickerSection from "@/components/FilePickerSection";
import ProcessFooter from "@/components/ProcessFooter";
import ProcessHeader from "@/components/ProcessHeader";
import { useSelectedFiles } from "@/context/SelectedFilesContext";
import { pickFilesFromDialog } from "@/lib/file-picker";

export default function Process() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { files, addFiles, removeFile, updateTargetFormat, clearFiles } = useSelectedFiles();
  const [convertingFileId, setConvertingFileId] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState<Record<string, number>>({});
  const [convertedFolders, setConvertedFolders] = useState<Record<string, string>>({});
  const [sizeInfo, setSizeInfo] = useState<Record<string, { before: number; after: number }>>({});

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

    const BATCH_SIZE = 5;

    try {
      // সব files কে progress 0 এ set করি
      const initialProgress: Record<string, number> = {};
      files.forEach((f) => {
        initialProgress[f.id] = 0;
      });
      setConversionProgress(initialProgress);

      // 5টা করে chunk ভাগ করি
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const chunk = files.slice(i, i + BATCH_SIZE);

        // Chunk-এর প্রথম file কে "currently converting" হিসেবে দেখাই
        setConvertingFileId(chunk[0].id);

        // eslint-disable-next-line no-await-in-loop
        const results = await invoke<
          {
            input_path: string;
            output_file: string | null;
            output_folder: string | null;
            error: string | null;
            size_before: number | null;
            size_after: number | null;
          }[]
        >("convert_media_batch", {
          items: chunk.map((f) => ({
            input_path: f.path,
            target_format: f.targetFormat,
          })),
        });

        // প্রতিটি result process করি — path দিয়ে file id খুঁজি
        for (const result of results) {
          const matched = files.find((f) => f.path === result.input_path);
          if (!matched) continue;

          if (result.error) {
            alert(`Failed: ${matched.name}\n${result.error}`);
          } else if (result.output_folder) {
            setConvertedFolders((prev) => ({
              ...prev,
              [matched.id]: result.output_folder!,
            }));
            setConversionProgress((prev) => ({ ...prev, [matched.id]: 100 }));
            if (result.size_before != null && result.size_after != null) {
              setSizeInfo((prev) => ({
                ...prev,
                [matched.id]: { before: result.size_before!, after: result.size_after! },
              }));
            }
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Conversion failed.";
      alert(message);
    } finally {
      setConvertingFileId(null);
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
        convertingFileId={convertingFileId}
        conversionProgress={conversionProgress}
        sizeInfo={sizeInfo}
        onRemove={handleRemove}
        onFormatChange={handleFormatChange}
        onAddMore={handleAddMore}
        onClearAll={handleClearAll}
        onConvert={handleConvert}
        onOpenFolder={async (folderPath) => {
          try {
            // রাস্টের open_folder কমান্ড কল করা
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
