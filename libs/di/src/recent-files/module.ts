import { ContainerModule } from "inversify";
import { RecentFilesProvider } from "./provider";
import {
	RecentFilesProviderToken,
	type IRecentFilesProvider,
} from "./types";

export const RecentFilesModule = new ContainerModule((ctx) => {
	ctx
		.bind<IRecentFilesProvider>(RecentFilesProviderToken)
		.to(RecentFilesProvider)
		.inSingletonScope();
});
