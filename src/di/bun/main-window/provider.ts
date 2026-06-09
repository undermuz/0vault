import { injectable } from "inversify";
import type { BrowserWindow } from "electrobun/bun";
import type { IMainWindowService } from "./types";

@injectable()
export class MainWindowService implements IMainWindowService {
	private window: BrowserWindow | null = null;
	private hasUnsavedChanges = false;

	setWindow(win: BrowserWindow): void {
		this.window = win;
	}

	getWindowId(): number | undefined {
		return this.window?.id;
	}

	setTitle(title: string): void {
		this.window?.setTitle(title);
	}

	setHasUnsaved(hasUnsaved: boolean): void {
		this.hasUnsavedChanges = hasUnsaved;
	}

	hasUnsaved(): boolean {
		return this.hasUnsavedChanges;
	}

	openDevTools(): void {
		this.window?.webview.openDevTools();
	}
}
