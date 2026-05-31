import type { TreeBranch } from "@vault/tree";
import type { KeyboardEvent } from "react";
import { ArchiveTreeRow } from "./ArchiveTreeRow";

export function ArchiveTreePanel(props: {
	tree: TreeBranch[];
	selectedPath: string | null;
	dirtyPaths: Set<string>;
	ioLoading: boolean;
	onTreeKeyDown: (e: KeyboardEvent) => void;
	onSelectFile: (path: string) => void;
	onSelectDir: (segments: string[]) => void;
	onAddFiles: () => void;
	onNewFile: () => void;
	onNewDir: () => void;
}): JSX.Element {
	const {
		tree,
		selectedPath,
		dirtyPaths,
		ioLoading,
		onTreeKeyDown,
		onSelectFile,
		onSelectDir,
		onAddFiles,
		onNewFile,
		onNewDir,
	} = props;
	return (
		<div
			className="w-64 flex-shrink-0 flex flex-col bg-zinc-950 p-2 gap-2"
			tabIndex={0}
			onKeyDown={onTreeKeyDown}
		>
			<div className="flex flex-col gap-1">
				<button
					type="button"
					disabled={ioLoading}
					className="text-xs py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
					onClick={onAddFiles}
				>
					Добавить файлы
				</button>
				<button
					type="button"
					disabled={ioLoading}
					className="text-xs py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
					onClick={onNewFile}
				>
					Создать файл
				</button>
				<button
					type="button"
					disabled={ioLoading}
					className="text-xs py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
					onClick={onNewDir}
				>
					Создать каталог
				</button>
			</div>
			<div className="flex-1 overflow-auto text-sm border border-zinc-700 rounded-md p-1">
				<ArchiveTreeRow
					branches={tree}
					level={0}
					selectedPath={selectedPath}
					dirtyPaths={dirtyPaths}
					onSelectFile={onSelectFile}
					onSelectDir={onSelectDir}
					parentSegments={[]}
				/>
			</div>
			<p className="text-[10px] text-zinc-500">
				Del — удалить, F2 — переименовать. Ctrl+S / Ctrl+Shift+S.
			</p>
		</div>
	);
}
