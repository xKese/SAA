import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Disable Eruda devtools if present to prevent console noise from cancelled queries
if (typeof window !== 'undefined' && (window as any).eruda) {
  try {
    (window as any).eruda.destroy();
  } catch (e) {
    // Silently ignore if eruda.destroy fails
  }
}

// Additional check to prevent Eruda from being loaded later
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'eruda', {
    set: function() {
      // Prevent Eruda from being set
    },
    get: function() {
      return undefined;
    },
    configurable: false
  });
}

createRoot(document.getElementById("root")!).render(<App />);
