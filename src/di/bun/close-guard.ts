import Electrobun, { BuildConfig, type ElectrobunEvent } from "electrobun/bun";
import { quit } from "../../../node_modules/electrobun/dist/api/bun/core/Utils.ts";
import { BrowserView } from "../../../node_modules/electrobun/dist/api/bun/core/BrowserView.ts";
import { BrowserWindowMap } from "../../../node_modules/electrobun/dist/api/bun/core/BrowserWindow.ts";
import { GpuWindowMap } from "../../../node_modules/electrobun/dist/api/bun/core/GpuWindow.ts";
import { WGPUView } from "../../../node_modules/electrobun/dist/api/bun/core/WGPUView.ts";
import electrobunEventEmitter from "../../../node_modules/electrobun/dist/api/bun/events/eventEmitter.ts";
import { showMessageBoxSync } from "./sync-message-box";

type CloseEvent = ElectrobunEvent<{ id: number }, { allow?: boolean }>;

export type CloseGuardStrings = {
	quitTitle: string;
	quitMessage: string;
	quit: string;
	cancel: string;
};

export type CloseGuardDeps = {
	getMainWindowId: () => number | undefined;
	hasUnsaved: () => boolean;
	strings: CloseGuardStrings;
};

let installed = false;
/** User confirmed discard on the window-close path; skip before-quit prompt. */
let discardConfirmedOnClose = false;

function cleanupClosedWindow(windowId: number): void {
	delete BrowserWindowMap[windowId];

	for (const view of BrowserView.getAll()) {
		if (view.windowId === windowId) {
			view.remove();
		}
	}

	const wgpuViews = WGPUView.getAll().filter((v) => v.windowId === windowId);
	for (const view of wgpuViews) {
		try {
			if (view.ptr === null) continue;
			view.remove();
		} catch (e) {
			console.error(`Error cleaning up WGPU view ${view.id}:`, e);
			view.ptr = null as never;
		}
	}
}

function maybeQuitAfterLastWindowClosed(): void {
	const buildConfig = BuildConfig.getCached();
	const exitOnLastWindowClosed =
		buildConfig?.runtime?.exitOnLastWindowClosed ?? true;

	if (
		exitOnLastWindowClosed &&
		Object.keys(BrowserWindowMap).length === 0 &&
		Object.keys(GpuWindowMap).length === 0
	) {
		quit();
	}
}

function handleWindowClose(event: CloseEvent, deps: CloseGuardDeps): void {
	const windowId = event.data.id;
	const mainId = deps.getMainWindowId();

	if (mainId === windowId && deps.hasUnsaved()) {
		const response = showMessageBoxSync({
			type: "question",
			title: deps.strings.quitTitle,
			message: deps.strings.quitMessage,
			buttons: [deps.strings.quit, deps.strings.cancel],
			defaultId: 1,
			cancelId: 1,
		});
		if (response !== 0) {
			event.response = { allow: false };
			try {
				BrowserWindowMap[windowId]?.focus();
			} catch (e) {
				console.error("Failed to restore window after close cancel:", e);
			}
			return;
		}
		discardConfirmedOnClose = true;
	}

	cleanupClosedWindow(windowId);
	maybeQuitAfterLastWindowClosed();
}

/** Replaces Electrobun's global close handler so we can cancel cleanup while the webview is alive. */
export function installCloseGuard(deps: CloseGuardDeps): void {
	if (installed) return;
	installed = true;

	electrobunEventEmitter.removeAllListeners("close");
	electrobunEventEmitter.on("close", (event: CloseEvent) => {
		handleWindowClose(event, deps);
	});

	Electrobun.events.on(
		"before-quit",
		(event: ElectrobunEvent<Record<string, never>, { allow: boolean }>) => {
			if (discardConfirmedOnClose) {
				discardConfirmedOnClose = false;
				return;
			}
			if (!deps.hasUnsaved()) return;
			const response = showMessageBoxSync({
				type: "question",
				title: deps.strings.quitTitle,
				message: deps.strings.quitMessage,
				buttons: [deps.strings.quit, deps.strings.cancel],
				defaultId: 1,
				cancelId: 1,
			});
			if (response !== 0) {
				event.response = { allow: false };
			}
		},
	);
}
