import { useEffect, type KeyboardEvent } from "react";
import { useSnapshot } from "valtio";
import { VaultArchive } from "@vault/archive";
import { buildArchiveTree } from "@vault/tree";
import { useDi } from "../di/react/hooks/useDi";
import {
	VaultEditorProviderToken,
	type IVaultEditorProvider,
} from "../di/vault-editor/types";
import { AppHeader } from "./components/layout/AppHeader";
import { WelcomePlaceholder } from "./components/layout/WelcomePlaceholder";
import { IoLoadingOverlay } from "./components/layout/IoLoadingOverlay";
import { EditorWorkspace } from "./components/editor-workspace/EditorWorkspace";
import { DecryptModal } from "./components/modals/DecryptModal";
import { PasswordModal } from "./components/modals/PasswordModal";

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
			<AppHeader
				vault={vault}
				hasSession={!!snap.session}
				showExportZip={archive?.showSaveAsZipSideButton() ?? false}
				ioLoading={snap.ioLoading}
			/>

			{!snap.session ? (
				<WelcomePlaceholder />
			) : (
				<EditorWorkspace
					tree={tree}
					selectedPath={snap.selectedPath}
					dirtyPaths={dirtySet}
					ioLoading={snap.ioLoading}
					editorTextDisabled={!snap.selectedPath || snap.ioLoading}
					onTreeKeyDown={onTreeKeyDown}
					onSelectFile={(p) => void vault.selectFile(p)}
					onSelectDir={(segs) => vault.selectDir(segs)}
					onAddFiles={() => void vault.addFiles()}
					onNewFile={() => void vault.newFile()}
					onNewDir={() => void vault.newDir()}
				/>
			)}

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
				title={snap.pwModal?.title ?? ""}
				ioLoading={snap.ioLoading}
				onConfirm={() => void vault.pwSubmit()}
				onCancel={() => vault.pwCancel()}
			/>
		</div>
	);
}
