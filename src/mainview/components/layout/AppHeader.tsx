import type { IVaultEditorProvider } from "../../../di/vault-editor/types";

export function AppHeader(props: {
	vault: IVaultEditorProvider;
	hasSession: boolean;
	showExportZip: boolean;
	ioLoading: boolean;
}): JSX.Element {
	const { vault, hasSession, showExportZip, ioLoading } = props;
	return (
		<header className="border-b border-zinc-700 px-3 py-2 flex flex-wrap gap-2 items-center bg-zinc-950/80">
			<button
				type="button"
				disabled={ioLoading}
				onClick={() => void vault.pickAndOpen()}
				className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-sm disabled:opacity-50"
			>
				Открыть…
			</button>
			{hasSession && (
				<>
					<button
						type="button"
						disabled={ioLoading}
						onClick={() => void vault.save()}
						className="px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-sm"
					>
						Сохранить
					</button>
					<button
						type="button"
						disabled={ioLoading}
						onClick={() => void vault.saveAs()}
						className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm"
					>
						Сохранить как…
					</button>
					{showExportZip && (
						<button
							type="button"
							disabled={ioLoading}
							onClick={() => void vault.exportZipAge()}
							className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm"
						>
							Экспорт ZIP → .age
						</button>
					)}
				</>
			)}
		</header>
	);
}
