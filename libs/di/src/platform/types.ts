import type { MessageBoxReq } from "@libs/utils/rpc/message-box";

export interface IVaultPlatformApi {
	pickOpenFile(): Promise<{ paths: string[] }>;
	pickOpenMultiple(): Promise<{ paths: string[] }>;
	pickFolder(): Promise<{ paths: string[] }>;
	readFileBase64(params: {
		path: string;
	}): Promise<{ ok: boolean; base64?: string; error?: string }>;
	fileStat(params: {
		path: string;
	}): Promise<{ ok: boolean; exists: boolean; isFile: boolean; size: number }>;
	decryptAgeFile(params: {
		path: string;
		passphrase: string;
	}): Promise<{ ok: boolean; plainBase64?: string; error?: string }>;
	encryptAgeFile(params: {
		targetPath: string;
		passphrase: string;
		plainBase64: string;
	}): Promise<{ ok: boolean; error?: string }>;
	setWindowTitle(params: { title: string }): Promise<void>;
	setUnsavedFlag(params: { hasUnsaved: boolean }): Promise<void>;
	showMessageBoxReq(params: MessageBoxReq): Promise<{ response: number }>;
	startupArgPath(): Promise<{ path: string | null }>;
}

export const VaultPlatformApiToken = Symbol.for("VaultPlatformApi");
