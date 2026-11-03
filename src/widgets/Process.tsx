import { useNavigate } from "react-router-dom";
import { useRef, type ChangeEvent } from "react";
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

  const handleConvert = () => {
    const hasEmpty = files.some((file) => !file.targetFormat);
    if (hasEmpty) {
      return alert("Please select format for all files.");
    }

    console.warn("Converting...", files);
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
        onRemove={handleRemove}
        onFormatChange={handleFormatChange}
        onAddMore={handleAddMore}
        onClearAll={handleClearAll}
        onConvert={handleConvert}
      />
    </>
  );
}
