import { ContainerModule } from "inversify";
import { VaultAgeService } from "./provider";
import { VaultAgeServiceToken, type IVaultAgeService } from "./types";

export const VaultAgeModule = new ContainerModule((ctx) => {
	ctx
		.bind<IVaultAgeService>(VaultAgeServiceToken)
		.to(VaultAgeService)
		.inSingletonScope();
});
