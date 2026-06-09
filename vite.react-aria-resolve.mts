import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const reactAriaRoot = path.join(repoRoot, "node_modules/react-aria");
const useSyncExternalStoreShim = path.join(
	repoRoot,
	"vite.use-sync-external-store-shim.mjs",
);

const USE_SYNC_EXTERNAL_STORE_SHIM_IDS = new Set([
	"use-sync-external-store/shim",
	"use-sync-external-store/shim/index.js",
]);

function resolveReactAriaSubpath(subpath: string): string | null {
	const distFile = path.join(reactAriaRoot, "dist/exports", `${subpath}.js`);
	if (fs.existsSync(distFile)) return distFile;

	const folderPkg = path.join(reactAriaRoot, subpath, "package.json");
	if (fs.existsSync(folderPkg)) {
		const pkg = JSON.parse(fs.readFileSync(folderPkg, "utf8")) as {
			module?: string;
			main?: string;
		};
		const rel = pkg.module ?? pkg.main;
		if (rel) {
			const resolved = path.resolve(path.dirname(folderPkg), rel);
			if (fs.existsSync(resolved)) return resolved;
		}
	}

	return null;
}

function isReactAriaDistFile(id: string): boolean {
	const norm = id.replace(/\\/g, "/");
	return (
		norm.includes("/node_modules/react-aria/dist/") ||
		norm.includes("/node_modules/react-aria-components/dist/")
	);
}

/** Rolldown/Vite 8 does not resolve react-aria subpath exports used by HeroUI. */
export function reactAriaResolvePlugin(): Plugin {
	return {
		name: "react-aria-resolve",
		enforce: "pre",
		load(id) {
			const filePath = id.split("?")[0];
			if (!isReactAriaDistFile(filePath)) return null;
			const code = fs.readFileSync(filePath, "utf8");
			if (!code.includes("sourceMappingURL=")) return null;
			return {
				code: code.replace(/\/\/# sourceMappingURL=.*$/gm, ""),
				map: null,
			};
		},
		resolveId(id) {
			if (USE_SYNC_EXTERNAL_STORE_SHIM_IDS.has(id)) {
				return useSyncExternalStoreShim;
			}
			if (id === "react-aria") {
				return path.join(reactAriaRoot, "dist/exports/index.mjs");
			}
			if (!id.startsWith("react-aria/")) return null;
			return resolveReactAriaSubpath(id.slice("react-aria/".length));
		},
	};
}
