import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { DevToolsGuard } from "@/context/DevToolsGuard";
import { SelectedFilesProvider } from "@/context/SelectedFilesContext";
import Home from "@/widgets/Home";
import Process from "@/widgets/Process";

function App() {
  return (
    <DevToolsGuard>
      <SelectedFilesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/process" element={<Process />} />
          </Routes>
        </BrowserRouter>
      </SelectedFilesProvider>
    </DevToolsGuard>
  );
}

export default App;
