import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "@/components/SplashScreen";
import AddFile from "@/components/AddFile";
import { useSelectedFiles } from "@/context/SelectedFilesContext";

function Home() {
  const navigate = useNavigate();
  const { addFiles } = useSelectedFiles();
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return <SplashScreen onComplete={() => setIsLoading(false)} />;
  }

  return (
    <AddFile
      onFiles={(paths) => {
        void addFiles(paths);
        navigate("/process");
      }}
    />
  );
}

export default Home;
