import type { IVaultEditorProvider } from "../../../di/vault-editor/types";
import { I18nProvider } from "../../../di/i18n/types";
import { useT } from "../../../di/react/hooks/useT";

export function AppHeader(props: {
	vault: IVaultEditorProvider;
	hasSession: boolean;
	showExportZip: boolean;
	ioLoading: boolean;
}): JSX.Element {
	const { vault, hasSession, showExportZip, ioLoading } = props;
	const t = useT(I18nProvider);
	return (
		<header className="border-b border-zinc-700 px-3 py-2 flex flex-wrap gap-2 items-center bg-zinc-950/80">
			<button
				type="button"
				disabled={ioLoading}
				onClick={() => void vault.newDocument()}
				className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-sm disabled:opacity-50"
			>
				{t("header.new")}
			</button>
			<button
				type="button"
				disabled={ioLoading}
				onClick={() => void vault.pickAndOpen()}
				className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-sm disabled:opacity-50"
			>
				{t("header.open")}
			</button>
			{hasSession && (
				<>
					<button
						type="button"
						disabled={ioLoading}
						onClick={() => void vault.save()}
						className="px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-sm"
					>
						{t("header.save")}
					</button>
					<button
						type="button"
						disabled={ioLoading}
						onClick={() => void vault.saveAs()}
						className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm"
					>
						{t("header.saveAs")}
					</button>
					{showExportZip && (
						<button
							type="button"
							disabled={ioLoading}
							onClick={() => void vault.exportZipAge()}
							className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm"
						>
							{t("header.exportZipAge")}
						</button>
					)}
				</>
			)}
		</header>
	);
}
