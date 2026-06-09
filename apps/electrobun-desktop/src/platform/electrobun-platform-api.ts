import type { IVaultPlatformApi } from "@libs/di/platform/types";
import type { MessageBoxReq } from "@libs/utils/rpc/message-box";
import { api } from "../electro";

export const electrobunVaultPlatformApi: IVaultPlatformApi = {
	pickOpenFile: () => api.pickOpenFile(),
	pickOpenMultiple: () => api.pickOpenMultiple(),
	pickFolder: () => api.pickFolder(),
	readFileBase64: (params: { path: string }) => api.readFileBase64(params),
	fileStat: (params: { path: string }) => api.fileStat(params),
	decryptAgeFile: (params: { path: string; passphrase: string }) =>
		api.decryptAgeFile(params),
	encryptAgeFile: (params: {
		targetPath: string;
		passphrase: string;
		plainBase64: string;
	}) => api.encryptAgeFile(params),
	setWindowTitle: (params: { title: string }) => api.setWindowTitle(params),
	setUnsavedFlag: (params: { hasUnsaved: boolean }) =>
		api.setUnsavedFlag(params),
	showMessageBoxReq: (params: MessageBoxReq) => api.showMessageBoxReq(params),
	startupArgPath: () => api.startupArgPath(),
};
