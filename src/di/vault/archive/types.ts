export const VaultArchiveToken = Symbol.for("VaultArchive");
export const VaultArchiveFactoryToken = Symbol.for("VaultArchiveFactory");

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

export interface IVaultArchiveFactory {
	empty(): IVaultArchive;
	fromJSON(j: VaultArchiveJson): IVaultArchive;
	fromDecryptedPayload(plain: Uint8Array): IVaultArchive;
	fromZipBytes(zipBytes: Uint8Array, zipSource: boolean): IVaultArchive;
	fromPlainFile(fileName: string, bytes: Uint8Array): IVaultArchive;
	clone(archive: IVaultArchive): IVaultArchive;
	looksLikeZip(b: Uint8Array | null | undefined): boolean;
	normalizeEntryName(name: string | null): string;
	safeEntryName(name: string): string;
	resolveRenameTargetPath(
		fromPath: string,
		newNameInput: string | null,
	): string | null;
}
