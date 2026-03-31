import { Electroview } from "electrobun/view";
import type { VaultAppRPC } from "@rpc/vaultSchema";

export const vaultBrowserRpc = Electroview.defineRPC<VaultAppRPC>({
	maxRequestTime: 600_000,
	handlers: {
		requests: {},
		messages: {},
	},
});

new Electroview({ rpc: vaultBrowserRpc });

export const api = vaultBrowserRpc.request;
