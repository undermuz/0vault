import "reflect-metadata";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./electro";
import "./index.css";
import App from "./App";

import { DiProvider } from "../di/react/di.provider";

window.addEventListener("error", (e) => {
	console.error("[window.error]", e.error ?? e.message);
});
window.addEventListener("unhandledrejection", (e) => {
	console.error("[unhandledrejection]", e.reason);
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <DiProvider>
            <App />
        </DiProvider>
    </StrictMode>,
);
