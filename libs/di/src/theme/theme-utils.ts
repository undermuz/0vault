import type { ThemeMode } from "./types";

export const THEME_STORAGE_KEY = "theme_v1";
export const THEME_STORAGE_PREFIX = "0vault:";

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
	return value === "light" || value === "dark" || value === "system";
}

export function resolveDark(mode: ThemeMode): boolean {
	if (mode === "light") return false;
	if (mode === "dark") return true;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyThemeClass(dark: boolean): void {
	document.documentElement.classList.toggle("dark", dark);
}

/** Apply theme from localStorage before React boots (avoids flash). */
export function bootstrapThemeFromStorage(): void {
	try {
		const raw = localStorage.getItem(`${THEME_STORAGE_PREFIX}${THEME_STORAGE_KEY}`);
		const mode = isThemeMode(raw) ? raw : "system";
		applyThemeClass(resolveDark(mode));
	} catch {
		applyThemeClass(resolveDark("system"));
	}
}
