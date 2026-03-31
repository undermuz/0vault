import { Container } from "inversify";

/* MODULES */
import { MyModule } from "./my-provider/module";
import { VaultEditorModule } from "./vault-editor/module";

export const createDiContainer = () => {
    const di: Container = new Container();

    di.load(MyModule);
    di.load(VaultEditorModule);

    return di;
};
