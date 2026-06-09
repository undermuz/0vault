import { Container } from "inversify";

/* MODULES */
import { VaultEditorModule } from "./vault-editor/module";

export const createDiContainer = () => {
    const di: Container = new Container();

    di.load(VaultEditorModule);

    return di;
};
