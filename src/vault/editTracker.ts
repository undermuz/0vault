import type { IVaultArchive } from "../di/vault/archive";

async function sha256(data: Uint8Array): Promise<Uint8Array> {
	const copy = new Uint8Array(data.length);
	copy.set(data);
	const buf = await crypto.subtle.digest("SHA-256", copy);
	return new Uint8Array(buf);
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}

/** Tracks dirty state vs last saved/open baseline (same idea as Java ArchiveEntryEditTracker). */
export class ArchiveEntryEditTracker {
	private baselineHashes = new Map<string, Uint8Array>();
	private baselinePaths = new Set<string>();

	async captureBaseline(archive: IVaultArchive): Promise<void> {
		this.baselineHashes.clear();
		this.baselinePaths.clear();
		for (const path of archive.entriesView().keys()) {
			const raw = archive.getBytes(path);
			if (!raw) continue;
			this.baselineHashes.set(path, await sha256(raw));
			this.baselinePaths.add(path);
		}
	}

	hasDeletedPaths(archive: IVaultArchive): boolean {
		for (const p of this.baselinePaths) {
			if (!archive.entriesView().has(p)) return true;
		}
		return false;
	}

	async isPathDirty(
		archive: IVaultArchive,
		path: string | null,
		editorTextUtf8: Uint8Array,
		selectedPath: string | null,
	): Promise<boolean> {
		if (path == null) return false;
		let contentBytes: Uint8Array;
		if (path === selectedPath) {
			contentBytes = editorTextUtf8;
		} else {
			const b = archive.getBytes(path);
			if (!b) return false;
			contentBytes = b;
		}
		return this.isContentDirtyComparedToBaseline(path, contentBytes);
	}

	async isContentDirtyComparedToBaseline(
		path: string,
		contentBytes: Uint8Array,
	): Promise<boolean> {
		const h = await sha256(contentBytes);
		const base = this.baselineHashes.get(path);
		if (!base) return true;
		return !equalBytes(h, base);
	}

	async isAnythingDirty(
		archive: IVaultArchive,
		editorTextUtf8: Uint8Array,
		selectedPath: string | null,
	): Promise<boolean> {
		if (this.hasDeletedPaths(archive)) return true;
		for (const p of archive.entriesView().keys()) {
			if (await this.isPathDirty(archive, p, editorTextUtf8, selectedPath)) {
				return true;
			}
		}
		return false;
	}
}

export function textFromBytes(b: Uint8Array | null): string {
	if (!b || b.length === 0) return "";
	return new TextDecoder().decode(b);
}

export function flushEditorToArchive(
	archive: IVaultArchive,
	text: string,
	path: string | null,
): void {
	if (path != null) {
		archive.putBytes(path, new TextEncoder().encode(text));
	}
}
