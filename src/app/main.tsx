import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

function App() {
  return <main className="grid min-h-dvh place-items-center bg-[#333b4f] text-[#ccced3]">Autotiler v2</main>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
