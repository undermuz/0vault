import type { VaultAppRPC } from "../../../rpc/vaultSchema";

export const VaultRpcServiceToken = Symbol.for("VaultRpcService");

export type VaultRpc = ReturnType<
	typeof import("electrobun/bun").BrowserView.defineRPC<VaultAppRPC>
>;

export interface IVaultRpcService {
	buildRpc(): VaultRpc;
}
