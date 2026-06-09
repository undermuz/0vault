import { ContainerModule } from "inversify";
import { FileReplaceService } from "./provider";
import { FileReplaceServiceToken, type IFileReplaceService } from "./types";

export const FileReplaceModule = new ContainerModule((ctx) => {
	ctx
		.bind<IFileReplaceService>(FileReplaceServiceToken)
		.to(FileReplaceService)
		.inSingletonScope();
});
