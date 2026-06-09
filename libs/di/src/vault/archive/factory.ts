import { inject, injectable } from "inversify";
import { VaultArchive } from "./archive";
import {
	looksLikeZip,
	normalizeEntryName,
	resolveRenameTargetPath,
	safeEntryName,
} from "./archive-utils";
import type {
	IVaultArchive,
	IVaultArchiveFactory,
	VaultArchiveJson,
} from "./types";

@injectable()
export class VaultArchiveFactory implements IVaultArchiveFactory {
	constructor(
		@inject("Factory<VaultArchive>")
		private readonly createArchive: () => VaultArchive | Promise<VaultArchive>,
	) {}

	private spawn(): VaultArchive {
		const archive = this.createArchive();
		if (archive instanceof Promise) {
			throw new Error("VaultArchive resolution must be synchronous");
		}
		return archive;
	}

	empty(): IVaultArchive {
		const archive = this.spawn();
		archive.configureEmpty();
		return archive;
	}

	fromJSON(j: VaultArchiveJson): IVaultArchive {
		const archive = this.spawn();
		archive.configureFromJSON(j);
		return archive;
	}

	fromDecryptedPayload(plain: Uint8Array): IVaultArchive {
		const archive = this.spawn();
		archive.configureFromDecryptedPayload(plain);
		return archive;
	}

	fromZipBytes(zipBytes: Uint8Array, zipSource: boolean): IVaultArchive {
		const archive = this.spawn();
		archive.configureFromZipBytes(zipBytes, zipSource);
		return archive;
	}

	fromPlainFile(fileName: string, bytes: Uint8Array): IVaultArchive {
		const archive = this.spawn();
		archive.configureFromPlainFile(fileName, bytes);
		return archive;
	}

	clone(archive: IVaultArchive): IVaultArchive {
		return this.fromJSON(archive.toJSON());
	}

	looksLikeZip(b: Uint8Array | null | undefined): boolean {
		return looksLikeZip(b);
	}

	normalizeEntryName(name: string | null): string {
		return normalizeEntryName(name);
	}

	safeEntryName(name: string): string {
		return safeEntryName(name);
	}

	resolveRenameTargetPath(
		fromPath: string,
		newNameInput: string | null,
	): string | null {
		return resolveRenameTargetPath(fromPath, newNameInput);
	}
}
