import { ContainerModule } from "inversify";
import { ThemeProviderImpl } from "./provider";
import { ThemeProvider, type ThemeService } from "./types";

export const ThemeModule = new ContainerModule((ctx) => {
	ctx.bind<ThemeService>(ThemeProvider).to(ThemeProviderImpl).inSingletonScope();
});
