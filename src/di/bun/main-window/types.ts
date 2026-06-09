import type { BrowserWindow } from "electrobun/bun";

export const MainWindowServiceToken = Symbol.for("MainWindowService");

export interface IMainWindowService {
	setWindow(win: BrowserWindow): void;
	getWindowId(): number | undefined;
	setTitle(title: string): void;
	setHasUnsaved(hasUnsaved: boolean): void;
	hasUnsaved(): boolean;
	openDevTools(): void;
}
