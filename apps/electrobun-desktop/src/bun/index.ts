import "reflect-metadata";
import { createBunDiContainer } from "../di/bun/container";
import { ElectrobunAppToken, type IElectrobunApp } from "../di/bun/app/types";

const di = createBunDiContainer();
const app = di.get<IElectrobunApp>(ElectrobunAppToken);
await app.start();
