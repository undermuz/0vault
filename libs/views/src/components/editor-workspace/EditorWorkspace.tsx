import { Description, Surface } from "@heroui/react";
import { ValtioVaultTextarea } from "../valtio-fields";
import { ArchiveTreePanel } from "../archive-tree/ArchiveTreePanel";
import type { TreeBranch } from "@libs/utils/vault/tree";
import type { KeyboardEvent } from "react";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";

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
	const t = useT(I18nProvider);
	const hasFile = !!selectedPath;

	return (
		<div className="flex-1 flex min-h-0 gap-3 p-3">
			<Surface
				variant="default"
				className="flex-1 flex flex-col min-w-0 min-h-0 rounded-xl border border-border overflow-hidden"
			>
				<div className="panel-toolbar truncate">
					{hasFile ? selectedPath : t("editor.noFile")}
				</div>
				<div className="relative flex-1 min-h-0">
					<ValtioVaultTextarea
						className="absolute inset-0 h-full w-full rounded-none border-0 p-4 font-mono text-sm leading-relaxed resize-none focus:ring-0"
						variant="secondary"
						fullWidth
						spellCheck={false}
						disabled={editorTextDisabled}
					/>
					{!hasFile && (
						<div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none bg-background/40">
							<Description className="max-w-sm text-center text-sm leading-relaxed">
								{t("editor.pickFile")}
							</Description>
						</div>
					)}
				</div>
			</Surface>
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
