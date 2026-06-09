import { ContainerModule } from "inversify";
import { VaultRpcService } from "./provider";
import { VaultRpcServiceToken, type IVaultRpcService } from "./types";

export const VaultRpcModule = new ContainerModule((ctx) => {
	ctx
		.bind<IVaultRpcService>(VaultRpcServiceToken)
		.to(VaultRpcService)
		.inSingletonScope();
});
