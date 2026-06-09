import type { VaultArchiveJson } from "../vault/archive";

export const VaultEditorProviderToken = Symbol.for("VaultEditorProvider");

export type TextPromptMode =
	| "saveAs"
	| "exportZipAge"
	| "newFile"
	| "newDir"
	| "rename";

export type VaultTabSession = {
	/** Serialized snapshot to keep Valtio state plain */
	archiveJson: VaultArchiveJson;
	vaultFilePath: string;
	openedPath: string;
	titleBase: string;
	/** Never saved to disk (shows * in title; Save opens Save As). */
	isNew: boolean;
};

export type VaultTab = {
	id: string;
	label: string;
	session: VaultTabSession;
	selectedPath: string | null;
	treeSelection:
		| { kind: "file"; path: string }
		| { kind: "dir"; segments: string[] }
		| null;
	editorText: string;
	dirtyPaths: string[];
};

export interface IVaultEditorProvider {
	state: {
		tabs: VaultTab[];
		activeTabId: string | null;
		/** Диск / расшифровка / шифрование — полноэкранный loader */
		ioLoading: boolean;
		ioLoadingMessage: string;
		decryptModal: null | { path: string; hint?: string };
		decryptPass: string;
		pwModal:
			| null
			| {
					titleKey: string;
					mode: "save" | "saveAs" | "exportZipAge";
					targetPath: string;
			  };
		pw1: string;
		pw2: string;
		textPromptModal:
			| null
			| {
					mode: TextPromptMode;
					titleKey: string;
					folderPath?: string;
					renameFromPath?: string;
			  };
		promptInput: string;
	};

	init(): Promise<void>;
	hasUnsaved(): boolean;
	newDocument(): Promise<void>;
	pickAndOpen(): Promise<void>;
	openPath(inputPath: string): Promise<void>;

	activateTab(tabId: string): Promise<void>;
	closeTab(tabId: string): Promise<void>;

	setEditorText(text: string): void;
	selectFile(path: string): void;
	selectDir(segments: string[]): void;

	addFiles(): Promise<void>;
	newFile(): Promise<void>;
	newDir(): Promise<void>;
	renameSelected(): Promise<void>;
	renameAt(path: string): Promise<void>;
	deleteSelected(): Promise<void>;

	save(): Promise<void>;
	saveAs(): Promise<void>;
	exportZipAge(): Promise<void>;

	decryptSubmit(): Promise<void>;
	decryptCancel(): void;
	pwSubmit(): Promise<void>;
	pwCancel(): void;
	textPromptSubmit(): Promise<void>;
	textPromptCancel(): void;
}
