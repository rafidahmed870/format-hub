import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "@/widgets/Home";
import { DevToolsGuard } from "./context/DevToolsGuard";

function App() {
  // const [greetMsg, setGreetMsg] = useState("");
  // const [name, setName] = useState("");

  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  return (
    <DevToolsGuard>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </DevToolsGuard>
  );
}

export default App;
