import { inject, injectable } from "inversify";
import { proxy } from "valtio";
import {
	LocalStorageProvider,
	type ILocalStorage,
} from "../utils/local-storage/types";
import {
	THEME_STORAGE_KEY,
	applyThemeClass,
	isThemeMode,
	resolveDark,
} from "./theme-utils";
import type { ThemeMode, ThemeService, ThemeState } from "./types";

@injectable()
export class ThemeProviderImpl implements ThemeService {
	@inject(LocalStorageProvider)
	private readonly storage!: ILocalStorage;

	state = proxy<ThemeState>({ mode: "system" });

	private systemMq = window.matchMedia("(prefers-color-scheme: dark)");
	private onSystemChange = (): void => {
		if (this.state.mode === "system") {
			applyThemeClass(resolveDark("system"));
		}
	};

	async initialize(): Promise<void> {
		const saved = await this.storage.getItem(THEME_STORAGE_KEY);
		this.state.mode = isThemeMode(saved) ? saved : "system";
		this.apply();
		this.systemMq.addEventListener("change", this.onSystemChange);
	}

	async setMode(mode: ThemeMode): Promise<void> {
		this.state.mode = mode;
		await this.storage.setItem(THEME_STORAGE_KEY, mode);
		this.apply();
	}

	private apply(): void {
		applyThemeClass(resolveDark(this.state.mode));
	}
}
