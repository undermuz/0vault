import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./electro";
import "./index.css";
import App from "./App";

import { DiProvider } from "../di/react/di.provider";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <DiProvider>
            <App />
        </DiProvider>
    </StrictMode>,
);
