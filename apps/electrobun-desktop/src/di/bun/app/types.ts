export const ElectrobunAppToken = Symbol.for("ElectrobunApp");

export interface IElectrobunApp {
	start(): Promise<void>;
}
