import { ContainerModule, type Factory } from "inversify";
import { VaultArchive } from "./archive";
import { VaultArchiveFactory } from "./factory";
import {
	VaultArchiveFactoryToken,
	VaultArchiveToken,
	type IVaultArchiveFactory,
} from "./types";

export const VaultArchiveModule = new ContainerModule((ctx) => {
	ctx.bind(VaultArchiveToken).to(VaultArchive).inTransientScope();
	ctx.bind<Factory<VaultArchive>>("Factory<VaultArchive>").toFactory(
		(context) => () => context.get<VaultArchive>(VaultArchiveToken),
	);
	ctx
		.bind<IVaultArchiveFactory>(VaultArchiveFactoryToken)
		.to(VaultArchiveFactory)
		.inSingletonScope();
});
