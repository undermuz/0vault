import "reflect-metadata";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { bootstrapThemeFromStorage } from "@libs/di/theme/theme-utils";
import "@libs/views/index.css";
import { App } from "@libs/views";
import { DiProvider } from "@libs/di/react/di.provider";
import { BrowserPlatformModule } from "./platform/platform.module";

bootstrapThemeFromStorage();

window.addEventListener("error", (e) => {
	console.error("[window.error]", e.error ?? e.message);
});
window.addEventListener("unhandledrejection", (e) => {
	console.error("[unhandledrejection]", e.reason);
});

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<DiProvider extraModules={[BrowserPlatformModule]}>
			<App />
		</DiProvider>
	</StrictMode>,
);
