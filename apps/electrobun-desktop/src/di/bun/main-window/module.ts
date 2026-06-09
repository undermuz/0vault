import { ContainerModule } from "inversify";
import { MainWindowService } from "./provider";
import { MainWindowServiceToken, type IMainWindowService } from "./types";

export const MainWindowModule = new ContainerModule((ctx) => {
	ctx
		.bind<IMainWindowService>(MainWindowServiceToken)
		.to(MainWindowService)
		.inSingletonScope();
});
