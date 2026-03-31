import { Container } from "inversify";

/* MODULES */
import { MyModule } from "./my-provider/module";

export const createDiContainer = () => {
    const di: Container = new Container();

    di.load(MyModule);

    return di;
};
