import { ContainerModule } from "inversify";
import {
	VaultPlatformApiToken,
	type IVaultPlatformApi,
} from "@libs/di/platform/types";
import { browserVaultPlatformApi } from "./browser-platform-api";

export const BrowserPlatformModule = new ContainerModule((ctx) => {
	ctx
		.bind<IVaultPlatformApi>(VaultPlatformApiToken)
		.toConstantValue(browserVaultPlatformApi);
});
