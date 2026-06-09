import type { IVaultPlatformApi } from "@libs/di/platform/types";
import type { MessageBoxReq } from "@libs/utils/rpc/message-box";
import { base64ToU8, u8ToBase64 } from "@libs/utils/bytes";
import { browserFileStore } from "./file-store";
import { pickDirectory, pickOpenFiles } from "./file-picker";
import { decryptAgeBytes, encryptAgeBytes } from "./vault-age";

async function registerPickedFile(
	file: File,
	handle?: FileSystemFileHandle,
): Promise<string> {
	const path = file.webkitRelativePath || file.name;
	return browserFileStore.registerFile(path, file, handle);
}

export const browserVaultPlatformApi: IVaultPlatformApi = {
	async pickOpenFile() {
		if ("showOpenFilePicker" in window) {
			try {
				const [handle] = await window.showOpenFilePicker({
					multiple: false,
					types: [
						{
							description: "Vault files",
							accept: {
								"application/octet-stream": [".age", ".zip"],
								"application/zip": [".zip"],
							},
						},
					],
				});
				const file = await handle.getFile();
				const path = browserFileStore.registerFile(file.name, file, handle);
				return { paths: [path] };
			} catch (e) {
				if ((e as Error).name === "AbortError") return { paths: [] };
				throw e;
			}
		}
		const files = await pickOpenFiles(false);
		if (!files[0]) return { paths: [] };
		return { paths: [await registerPickedFile(files[0])] };
	},

	async pickOpenMultiple() {
		if ("showOpenFilePicker" in window) {
			try {
				const handles = await window.showOpenFilePicker({ multiple: true });
				const paths: string[] = [];
				for (const handle of handles) {
					const file = await handle.getFile();
					paths.push(
						browserFileStore.registerFile(file.name, file, handle),
					);
				}
				return { paths };
			} catch (e) {
				if ((e as Error).name === "AbortError") return { paths: [] };
				throw e;
			}
		}
		const files = await pickOpenFiles(true);
		const paths: string[] = [];
		for (const file of files) {
			paths.push(await registerPickedFile(file));
		}
		return { paths };
	},

	async pickFolder() {
		const handle = await pickDirectory();
		if (!handle) return { paths: [] };
		return { paths: [browserFileStore.registerDir(handle.name, handle)] };
	},

	async readFileBase64({ path }) {
		try {
			const bytes = await browserFileStore.getBytes(path);
			if (!bytes) return { ok: false, error: "File not found" };
			return { ok: true, base64: u8ToBase64(bytes) };
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : String(e),
			};
		}
	},

	async fileStat({ path }) {
		return browserFileStore.stat(path);
	},

	async decryptAgeFile({ path, passphrase }) {
		try {
			const bytes = await browserFileStore.getBytes(path);
			if (!bytes) return { ok: false, error: "File not found" };
			const plain = await decryptAgeBytes(bytes, passphrase);
			return { ok: true, plainBase64: u8ToBase64(plain) };
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : String(e),
			};
		}
	},

	async encryptAgeFile({ targetPath, passphrase, plainBase64 }) {
		try {
			const plain = base64ToU8(plainBase64);
			const cipher = await encryptAgeBytes(plain, passphrase);
			await browserFileStore.writeBytes(targetPath, cipher);
			return { ok: true };
		} catch (e) {
			if ((e as Error).name === "AbortError") {
				return { ok: false, error: "Save cancelled" };
			}
			return {
				ok: false,
				error: e instanceof Error ? e.message : String(e),
			};
		}
	},

	async setWindowTitle({ title }) {
		document.title = title;
	},

	async setUnsavedFlag() {
		// Web uses vault.hasUnsaved() + beforeunload in App.
	},

	async showMessageBoxReq(params: MessageBoxReq) {
		const message = [params.message, params.detail].filter(Boolean).join("\n\n");
		const buttons = params.buttons ?? ["OK"];
		if (buttons.length <= 1) {
			window.alert(message);
			return { response: params.defaultId ?? 0 };
		}
		if (buttons.length === 2) {
			const confirmed = window.confirm(message);
			return { response: confirmed ? 0 : 1 };
		}
		window.alert(message);
		return { response: params.defaultId ?? 0 };
	},

	async startupArgPath() {
		const open = new URLSearchParams(window.location.search).get("open");
		if (open) {
			browserFileStore.markVirtualFile(open);
			return { path: open };
		}
		return { path: null };
	},
};
