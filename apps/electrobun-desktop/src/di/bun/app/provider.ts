import { inject, injectable } from "inversify";
import { BrowserWindow, Updater } from "electrobun/bun";
import en from "../../../../../../libs/di/src/i18n/en.json";
import { installCloseGuard } from "../close-guard";
import {
	MainWindowServiceToken,
	type IMainWindowService,
} from "../main-window/types";
import { VaultRpcServiceToken, type IVaultRpcService } from "../vault-rpc/types";
import type { IElectrobunApp } from "./types";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_SERVER_PORT}`;

@injectable()
export class ElectrobunApp implements IElectrobunApp {
	constructor(
		@inject(VaultRpcServiceToken)
		private readonly vaultRpc: IVaultRpcService,
		@inject(MainWindowServiceToken)
		private readonly mainWindow: IMainWindowService,
	) {}

	async start(): Promise<void> {
		installCloseGuard({
			getMainWindowId: () => this.mainWindow.getWindowId(),
			hasUnsaved: () => this.mainWindow.hasUnsaved(),
			strings: {
				quitTitle: en.dialogs.unsaved.quitTitle,
				quitMessage: en.dialogs.unsaved.quitMessage,
				quit: en.dialogs.unsaved.quit,
				cancel: en.common.cancel,
			},
		});

		const url = await this.getMainViewUrl();
		const rpc = this.vaultRpc.buildRpc();
		const mainWindow = new BrowserWindow({
			title: "0vault",
			url,
			rpc,
			frame: {
				width: 1100,
				height: 720,
				x: 120,
				y: 80,
			},
		});

		this.mainWindow.setWindow(mainWindow);

		const channel = await Updater.localInfo.channel();
		if (channel === "dev") {
			this.mainWindow.openDevTools();
		}

		console.log("0vault (Electrobun) started");
	}

	private async getMainViewUrl(): Promise<string> {
		const channel = await Updater.localInfo.channel();
		if (channel === "dev") {
			for (let attempt = 0; attempt < 30; attempt++) {
				try {
					const response = await fetch(DEV_SERVER_URL);
					if (response.ok) {
						console.log(`HMR: ${DEV_SERVER_URL}`);
						return DEV_SERVER_URL;
					}
				} catch {
					// Vite may still be starting in dev:hmr
				}
				await new Promise((resolve) => setTimeout(resolve, 200));
			}
			console.log("Vite not running; use views:// (or bun run dev:hmr)");
		}
		return "views://mainview/index.html";
	}
}
