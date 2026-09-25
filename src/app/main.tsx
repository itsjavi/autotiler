import { Toast } from "@base-ui/react/toast";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";
import { toastManager } from "./components/toasts.tsx";
import { initPlatform } from "./platform/index.ts";
import { hydrate } from "./state/store.ts";

import "./styles.css";

async function start() {
  await initPlatform();
  await hydrate();
  const root = document.getElementById("root");
  if (!root) throw new Error("#root missing");
  createRoot(root).render(
    <StrictMode>
      <Toast.Provider toastManager={toastManager}>
        <App />
      </Toast.Provider>
    </StrictMode>,
  );
}

void start();
