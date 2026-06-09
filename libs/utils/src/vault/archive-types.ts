export type VaultArchiveJson = {
	zipSource: boolean;
	entries: readonly { path: string; data64: string }[];
};

export interface IVaultArchive {
	readonly isZipSource: boolean;
	showSaveAsZipSideButton(): boolean;
	useZipForAgePayload(): boolean;
	toAgePlaintextBytes(): Uint8Array;
	toZipBytes(): Uint8Array;
	entriesView(): ReadonlyMap<string, Uint8Array>;
	sortedPaths(): string[];
	getBytes(path: string): Uint8Array | null;
	putBytes(path: string, data: Uint8Array): void;
	removePath(path: string): void;
	renameEntry(from: string, toPath: string): void;
	uniqueName(desired: string): string;
	toJSON(): VaultArchiveJson;
}
