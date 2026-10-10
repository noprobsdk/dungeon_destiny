// FR-00003, FR-00004: Content Studio's entry point in the browser.
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
