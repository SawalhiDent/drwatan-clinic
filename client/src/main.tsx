import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress "unknown runtime error" from Vite's overlay.
// These are empty-message errors from cross-origin scripts or Replit tooling
// that have no useful information and disrupt the UI.
if (import.meta.env.DEV) {
  const _viteOnError = window.onerror;
  window.onerror = function (msg, src, line, col, err) {
    if (!msg || msg === "Script error." || String(msg).includes("unknown runtime error")) {
      return true; // suppress — tell browser it's handled
    }
    if (typeof _viteOnError === "function") {
      return _viteOnError.call(window, msg, src, line, col, err);
    }
    return false;
  };

  const _viteUnhandled = window.onunhandledrejection;
  window.onunhandledrejection = function (e) {
    if (!e?.reason?.message) {
      e?.preventDefault?.();
      return;
    }
    if (typeof _viteUnhandled === "function") {
      return _viteUnhandled.call(window, e);
    }
  };
}

createRoot(document.getElementById("root")!).render(<App />);
