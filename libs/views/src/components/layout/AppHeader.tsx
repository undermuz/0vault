import type { IVaultEditorProvider } from "@libs/di/vault-editor/types";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";
import { ThemeSelect } from "./ThemeSelect";

export function AppHeader(props: {
	vault: IVaultEditorProvider;
	hasSession: boolean;
	showExportZip: boolean;
	ioLoading: boolean;
}): JSX.Element {
	const { vault, hasSession, showExportZip, ioLoading } = props;
	const t = useT(I18nProvider);
	return (
		<header className="border-b border-zinc-200 px-3 py-2 flex flex-wrap gap-2 items-center bg-white/80 dark:border-zinc-700 dark:bg-zinc-950/80">
			<button
				type="button"
				disabled={ioLoading}
				onClick={() => void vault.newDocument()}
				className="px-3 py-1.5 rounded-md bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-sm disabled:opacity-50"
			>
				{t("header.new")}
			</button>
			<button
				type="button"
				disabled={ioLoading}
				onClick={() => void vault.pickAndOpen()}
				className="px-3 py-1.5 rounded-md bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-sm disabled:opacity-50"
			>
				{t("header.open")}
			</button>
			{hasSession && (
				<>
					<button
						type="button"
						disabled={ioLoading}
						onClick={() => void vault.save()}
						className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-800 dark:hover:bg-emerald-700 text-white disabled:opacity-50 text-sm"
					>
						{t("header.save")}
					</button>
					<button
						type="button"
						disabled={ioLoading}
						onClick={() => void vault.saveAs()}
						className="px-3 py-1.5 rounded-md bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-50 text-sm"
					>
						{t("header.saveAs")}
					</button>
					{showExportZip && (
						<button
							type="button"
							disabled={ioLoading}
							onClick={() => void vault.exportZipAge()}
							className="px-3 py-1.5 rounded-md bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-50 text-sm"
						>
							{t("header.exportZipAge")}
						</button>
					)}
				</>
			)}
			<ThemeSelect />
		</header>
	);
}
