import type {
	IVaultArchive,
	VaultArchiveJson,
} from "@libs/utils/vault/archive-types";

export type { IVaultArchive, VaultArchiveJson };

export const VaultArchiveToken = Symbol.for("VaultArchive");
export const VaultArchiveFactoryToken = Symbol.for("VaultArchiveFactory");

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
