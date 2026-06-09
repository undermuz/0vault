import { inject, injectable } from "inversify";
import { BrowserView, Utils } from "electrobun/bun";
import { resolve } from "node:path";
import { stat } from "node:fs/promises";
import type { MessageBoxReq } from "../../../../../../libs/utils/src/rpc/message-box";
import type { VaultAppRPC } from "../../../rpc/vault-schema";
import {
	FileReplaceServiceToken,
	type IFileReplaceService,
} from "../file-replace/types";
import {
	MainWindowServiceToken,
	type IMainWindowService,
} from "../main-window/types";
import { VaultAgeServiceToken, type IVaultAgeService } from "../vault-age/types";
import type { IVaultRpcService, VaultRpc } from "./types";

type RpcRequests = VaultAppRPC["bun"]["requests"];

@injectable()
export class VaultRpcService implements IVaultRpcService {
	constructor(
		@inject(VaultAgeServiceToken)
		private readonly vaultAge: IVaultAgeService,
		@inject(FileReplaceServiceToken)
		private readonly fileReplace: IFileReplaceService,
		@inject(MainWindowServiceToken)
		private readonly mainWindow: IMainWindowService,
	) {}

	buildRpc(): VaultRpc {
		return BrowserView.defineRPC<VaultAppRPC>({
			maxRequestTime: 600_000,
			handlers: {
				requests: {
					pickOpenFile: this.pickOpenFile.bind(this),
					pickOpenMultiple: this.pickOpenMultiple.bind(this),
					pickFolder: this.pickFolder.bind(this),
					readFileBase64: this.readFileBase64.bind(this),
					fileStat: this.fileStat.bind(this),
					decryptAgeFile: this.decryptAgeFile.bind(this),
					encryptAgeFile: this.encryptAgeFile.bind(this),
					setWindowTitle: this.setWindowTitle.bind(this),
					setUnsavedFlag: this.setUnsavedFlag.bind(this),
					showMessageBoxReq: this.showMessageBoxReq.bind(this),
					startupArgPath: this.startupArgPath.bind(this),
				},
				messages: {},
			},
		});
	}

	private getStartupFilePath(): string | null {
		for (const a of process.argv.slice(2)) {
			if (a.startsWith("-")) continue;
			return a;
		}
		return null;
	}

	async pickOpenFile(): Promise<RpcRequests["pickOpenFile"]["response"]> {
		const paths = await Utils.openFileDialog({
			startingFolder: "~/",
			allowedFileTypes: "*",
			canChooseFiles: true,
			canChooseDirectory: false,
			allowsMultipleSelection: false,
		});
		return { paths: paths.map((p) => p.trim()).filter(Boolean) };
	}

	async pickOpenMultiple(): Promise<RpcRequests["pickOpenMultiple"]["response"]> {
		const paths = await Utils.openFileDialog({
			startingFolder: "~/",
			allowedFileTypes: "*",
			canChooseFiles: true,
			canChooseDirectory: false,
			allowsMultipleSelection: true,
		});
		return { paths: paths.map((p) => p.trim()).filter(Boolean) };
	}

	async pickFolder(): Promise<RpcRequests["pickFolder"]["response"]> {
		const paths = await Utils.openFileDialog({
			startingFolder: "~/",
			allowedFileTypes: "*",
			canChooseFiles: false,
			canChooseDirectory: true,
			allowsMultipleSelection: false,
		});
		return { paths: paths.map((p) => p.trim()).filter(Boolean) };
	}

	async readFileBase64(
		params?: unknown,
	): Promise<RpcRequests["readFileBase64"]["response"]> {
		const { path } = params as RpcRequests["readFileBase64"]["params"];
		try {
			const f = Bun.file(path);
			if (!(await f.exists())) {
				return { ok: false, error: "File not found" };
			}
			const ab = await f.arrayBuffer();
			return {
				ok: true,
				base64: Buffer.from(ab).toString("base64"),
			};
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : String(e),
			};
		}
	}

	async fileStat(
		params?: unknown,
	): Promise<RpcRequests["fileStat"]["response"]> {
		const { path } = params as RpcRequests["fileStat"]["params"];
		try {
			const s = await stat(path);
			return {
				ok: true,
				exists: true,
				isFile: s.isFile(),
				size: s.size,
			};
		} catch {
			return { ok: true, exists: false, isFile: false, size: 0 };
		}
	}

	async decryptAgeFile(
		params?: unknown,
	): Promise<RpcRequests["decryptAgeFile"]["response"]> {
		const { path, passphrase } =
			params as RpcRequests["decryptAgeFile"]["params"];
		try {
			const f = Bun.file(path);
			if (!(await f.exists())) {
				return { ok: false, error: "File not found" };
			}
			const ab = await f.arrayBuffer();
			const plain = await this.vaultAge.decryptToMemory(
				new Uint8Array(ab),
				passphrase,
			);
			return {
				ok: true,
				plainBase64: Buffer.from(plain).toString("base64"),
			};
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : String(e),
			};
		}
	}

	async encryptAgeFile(
		params?: unknown,
	): Promise<RpcRequests["encryptAgeFile"]["response"]> {
		const { targetPath, passphrase, plainBase64 } =
			params as RpcRequests["encryptAgeFile"]["params"];
		try {
			const plain = Buffer.from(plainBase64, "base64");
			const abs = resolve(targetPath);
			const parent = this.fileReplace.parentOf(abs);
			await this.fileReplace.encryptBytesReplaceInParent(
				parent,
				".vault_wr_",
				new Uint8Array(plain),
				passphrase,
				abs,
				(plainBytes, pass) => this.vaultAge.encryptBytes(plainBytes, pass),
			);
			return { ok: true };
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : String(e),
			};
		}
	}

	async setWindowTitle(params?: unknown): Promise<void> {
		const { title } = params as RpcRequests["setWindowTitle"]["params"];
		this.mainWindow.setTitle(title);
	}

	async setUnsavedFlag(params?: unknown): Promise<void> {
		const { hasUnsaved } = params as RpcRequests["setUnsavedFlag"]["params"];
		this.mainWindow.setHasUnsaved(hasUnsaved);
	}

	async showMessageBoxReq(
		params?: unknown,
	): Promise<RpcRequests["showMessageBoxReq"]["response"]> {
		const opts = params as MessageBoxReq;
		const r = await Utils.showMessageBox({
			type: opts.type,
			title: opts.title,
			message: opts.message,
			detail: opts.detail,
			buttons: opts.buttons,
			defaultId: opts.defaultId,
			cancelId: opts.cancelId,
		});
		return { response: r.response };
	}

	async startupArgPath(): Promise<RpcRequests["startupArgPath"]["response"]> {
		return { path: this.getStartupFilePath() };
	}
}
