import { useEffect, useMemo, type KeyboardEvent } from "react";
import { useSnapshot } from "valtio";
import { buildArchiveTree } from "@vault/tree";
import { useDi } from "../di/react/hooks/useDi";
import {
	VaultArchiveFactoryToken,
	type IVaultArchiveFactory,
} from "../di/vault/archive";
import {
	RecentFilesProviderToken,
	type IRecentFilesProvider,
} from "../di/recent-files/types";
import {
	VaultEditorProviderToken,
	type IVaultEditorProvider,
} from "../di/vault-editor/types";
import { AppHeader } from "./components/layout/AppHeader";
import { RecentFilesSidebar } from "./components/layout/RecentFilesSidebar";
import { VaultTabs } from "./components/layout/VaultTabs";
import { WelcomePlaceholder } from "./components/layout/WelcomePlaceholder";
import { IoLoadingOverlay } from "./components/layout/IoLoadingOverlay";
import { EditorWorkspace } from "./components/editor-workspace/EditorWorkspace";
import { DecryptModal } from "./components/modals/DecryptModal";
import { PasswordModal } from "./components/modals/PasswordModal";
import { TextPromptModal } from "./components/modals/TextPromptModal";

function normalizePath(p: string): string {
	return p.replace(/\\/g, "/");
}

export default function App() {
	const vault = useDi<IVaultEditorProvider>(VaultEditorProviderToken);
	const recentFiles = useDi<IRecentFilesProvider>(RecentFilesProviderToken);
	const archives = useDi<IVaultArchiveFactory>(VaultArchiveFactoryToken);
	const snap = useSnapshot(vault.state);
	const recentSnap = useSnapshot(recentFiles.state);

	const activeTab = useMemo(
		() => snap.tabs.find((tab) => tab.id === snap.activeTabId) ?? null,
		[snap.tabs, snap.activeTabId],
	);

	const archive = activeTab
		? archives.fromJSON(activeTab.session.archiveJson)
		: null;
	const tree = archive ? buildArchiveTree(archive) : [];
	const dirtySet = new Set(activeTab?.dirtyPaths ?? []);

	const openPaths = useMemo(() => {
		const paths = new Set<string>();
		for (const tab of snap.tabs) {
			if (tab.session.openedPath.trim()) {
				paths.add(normalizePath(tab.session.openedPath));
			}
			if (tab.session.vaultFilePath.trim()) {
				paths.add(normalizePath(tab.session.vaultFilePath));
			}
		}
		return paths;
	}, [snap.tabs]);

	useEffect(() => {
		void vault.init();
	}, [vault]);

	useEffect(() => {
		const onKey = (e: globalThis.KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				if (e.shiftKey) void vault.saveAs();
				else void vault.save();
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w") {
				e.preventDefault();
				const tabId = vault.state.activeTabId;
				if (tabId) void vault.closeTab(tabId);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [vault]);

	useEffect(() => {
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			if (!vault.hasUnsaved()) return;
			e.preventDefault();
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [vault]);

	const onTreeKeyDown = (e: KeyboardEvent) => {
		if (e.key === "F2") void vault.renameSelected();
		if (e.key === "Delete") void vault.deleteSelected();
	};

	return (
		<div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 flex flex-col">
			<AppHeader
				vault={vault}
				hasSession={!!activeTab}
				showExportZip={archive?.showSaveAsZipSideButton() ?? false}
				ioLoading={snap.ioLoading}
			/>

			<VaultTabs
				tabs={snap.tabs}
				activeTabId={snap.activeTabId}
				ioLoading={snap.ioLoading}
				onActivate={(id) => void vault.activateTab(id)}
				onClose={(id) => void vault.closeTab(id)}
				onNew={() => void vault.newDocument()}
			/>

			<div className="flex-1 flex min-h-0">
				<RecentFilesSidebar
					entries={recentSnap.entries}
					openPaths={openPaths}
					ioLoading={snap.ioLoading}
					onOpen={(path) => void vault.openPath(path)}
					onRemove={(path) => void recentFiles.remove(path)}
				/>

				<div className="flex-1 flex flex-col min-w-0 min-h-0">
					{!activeTab ? (
						<WelcomePlaceholder />
					) : (
						<EditorWorkspace
							tree={tree}
							selectedPath={activeTab.selectedPath}
							dirtyPaths={dirtySet}
							ioLoading={snap.ioLoading}
							editorTextDisabled={!activeTab.selectedPath || snap.ioLoading}
							onTreeKeyDown={onTreeKeyDown}
							onSelectFile={(p) => vault.selectFile(p)}
							onSelectDir={(segs) => vault.selectDir(segs)}
							onAddFiles={() => void vault.addFiles()}
							onNewFile={() => void vault.newFile()}
							onNewDir={() => void vault.newDir()}
						/>
					)}
				</div>
			</div>

			<DecryptModal
				visible={!!snap.decryptModal}
				hint={snap.decryptModal?.hint ?? null}
				ioLoading={snap.ioLoading}
				onDecrypt={() => void vault.decryptSubmit()}
				onCancel={() => vault.decryptCancel()}
			/>

			<IoLoadingOverlay visible={snap.ioLoading} message={snap.ioLoadingMessage} />

			<PasswordModal
				visible={!!snap.pwModal}
				titleKey={snap.pwModal?.titleKey ?? ""}
				ioLoading={snap.ioLoading}
				onConfirm={() => void vault.pwSubmit()}
				onCancel={() => vault.pwCancel()}
			/>

			<TextPromptModal
				visible={!!snap.textPromptModal}
				titleKey={snap.textPromptModal?.titleKey ?? ""}
				ioLoading={snap.ioLoading}
				onConfirm={() => void vault.textPromptSubmit()}
				onCancel={() => vault.textPromptCancel()}
			/>
		</div>
	);
}
