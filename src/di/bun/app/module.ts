import { ContainerModule } from "inversify";
import { ElectrobunApp } from "./provider";
import { ElectrobunAppToken, type IElectrobunApp } from "./types";

export const ElectrobunAppModule = new ContainerModule((ctx) => {
	ctx
		.bind<IElectrobunApp>(ElectrobunAppToken)
		.to(ElectrobunApp)
		.inSingletonScope();
});
