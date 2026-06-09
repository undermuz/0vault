import type { ElectrobunRPCSchema } from "electrobun/bun";
import type { MessageBoxReq } from "../../../libs/utils/src/rpc/message-box";

export type { MessageBoxReq };

/** Electrobun RPC: webview calls `request.*` implemented on Bun. */
export type VaultAppRPC = ElectrobunRPCSchema & {
	bun: {
		requests: {
			pickOpenFile: { params: void; response: { paths: string[] } };
			pickOpenMultiple: { params: void; response: { paths: string[] } };
			pickFolder: { params: void; response: { paths: string[] } };
			readFileBase64: {
				params: { path: string };
				response: { ok: boolean; base64?: string; error?: string };
			};
			fileStat: {
				params: { path: string };
				response: {
					ok: boolean;
					exists: boolean;
					isFile: boolean;
					size: number;
				};
			};
			decryptAgeFile: {
				params: { path: string; passphrase: string };
				response: { ok: boolean; plainBase64?: string; error?: string };
			};
			encryptAgeFile: {
				params: {
					targetPath: string;
					passphrase: string;
					plainBase64: string;
				};
				response: { ok: boolean; error?: string };
			};
			setWindowTitle: { params: { title: string }; response: void };
			setUnsavedFlag: { params: { hasUnsaved: boolean }; response: void };
			showMessageBoxReq: {
				params: MessageBoxReq;
				response: { response: number };
			};
			startupArgPath: { params: void; response: { path: string | null } };
		};
		messages: Record<string, never>;
	};
	webview: {
		requests: Record<string, never>;
		messages: Record<string, never>;
	};
};
