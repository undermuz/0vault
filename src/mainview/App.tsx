import { useEffect, type KeyboardEvent } from "react";
import { useSnapshot } from "valtio";
import { VaultArchive } from "@vault/archive";
import { buildArchiveTree, type TreeBranch } from "@vault/tree";
import { useDi } from "../di/react/hooks/useDi";
import {
	VaultEditorProviderToken,
	type IVaultEditorProvider,
} from "../di/vault-editor/types";

function TreeRow(props: {
	branches: TreeBranch[];
	level: number;
	selectedPath: string | null;
	dirtyPaths: Set<string>;
	onSelectFile: (path: string) => void;
	onSelectDir: (segments: string[]) => void;
	parentSegments: string[];
}): JSX.Element {
	const {
		branches,
		level,
		selectedPath,
		dirtyPaths,
		onSelectFile,
		onSelectDir,
		parentSegments,
	} = props;
	return (
		<ul className={level === 0 ? "tree-root" : "pl-3 border-l border-zinc-600/50"}>
			{branches.map((br, i) => {
				if (br.node.kind === "dir") {
					const segs = [...parentSegments, br.node.name];
					return (
						<li key={`d-${segs.join("/")}-${i}`} className="py-0.5">
							<button
								type="button"
								className="text-left w-full rounded px-1 hover:bg-zinc-700/80 text-zinc-300"
								onClick={() => onSelectDir(segs)}
							>
								{br.node.name}/
							</button>
							<TreeRow
								branches={br.children}
								level={level + 1}
								selectedPath={selectedPath}
								dirtyPaths={dirtyPaths}
								onSelectFile={onSelectFile}
								onSelectDir={onSelectDir}
								parentSegments={segs}
							/>
						</li>
					);
				}
				const path = br.node.path;
				const leaf = path.replace(/\\/g, "/").split("/").pop() ?? path;
				const dirty = dirtyPaths.has(path);
				const sel = selectedPath === path;
				return (
					<li key={path} className="py-0.5">
						<button
							type="button"
							className={`text-left w-full rounded px-1 font-mono text-sm ${
								sel
									? "bg-emerald-900/50 text-emerald-100"
									: "hover:bg-zinc-700/80 text-zinc-200"
							}`}
							onClick={() => onSelectFile(path)}
							onDoubleClick={() => onSelectFile(path)}
						>
							{leaf}
							{dirty ? " *" : ""}
						</button>
					</li>
				);
			})}
		</ul>
	);
}
export default function App() {
	const vault = useDi<IVaultEditorProvider>(VaultEditorProviderToken);
	const snap = useSnapshot(vault.state);

	const archive = snap.session ? VaultArchive.fromJSON(snap.session.archiveJson) : null;
	const tree = archive ? buildArchiveTree(archive) : [];
	const dirtySet = new Set(snap.dirtyPaths);

	useEffect(() => {
		void vault.init();
	}, [vault]);

	useEffect(() => {
		const onKey = (e: globalThis.KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				if (e.shiftKey) void vault.saveAs();
				else void vault.save();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [vault]);

	const onTreeKeyDown = (e: KeyboardEvent) => {
		if (e.key === "F2") void vault.renameSelected();
		if (e.key === "Delete") void vault.deleteSelected();
	};

	return (
		<div className="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col">
			<header className="border-b border-zinc-700 px-3 py-2 flex flex-wrap gap-2 items-center bg-zinc-950/80">
				<button
					type="button"
					disabled={snap.ioLoading}
					onClick={() => void vault.pickAndOpen()}
					className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-sm disabled:opacity-50"
				>
					Открыть…
				</button>
				{snap.session && (
					<>
						<button
							type="button"
							disabled={snap.ioLoading}
							onClick={() => void vault.save()}
							className="px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-sm"
						>
							Сохранить
						</button>
						<button
							type="button"
							disabled={snap.ioLoading}
							onClick={() => void vault.saveAs()}
							className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm"
						>
							Сохранить как…
						</button>
						{archive?.showSaveAsZipSideButton() && (
							<button
								type="button"
								disabled={snap.ioLoading}
								onClick={() => void vault.exportZipAge()}
								className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm"
							>
								Экспорт ZIP → .age
							</button>
						)}
					</>
				)}
			</header>

			{!snap.session ? (
				<div className="flex-1 flex items-center justify-center text-zinc-500">
					Откройте .age, .zip или файл через кнопку «Открыть».
				</div>
			) : (
				<div className="flex-1 flex min-h-0">
					<div className="flex-1 flex flex-col min-w-0 border-r border-zinc-700">
						<textarea
							className="flex-1 w-full min-h-[320px] bg-zinc-900 text-zinc-100 p-3 font-mono text-sm resize-none outline-none focus:ring-1 focus:ring-emerald-600/50"
							spellCheck={false}
							value={snap.editorText}
							onChange={(e) => void vault.setEditorText(e.target.value)}
							disabled={!snap.selectedPath || snap.ioLoading}
						/>
					</div>
					<div
						className="w-64 flex-shrink-0 flex flex-col bg-zinc-950 p-2 gap-2"
						tabIndex={0}
						onKeyDown={onTreeKeyDown}
					>
						<div className="flex flex-col gap-1">
							<button
								type="button"
								disabled={snap.ioLoading}
								className="text-xs py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
								onClick={() => void vault.addFiles()}
							>
								Добавить файлы
							</button>
							<button
								type="button"
								disabled={snap.ioLoading}
								className="text-xs py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
								onClick={() => void vault.newFile()}
							>
								Создать файл
							</button>
							<button
								type="button"
								disabled={snap.ioLoading}
								className="text-xs py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
								onClick={() => void vault.newDir()}
							>
								Создать каталог
							</button>
						</div>
						<div className="flex-1 overflow-auto text-sm border border-zinc-700 rounded-md p-1">
							<TreeRow
								branches={tree}
								level={0}
								selectedPath={snap.selectedPath}
								dirtyPaths={dirtySet}
								onSelectFile={(p) => void vault.selectFile(p)}
								onSelectDir={(segs) => vault.selectDir(segs)}
								parentSegments={[]}
							/>
						</div>
						<p className="text-[10px] text-zinc-500">
							Del — удалить, F2 — переименовать. Ctrl+S / Ctrl+Shift+S.
						</p>
					</div>
				</div>
			)}

			{snap.decryptModal && (
				<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
					<form
						className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 w-96 shadow-xl"
						onSubmit={(e) => {
							e.preventDefault();
							void vault.decryptSubmit();
						}}
					>
						<h2 className="font-semibold mb-2">Расшифровка</h2>
						<p className="text-sm text-zinc-400 mb-2">Пароль контейнера:</p>
						{snap.decryptModal.hint && (
							<p className="text-xs text-red-400 mb-2">
								{snap.decryptModal.hint}
							</p>
						)}
						<input
							type="password"
							autoFocus
							className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 mb-3"
							value={snap.decryptPass}
							onChange={(e) => void (vault.state.decryptPass = e.target.value)}
						/>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								className="px-3 py-1 rounded bg-zinc-700"
								onClick={() => vault.decryptCancel()}
							>
								Отмена
							</button>
							<button
								type="submit"
								className="px-3 py-1 rounded bg-emerald-700"
							>
								OK
							</button>
						</div>
					</form>
				</div>
			)}

			{snap.ioLoading && (
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 backdrop-blur-[2px]"
					aria-busy="true"
					aria-live="polite"
				>
					<div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-600 bg-zinc-900 px-10 py-8 shadow-2xl">
						<div
							className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
							aria-hidden
						/>
						<p className="max-w-sm text-center text-sm text-zinc-200">
							{snap.ioLoadingMessage || "Загрузка…"}
						</p>
					</div>
				</div>
			)}

			{snap.pwModal && (
				<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
					<form
						className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 w-96 shadow-xl"
						onSubmit={(e) => {
							e.preventDefault();
							void vault.pwSubmit();
						}}
					>
						<h2 className="font-semibold mb-2 text-sm">
							{snap.pwModal.title}
						</h2>
						<input
							type="password"
							placeholder="Пароль"
							autoFocus
							className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 mb-2"
							value={snap.pw1}
							onChange={(e) => void (vault.state.pw1 = e.target.value)}
						/>
						<input
							type="password"
							placeholder="Повтор пароля"
							className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 mb-3"
							value={snap.pw2}
							onChange={(e) => void (vault.state.pw2 = e.target.value)}
						/>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								className="px-3 py-1 rounded bg-zinc-700"
								onClick={() => {
									vault.pwCancel();
								}}
							>
								Отмена
							</button>
							<button type="submit" className="px-3 py-1 rounded bg-emerald-700">
								OK
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
