type StoredFile = {
	path: string;
	file?: File;
	bytes?: Uint8Array;
	handle?: FileSystemFileHandle;
};

type StoredDir = {
	path: string;
	handle: FileSystemDirectoryHandle;
};

function normalizePath(path: string): string {
	return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function splitPath(path: string): { dirPath: string; fileName: string } {
	const norm = normalizePath(path);
	const slash = norm.lastIndexOf("/");
	if (slash < 0) return { dirPath: "", fileName: norm };
	return { dirPath: norm.slice(0, slash), fileName: norm.slice(slash + 1) };
}

export class BrowserFileStore {
	private readonly files = new Map<string, StoredFile>();
	private readonly dirs = new Map<string, StoredDir>();

	registerFile(path: string, file: File, handle?: FileSystemFileHandle): string {
		const norm = normalizePath(path || file.name);
		this.files.set(norm, { path: norm, file, handle });
		return norm;
	}

	registerDir(path: string, handle: FileSystemDirectoryHandle): string {
		const norm = normalizePath(path || handle.name);
		this.dirs.set(norm, { path: norm, handle });
		return norm;
	}

	markVirtualFile(path: string): string {
		const norm = normalizePath(path);
		if (!this.files.has(norm)) {
			this.files.set(norm, { path: norm });
		}
		return norm;
	}

	async getBytes(path: string): Promise<Uint8Array | null> {
		const norm = normalizePath(path);
		const entry = this.files.get(norm);
		if (!entry) return null;
		if (entry.bytes) return entry.bytes;
		if (entry.file) {
			const ab = await entry.file.arrayBuffer();
			entry.bytes = new Uint8Array(ab);
			return entry.bytes;
		}
		if (entry.handle) {
			const file = await entry.handle.getFile();
			entry.file = file;
			const ab = await file.arrayBuffer();
			entry.bytes = new Uint8Array(ab);
			return entry.bytes;
		}
		return null;
	}

	stat(path: string): {
		ok: boolean;
		exists: boolean;
		isFile: boolean;
		size: number;
	} {
		const norm = normalizePath(path);
		const entry = this.files.get(norm);
		if (entry) {
			const size = entry.bytes?.length ?? entry.file?.size ?? 0;
			const hasContent = Boolean(entry.file || entry.bytes || entry.handle);
			return { ok: true, exists: hasContent, isFile: true, size };
		}
		if (this.dirs.has(norm)) {
			return { ok: true, exists: true, isFile: false, size: 0 };
		}
		return { ok: true, exists: false, isFile: false, size: 0 };
	}

	async writeBytes(path: string, bytes: Uint8Array): Promise<void> {
		const norm = normalizePath(path);
		const { dirPath, fileName } = splitPath(norm);
		const entry = this.files.get(norm);

		if (entry?.handle) {
			const writable = await entry.handle.createWritable();
			await writable.write(bytes);
			await writable.close();
			entry.bytes = bytes;
			entry.file = new File([bytes], fileName, { type: "application/octet-stream" });
			return;
		}

		const dir = this.dirs.get(dirPath);
		if (dir) {
			const fileHandle = await dir.handle.getFileHandle(fileName, {
				create: true,
			});
			const writable = await fileHandle.createWritable();
			await writable.write(bytes);
			await writable.close();
			this.files.set(norm, {
				path: norm,
				bytes,
				handle: fileHandle,
				file: new File([bytes], fileName, { type: "application/octet-stream" }),
			});
			return;
		}

		if ("showSaveFilePicker" in window) {
			const handle = await window.showSaveFilePicker({
				suggestedName: fileName,
				types: [
					{
						description: "AGE vault",
						accept: { "application/octet-stream": [".age"] },
					},
				],
			});
			const writable = await handle.createWritable();
			await writable.write(bytes);
			await writable.close();
			this.files.set(norm, {
				path: norm,
				bytes,
				handle,
				file: new File([bytes], fileName, { type: "application/octet-stream" }),
			});
			return;
		}

		const blob = new Blob([bytes], { type: "application/octet-stream" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = fileName;
		anchor.click();
		URL.revokeObjectURL(url);
		this.files.set(norm, {
			path: norm,
			bytes,
			file: new File([bytes], fileName, { type: "application/octet-stream" }),
		});
	}
}

export const browserFileStore = new BrowserFileStore();
