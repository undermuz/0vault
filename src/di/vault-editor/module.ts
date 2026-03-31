import { ContainerModule } from "inversify";
import { VaultEditorProviderToken, type IVaultEditorProvider } from "./types";
import { VaultEditorProvider } from "./provider";

export const VaultEditorModule = new ContainerModule((ctx) => {
	ctx
		.bind<IVaultEditorProvider>(VaultEditorProviderToken)
		.toDynamicValue(() => new VaultEditorProvider())
		.inSingletonScope();
});

