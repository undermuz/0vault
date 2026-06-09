import { ContainerModule } from "inversify";
import {
	VaultPlatformApiToken,
	type IVaultPlatformApi,
} from "@libs/di/platform/types";
import { electrobunVaultPlatformApi } from "./electrobun-platform-api";

export const ElectrobunPlatformModule = new ContainerModule((ctx) => {
	ctx
		.bind<IVaultPlatformApi>(VaultPlatformApiToken)
		.toConstantValue(electrobunVaultPlatformApi);
});
