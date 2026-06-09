import type { Initializable } from "../types/initializable";
import type { Stateful } from "../types/stateful";

export const ThemeProvider = Symbol.for("ThemeProvider");

export type ThemeMode = "light" | "dark" | "system";

export type ThemeState = {
	mode: ThemeMode;
};

export type ThemeService = Initializable &
	Stateful<ThemeState> & {
		setMode(mode: ThemeMode): Promise<void>;
	};
