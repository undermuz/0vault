import { Container } from "inversify";
import { LogTapeModule } from "../logger/logtape/logtape.module";
import { ElectrobunAppModule } from "./app/module";
import { FileReplaceModule } from "./file-replace/module";
import { MainWindowModule } from "./main-window/module";
import { VaultAgeModule } from "./vault-age/module";
import { VaultRpcModule } from "./vault-rpc/module";

export const createBunDiContainer = () => {
	const di = new Container();

	di.load(LogTapeModule);
	di.load(VaultAgeModule);
	di.load(FileReplaceModule);
	di.load(MainWindowModule);
	di.load(VaultRpcModule);
	di.load(ElectrobunAppModule);

	return di;
};
