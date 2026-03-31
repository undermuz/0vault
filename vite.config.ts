import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	plugins: [react()],
	root: "src/mainview",
	resolve: {
		alias: {
			"@vault": path.resolve(rootDir, "src/vault"),
			"@rpc": path.resolve(rootDir, "src/rpc"),
		},
	},
	build: {
		outDir: "../../dist",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		strictPort: true,
	},
});
