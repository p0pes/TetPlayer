import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import "./index.css";

// Captura global de erros para evitar tela preta silenciosa
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("[TetPlayer Global Error]", event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[TetPlayer Unhandled Rejection]", event.reason);
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
