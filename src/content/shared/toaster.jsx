import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";

const TOASTER_CONTAINER_ID = "crx-toaster";

const defaultToastOptions = {
  position: "bottom-right",
  toastOptions: {
    style: {
      border: "1px solid #68717a",
      color: "#000",
    },
  },
};

/**
 * Renders the shared Toaster once in document.body. Safe to call from multiple
 * content entry points (TemplateContent, New Incident, etc.); only the first call mounts.
 */
export function ensureToaster() {
  if (document.getElementById(TOASTER_CONTAINER_ID)) return;
  const root = document.createElement("div");
  root.id = TOASTER_CONTAINER_ID;
  document.body.appendChild(root);
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Toaster {...defaultToastOptions} />
    </React.StrictMode>,
  );
}
