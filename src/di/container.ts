import { Container } from "inversify";

/* MODULES */
import { VaultArchiveModule } from "./vault/archive/module";
import { VaultEditorModule } from "./vault-editor/module";
import { ThemeModule } from "./theme/module";
import { I18nJsModule } from "./i18n/i18n-js/i18n.module";
import { BrowserLocalStorageModule } from "./utils/local-storage/browser-local-storage/module";
import { RecentFilesModule } from "./recent-files/module";
import { LogTapeModule } from "./logger/logtape/logtape.module";
import { I18nTranslations, I18nTranslationsProvider } from "./i18n/types";
import en from "./i18n/en.json"

export const createDiContainer = () => {
    const di: Container = new Container();

    di.bind<I18nTranslations>(I18nTranslationsProvider).toConstantValue({ en })
    di.load(I18nJsModule);
    di.load(ThemeModule);
    di.load(VaultArchiveModule);
    di.load(VaultEditorModule);
    di.load(RecentFilesModule);
    di.load(BrowserLocalStorageModule);
    di.load(LogTapeModule);

    return di;
};
