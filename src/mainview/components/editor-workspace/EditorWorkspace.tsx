import { ValtioVaultTextarea } from "../valtio-fields";
import { ArchiveTreePanel } from "../archive-tree/ArchiveTreePanel";
import type { TreeBranch } from "@vault/tree";
import type { KeyboardEvent } from "react";

export function EditorWorkspace(props: {
	tree: TreeBranch[];
	selectedPath: string | null;
	dirtyPaths: Set<string>;
	ioLoading: boolean;
	editorTextDisabled: boolean;
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
		editorTextDisabled,
		onTreeKeyDown,
		onSelectFile,
		onSelectDir,
		onAddFiles,
		onNewFile,
		onNewDir,
	} = props;
	return (
		<div className="flex-1 flex min-h-0">
			<div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 dark:border-zinc-700">
				<ValtioVaultTextarea
					className="flex-1 w-full min-h-[320px] bg-white text-zinc-900 p-3 font-mono text-sm resize-none outline-hidden focus:ring-1 focus:ring-emerald-600/50 dark:bg-zinc-900 dark:text-zinc-100"
					spellCheck={false}
					disabled={editorTextDisabled}
				/>
			</div>
			<ArchiveTreePanel
				tree={tree}
				selectedPath={selectedPath}
				dirtyPaths={dirtyPaths}
				ioLoading={ioLoading}
				onTreeKeyDown={onTreeKeyDown}
				onSelectFile={onSelectFile}
				onSelectDir={onSelectDir}
				onAddFiles={onAddFiles}
				onNewFile={onNewFile}
				onNewDir={onNewDir}
			/>
		</div>
	);
}
