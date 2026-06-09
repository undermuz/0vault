import { FileArrowUp, FilePlus, FolderPlus } from "@gravity-ui/icons";
import { Button, Description, Kbd, Surface } from "@heroui/react";
import type { TreeBranch } from "@libs/utils/vault/tree";
import type { KeyboardEvent } from "react";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";
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
	const t = useT(I18nProvider);
	return (
		<Surface
			variant="secondary"
			className="inspector-panel"
			tabIndex={0}
			onKeyDown={onTreeKeyDown}
		>
			<div className="panel-section-title">{t("archiveTree.title")}</div>
			<div className="panel-toolbar">
				<Button
					size="sm"
					variant="secondary"
					isIconOnly
					aria-label={t("archiveTree.addFiles")}
					title={t("archiveTree.addFiles")}
					isDisabled={ioLoading}
					onPress={onAddFiles}
				>
					<FileArrowUp className="size-4" />
				</Button>
				<Button
					size="sm"
					variant="tertiary"
					isIconOnly
					aria-label={t("archiveTree.newFile")}
					title={t("archiveTree.newFile")}
					isDisabled={ioLoading}
					onPress={onNewFile}
				>
					<FilePlus className="size-4" />
				</Button>
				<Button
					size="sm"
					variant="tertiary"
					isIconOnly
					aria-label={t("archiveTree.newDir")}
					title={t("archiveTree.newDir")}
					isDisabled={ioLoading}
					onPress={onNewDir}
				>
					<FolderPlus className="size-4" />
				</Button>
			</div>
			<Surface
				variant="default"
				className="flex-1 min-h-0 overflow-auto mx-3 my-3 rounded-lg border border-border p-2"
			>
				<ArchiveTreeRow
					branches={tree}
					level={0}
					selectedPath={selectedPath}
					dirtyPaths={dirtyPaths}
					onSelectFile={onSelectFile}
					onSelectDir={onSelectDir}
					parentSegments={[]}
				/>
			</Surface>
			<Surface variant="tertiary" className="mx-3 mb-3 rounded-lg px-3 py-2.5">
				<Description className="text-[11px] leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1">
					<span className="inline-flex items-center gap-1">
						<Kbd><Kbd.Content>Del</Kbd.Content></Kbd>
						delete
					</span>
					<span className="inline-flex items-center gap-1">
						<Kbd><Kbd.Content>F2</Kbd.Content></Kbd>
						rename
					</span>
					<span className="inline-flex items-center gap-1">
						<Kbd><Kbd.Abbr keyValue="ctrl" /><Kbd.Content>S</Kbd.Content></Kbd>
						save
					</span>
					<span className="inline-flex items-center gap-1">
						<Kbd><Kbd.Abbr keyValue="ctrl" /><Kbd.Content>W</Kbd.Content></Kbd>
						close
					</span>
				</Description>
			</Surface>
		</Surface>
	);
}
