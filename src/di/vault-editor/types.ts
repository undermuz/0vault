export const VaultEditorProviderToken = Symbol.for("VaultEditorProvider");

export interface IVaultEditorProvider {
	state: {
		session: null | {
			/** Serialized snapshot to keep Valtio state plain */
			archiveJson: {
				zipSource: boolean;
				entries: { path: string; data64: string }[];
			};
			vaultFilePath: string;
			openedPath: string;
			titleBase: string;
		};
		selectedPath: string | null;
		treeSelection:
			| { kind: "file"; path: string }
			| { kind: "dir"; segments: string[] }
			| null;
		editorText: string;
		/** Диск / расшифровка / шифрование — полноэкранный loader */
		ioLoading: boolean;
		ioLoadingMessage: string;
		dirtyPaths: string[];
		decryptModal: null | { path: string; hint?: string };
		decryptPass: string;
		pwModal:
			| null
			| {
					title: string;
					mode: "save" | "saveAs" | "exportZipAge";
					targetPath: string;
			  };
		pw1: string;
		pw2: string;
	};

	init(): Promise<void>;
	pickAndOpen(): Promise<void>;
	openPath(inputPath: string): Promise<void>;

	setEditorText(text: string): Promise<void>;
	selectFile(path: string): Promise<void>;
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
}

