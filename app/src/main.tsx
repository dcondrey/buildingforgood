import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./print.css";
import App from "./App.tsx";

function registerRuntimeCache() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // The app remains fully functional when service workers are blocked.
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerRuntimeCache();
