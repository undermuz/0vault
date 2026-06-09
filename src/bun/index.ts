import {
	BrowserWindow,
	BrowserView,
	Updater,
	Utils,
} from "electrobun/bun";
import type { MessageBoxReq, VaultAppRPC } from "../rpc/vaultSchema";
import { encryptBytes, decryptToMemory } from "./vaultAge";
import {
	encryptBytesReplaceInParent,
	parentOf,
} from "./fileReplace";
import { resolve } from "node:path";
import { stat } from "node:fs/promises";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

function getStartupFilePath(): string | null {
	for (const a of process.argv.slice(2)) {
		if (a.startsWith("-")) continue;
		return a;
	}
	return null;
}

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR: ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log("Vite not running; use views:// (or bun run dev:hmr)");
		}
	}
	return "views://mainview/index.html";
}

let mainWindowRef: BrowserWindow | null = null;

const rpc = BrowserView.defineRPC<VaultAppRPC>({
	maxRequestTime: 600_000,
	handlers: {
		requests: {
			pickOpenFile: async (_p?: unknown) => {
				const paths = await Utils.openFileDialog({
					startingFolder: "~/",
					allowedFileTypes: "*",
					canChooseFiles: true,
					canChooseDirectory: false,
					allowsMultipleSelection: false,
				});
				return { paths: paths.map((p) => p.trim()).filter(Boolean) };
			},
			pickOpenMultiple: async (_p?: unknown) => {
				const paths = await Utils.openFileDialog({
					startingFolder: "~/",
					allowedFileTypes: "*",
					canChooseFiles: true,
					canChooseDirectory: false,
					allowsMultipleSelection: true,
				});
				return { paths: paths.map((p) => p.trim()).filter(Boolean) };
			},
			pickFolder: async (_p?: unknown) => {
				const paths = await Utils.openFileDialog({
					startingFolder: "~/",
					allowedFileTypes: "*",
					canChooseFiles: false,
					canChooseDirectory: true,
					allowsMultipleSelection: false,
				});
				return { paths: paths.map((p) => p.trim()).filter(Boolean) };
			},
			readFileBase64: async (params: unknown) => {
				const { path } = params as { path: string };
				try {
					const f = Bun.file(path);
					if (!(await f.exists())) {
						return { ok: false, error: "Файл не найден" };
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
			},
			fileStat: async (params: unknown) => {
				const { path } = params as { path: string };
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
			},
			decryptAgeFile: async (params: unknown) => {
				const { path, passphrase } = params as {
					path: string;
					passphrase: string;
				};
				try {
					const f = Bun.file(path);
					if (!(await f.exists())) {
						return { ok: false, error: "Файл не найден" };
					}
					const ab = await f.arrayBuffer();
					const plain = await decryptToMemory(new Uint8Array(ab), passphrase);
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
			},
			encryptAgeFile: async (params: unknown) => {
				const { targetPath, passphrase, plainBase64 } = params as {
					targetPath: string;
					passphrase: string;
					plainBase64: string;
				};
				try {
					const plain = Buffer.from(plainBase64, "base64");
					const abs = resolve(targetPath);
					const parent = parentOf(abs);
					await encryptBytesReplaceInParent(
						parent,
						".vault_wr_",
						new Uint8Array(plain),
						passphrase,
						abs,
						encryptBytes,
					);
					return { ok: true };
				} catch (e) {
					return {
						ok: false,
						error: e instanceof Error ? e.message : String(e),
					};
				}
			},
			setWindowTitle: async (params: unknown) => {
				const { title } = params as { title: string };
				mainWindowRef?.setTitle(title);
			},
			showMessageBoxReq: async (params: unknown) => {
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
			},
			startupArgPath: async (_p?: unknown) => ({
				path: getStartupFilePath(),
			}),
		},
		messages: {},
	},
});

const url = await getMainViewUrl();

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

mainWindowRef = mainWindow;

console.log("VaultEditor (Electrobun) started");
