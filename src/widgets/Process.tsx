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

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setConvertingFileId(file.id);
        // Reset this file's progress to 0 before starting
        setConversionProgress((prev) => ({ ...prev, [file.id]: 0 }));

        // Sequential processing is intentional — each file's progress is shown individually.
        // eslint-disable-next-line no-await-in-loop
        const result = await invoke<{ output_file: string; output_folder: string }>(
          "convert_media",
          {
            inputPath: file.path,
            targetFormat: file.targetFormat,
          }
        );

        setConvertedFolders((prev) => ({
          ...prev,
          [file.id]: result.output_folder,
        }));
        setConversionProgress((prev) => ({ ...prev, [file.id]: 100 }));
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
