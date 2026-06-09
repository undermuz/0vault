import { injectable } from "inversify";
import { unzipSync, zipSync, type Zippable } from "fflate";
import { ArchiveError } from "./archive-error";
import {
	looksLikeZip,
	normalizeEntryName,
	safeEntryName,
} from "./archive-utils";
import type { IVaultArchive, VaultArchiveJson } from "./types";

/** Plaintext inside .age: either raw single blob or ZIP bytes. Compatible with Java VaultArchive. */
@injectable()
export class VaultArchive implements IVaultArchive {
	private entries = new Map<string, Uint8Array>();
	private zipSource = false;

	configureEmpty(): void {
		this.zipSource = false;
		this.entries.clear();
		this.entries.set("content.txt", new Uint8Array(0));
	}

	configureFromJSON(j: VaultArchiveJson): void {
		this.zipSource = j.zipSource;
		this.entries.clear();
		for (const { path, data64 } of j.entries) {
			const bin = atob(data64);
			const u8 = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
			this.entries.set(path, u8);
		}
	}

	configureFromDecryptedPayload(plain: Uint8Array): void {
		if (looksLikeZip(plain)) {
			this.zipSource = true;
			this.loadFromZipBytes(plain);
			if (this.entries.size === 0) {
				this.entries.set("content.txt", new Uint8Array(0));
			}
			return;
		}
		this.zipSource = false;
		this.entries.clear();
		this.entries.set("content.txt", new Uint8Array(plain));
	}

	configureFromZipBytes(zipBytes: Uint8Array, zipSource: boolean): void {
		this.zipSource = zipSource;
		this.loadFromZipBytes(zipBytes);
	}

	configureFromPlainFile(fileName: string, bytes: Uint8Array): void {
		this.zipSource = false;
		this.entries.clear();
		const name = safeEntryName(fileName);
		this.entries.set(name, new Uint8Array(bytes));
	}

	private loadFromZipBytes(zipBytes: Uint8Array): void {
		this.entries.clear();
		const files = unzipSync(zipBytes);
		for (const [name, data] of Object.entries(files)) {
			if (name.endsWith("/")) continue;
			const n = normalizeEntryName(name);
			if (n.length === 0) continue;
			this.entries.set(n, new Uint8Array(data));
		}
	}

	get isZipSource(): boolean {
		return this.zipSource;
	}

	showSaveAsZipSideButton(): boolean {
		return !this.zipSource && this.entries.size === 1;
	}

	useZipForAgePayload(): boolean {
		if (this.zipSource) return true;
		return this.entries.size !== 1;
	}

	toAgePlaintextBytes(): Uint8Array {
		if (this.useZipForAgePayload()) {
			return this.toZipBytes();
		}
		const first = this.entries.keys().next().value as string;
		return new Uint8Array(this.entries.get(first)!);
	}

	toZipBytes(): Uint8Array {
		const mtime = new Date(1980, 0, 1);
		const z: Zippable = {};
		for (const [path, data] of this.entries) {
			z[path] = [new Uint8Array(data), { mtime }];
		}
		return zipSync(z);
	}

	entriesView(): ReadonlyMap<string, Uint8Array> {
		return this.entries;
	}

	sortedPaths(): string[] {
		return [...this.entries.keys()].sort();
	}

	getBytes(path: string): Uint8Array | null {
		const b = this.entries.get(path);
		return b ? new Uint8Array(b) : null;
	}

	putBytes(path: string, data: Uint8Array): void {
		this.entries.set(path, new Uint8Array(data));
	}

	removePath(path: string): void {
		this.entries.delete(path);
	}

	renameEntry(from: string, toPath: string): void {
		if (!this.entries.has(from)) {
			throw new ArchiveError("archive.errors.noEntry", { path: from });
		}
		const to = normalizeEntryName(toPath.replace(/\\/g, "/"));
		if (to.length === 0) throw new ArchiveError("archive.errors.emptyName");
		if (from === to) return;
		if (this.entries.has(to)) {
			throw new ArchiveError("archive.errors.duplicate", { path: to });
		}
		const data = this.entries.get(from)!;
		this.entries.delete(from);
		this.entries.set(to, data);
	}

	uniqueName(desired: string): string {
		const base = safeEntryName(desired);
		if (!this.entries.has(base)) return base;
		const dot = base.lastIndexOf(".");
		const stem = dot > 0 ? base.slice(0, dot) : base;
		const ext = dot > 0 ? base.slice(dot) : "";
		for (let i = 1; ; i++) {
			const candidate = `${stem}_${i}${ext}`;
			if (!this.entries.has(candidate)) return candidate;
		}
	}

	toJSON(): VaultArchiveJson {
		const entries: { path: string; data64: string }[] = [];
		for (const [path, u8] of this.entries) {
			let bin = "";
			for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!);
			entries.push({ path, data64: btoa(bin) });
		}
		return { zipSource: this.zipSource, entries };
	}
}
