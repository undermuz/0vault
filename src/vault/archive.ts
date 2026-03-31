import { unzipSync, zipSync, type Zippable } from "fflate";

/** Plaintext inside .age: either raw single blob or ZIP bytes. Compatible with Java VaultArchive. */
export class VaultArchive {
	private readonly entries = new Map<string, Uint8Array>();
	private zipSource: boolean;

	private constructor(zipSource: boolean) {
		this.zipSource = zipSource;
	}

	static empty(): VaultArchive {
		const a = new VaultArchive(false);
		a.entries.set("content.txt", new Uint8Array(0));
		return a;
	}

	static looksLikeZip(b: Uint8Array | null | undefined): boolean {
		if (!b || b.length < 4) return false;
		return (
			b[0] === 0x50 &&
			b[1] === 0x4b &&
			(b[2] === 3 || b[2] === 5 || b[2] === 7) &&
			(b[3] === 4 || b[3] === 6 || b[3] === 8)
		);
	}

	static fromDecryptedPayload(plain: Uint8Array): VaultArchive {
		if (VaultArchive.looksLikeZip(plain)) {
			const a = new VaultArchive(true);
			a.loadFromZipBytes(plain);
			if (a.entries.size === 0) {
				a.entries.set("content.txt", new Uint8Array(0));
			}
			return a;
		}
		const a = new VaultArchive(false);
		a.entries.set("content.txt", new Uint8Array(plain));
		return a;
	}

	static fromZipBytes(zipBytes: Uint8Array, zipSource: boolean): VaultArchive {
		const a = new VaultArchive(zipSource);
		a.loadFromZipBytes(zipBytes);
		return a;
	}

	private loadFromZipBytes(zipBytes: Uint8Array): void {
		this.entries.clear();
		const files = unzipSync(zipBytes);
		for (const [name, data] of Object.entries(files)) {
			if (name.endsWith("/")) continue;
			const n = VaultArchive.normalizeEntryName(name);
			if (n.length === 0) continue;
			this.entries.set(n, new Uint8Array(data));
		}
	}

	get isZipSource(): boolean {
		return this.zipSource;
	}

	/** Single-file non-zip — show "save as zip" affordance like Java. */
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

	/**
	 * ZIP entry order matches Java LinkedHashMap iteration (insertion order).
	 * mtime fixed for stable hashing (Java ZipEntry.setTime(0)); fflate requires 1980–2099.
	 */
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
			throw new Error(`Нет записи: ${from}`);
		}
		const to = VaultArchive.normalizeEntryName(toPath.replace(/\\/g, "/"));
		if (to.length === 0) throw new Error("Пустое имя");
		if (from === to) return;
		if (this.entries.has(to)) throw new Error(`Уже есть файл: ${to}`);
		const data = this.entries.get(from)!;
		this.entries.delete(from);
		this.entries.set(to, data);
	}

	static resolveRenameTargetPath(
		fromPath: string,
		newNameInput: string | null,
	): string | null {
		if (newNameInput == null) return null;
		const trimmed = newNameInput.trim();
		if (trimmed.length === 0) return null;
		const normIn = VaultArchive.normalizeEntryName(trimmed.replace(/\\/g, "/"));
		if (normIn.includes("/")) return normIn;
		const fromNorm = fromPath.replace(/\\/g, "/");
		const slash = fromNorm.lastIndexOf("/");
		const parent = slash >= 0 ? fromNorm.slice(0, slash + 1) : "";
		return parent + normIn;
	}

	uniqueName(desired: string): string {
		const base = VaultArchive.safeEntryName(desired);
		if (!this.entries.has(base)) return base;
		const dot = base.lastIndexOf(".");
		const stem = dot > 0 ? base.slice(0, dot) : base;
		const ext = dot > 0 ? base.slice(dot) : "";
		for (let i = 1; ; i++) {
			const candidate = `${stem}_${i}${ext}`;
			if (!this.entries.has(candidate)) return candidate;
		}
	}

	static normalizeEntryName(name: string | null): string {
		if (name == null) return "";
		let n = name.replace(/\\/g, "/").trim();
		while (n.startsWith("/")) n = n.slice(1);
		if (n.includes("..")) n = n.replace(/\.\./g, "_");
		return n;
	}

	static safeEntryName(name: string): string {
		let n = name.replace(/\\/g, "/");
		const slash = n.lastIndexOf("/");
		if (slash >= 0) n = n.slice(slash + 1);
		if (n.trim().length === 0) return "file.bin";
		return VaultArchive.normalizeEntryName(n);
	}

	/** Serialize snapshot for RPC (preserves Map insertion order like Java). */
	toJSON(): { zipSource: boolean; entries: { path: string; data64: string }[] } {
		const entries: { path: string; data64: string }[] = [];
		for (const [path, u8] of this.entries) {
			let bin = "";
			for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!);
			entries.push({ path, data64: btoa(bin) });
		}
		return { zipSource: this.zipSource, entries };
	}

	static fromJSON(j: {
		zipSource: boolean;
		entries: readonly { path: string; data64: string }[];
	}): VaultArchive {
		const a = new VaultArchive(j.zipSource);
		a.entries.clear();
		for (const { path, data64 } of j.entries) {
			const bin = atob(data64);
			const u8 = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
			a.entries.set(path, u8);
		}
		return a;
	}

	static fromPlainFile(fileName: string, bytes: Uint8Array): VaultArchive {
		const a = new VaultArchive(false);
		const name = VaultArchive.safeEntryName(fileName);
		a.entries.set(name, new Uint8Array(bytes));
		return a;
	}

	clone(): VaultArchive {
		return VaultArchive.fromJSON(this.toJSON());
	}
}
