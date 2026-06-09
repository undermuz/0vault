import { proxy } from "valtio";
import { VaultArchive } from "@vault/archive";
import {
	ArchiveEntryEditTracker,
	flushEditorToArchive,
	textFromBytes,
} from "@vault/editTracker";
import {
	buildArchiveTree,
	firstFilePath,
	folderPrefixForTreeSelection,
	parentDirectoryPrefixOfPath,
} from "@vault/tree";
import {
	baseName,
	defaultZipAgeExportSavePath,
	ensureAgeExtension,
} from "@vault/paths";
import { api } from "../../mainview/electro";
import { base64ToU8, u8ToBase64 } from "../../mainview/bytes";
import type { IVaultEditorProvider } from "./types";

function joinDirFile(dir: string, file: string): string {
	const d = dir.replace(/\\/g, "/").replace(/\/+$/, "");
	const f = file.replace(/^\/+/, "");
	return d ? `${d}/${f}` : f;
}

function fileNameOf(p: string): string {
	const norm = p.replace(/\\/g, "/");
	return norm.split("/").pop() ?? norm;
}

export class VaultEditorProvider implements IVaultEditorProvider {
	private tracker = new ArchiveEntryEditTracker();
	private dirtyRun = 0;
	private ioDepth = 0;

	state = proxy<IVaultEditorProvider["state"]>({
		session: null,
		selectedPath: null,
		treeSelection: null,
		editorText: "",
		ioLoading: false,
		ioLoadingMessage: "",
		dirtyPaths: [],
		decryptModal: null,
		decryptPass: "",
		pwModal: null,
		pw1: "",
		pw2: "",
	});

	private getArchive(): VaultArchive | null {
		const s = this.state.session;
		if (!s) return null;
		return VaultArchive.fromJSON(s.archiveJson);
	}

	private setArchiveInState(a: VaultArchive): void {
		if (!this.state.session) return;
		this.state.session.archiveJson = a.toJSON();
	}

	private async withIo<T>(message: string, fn: () => Promise<T>): Promise<T> {
		this.ioDepth++;
		if (this.ioDepth === 1) {
			this.state.ioLoading = true;
		}
		this.state.ioLoadingMessage = message;
		try {
			return await fn();
		} finally {
			this.ioDepth--;
			if (this.ioDepth === 0) {
				this.state.ioLoading = false;
				this.state.ioLoadingMessage = "";
			}
		}
	}

	async init(): Promise<void> {
		const { path } = await api.startupArgPath();
		if (path && path.trim()) {
			await this.openPath(path.trim());
		}
	}

	async pickAndOpen(): Promise<void> {
		const { paths } = await api.pickOpenFile();
		if (paths[0]) await this.openPath(paths[0]);
	}

	private async applyArchiveSession(
		a: VaultArchive,
		vaultFilePath: string,
		openedPath: string,
		titleSuffix: string,
	): Promise<void> {
		await this.tracker.captureBaseline(a);
		this.state.session = {
			archiveJson: a.toJSON(),
			vaultFilePath,
			openedPath,
			titleBase: `0vault — ${titleSuffix}`,
		};
		const first = firstFilePath(buildArchiveTree(a));
		this.state.selectedPath = first;
		this.state.treeSelection = first ? { kind: "file", path: first } : null;
		this.state.editorText = textFromBytes(first ? a.getBytes(first) : null);
		await this.syncDirty();
		await this.syncWindowTitle();
	}

	async openPath(inputPath: string): Promise<void> {
		const norm = inputPath.replace(/\\/g, "/");
		const lower = norm.toLowerCase();
		const fileName = fileNameOf(norm);

		if (lower.endsWith(".zip")) {
			await this.withIo("Чтение ZIP…", async () => {
				const r = await api.readFileBase64({ path: inputPath });
				if (!r.ok || typeof r.base64 !== "string") {
					await api.showMessageBoxReq({
						type: "error",
						title: "Ошибка",
						message: r.error ?? "Не удалось прочитать ZIP",
					});
					return;
				}
				const bytes = base64ToU8(r.base64);
				const zipBase = baseName(norm);
				const vaultSibling = joinDirFile(
					parentDirectoryPrefixOfPath(norm) || ".",
					`${zipBase}.age`,
				);
				const a = VaultArchive.fromZipBytes(bytes, true);
				await this.applyArchiveSession(
					a,
					vaultSibling,
					inputPath,
					`${fileName} → ${zipBase}.age`,
				);
			});
			return;
		}

		if (lower.endsWith(".age")) {
			const st = await api.fileStat({ path: inputPath });
			if (st.ok && (!st.exists || !st.isFile || st.size === 0)) {
				await this.withIo("Подготовка контейнера…", async () => {
					await this.applyArchiveSession(
						VaultArchive.empty(),
						inputPath,
						inputPath,
						fileName,
					);
				});
				return;
			}
			this.state.decryptModal = { path: inputPath };
			this.state.decryptPass = "";
			return;
		}

		await this.withIo("Чтение файла…", async () => {
			const st = await api.fileStat({ path: inputPath });
			if (!st.ok || !st.exists || !st.isFile) {
				await api.showMessageBoxReq({
					type: "error",
					title: "Ошибка",
					message: `Файл не найден: ${inputPath}`,
				});
				return;
			}
			const r = await api.readFileBase64({ path: inputPath });
			if (!r.ok || typeof r.base64 !== "string") {
				await api.showMessageBoxReq({
					type: "error",
					title: "Ошибка",
					message: r.error ?? "Ошибка чтения",
				});
				return;
			}
			const bytes = base64ToU8(r.base64);
			const plainBase = baseName(norm);
			const vaultSibling = joinDirFile(
				parentDirectoryPrefixOfPath(norm) || ".",
				`${plainBase}.age`,
			);
			const a = VaultArchive.fromPlainFile(fileName, bytes);
			await this.applyArchiveSession(
				a,
				vaultSibling,
				inputPath,
				`${fileName} → ${plainBase}.age`,
			);
		});
	}

	private flushEditor(a: VaultArchive): void {
		flushEditorToArchive(a, this.state.editorText, this.state.selectedPath);
	}

	selectFile(path: string): void {
		const a = this.getArchive();
		if (!a || !this.state.session) return;
		this.flushEditor(a);
		this.state.selectedPath = path;
		this.state.treeSelection = { kind: "file", path };
		this.state.editorText = textFromBytes(a.getBytes(path));
		this.setArchiveInState(a);
		void this.syncDirty();
		void this.syncWindowTitle();
	}

	selectDir(segments: string[]): void {
		this.state.treeSelection = { kind: "dir", segments };
	}

	setEditorText(text: string): void {
		this.state.editorText = text;
		void this.syncDirty();
		void this.syncWindowTitle();
	}

	private async syncDirty(): Promise<void> {
		const run = ++this.dirtyRun;
		const s = this.state.session;
		if (!s) {
			this.state.dirtyPaths = [];
			return;
		}
		const a = VaultArchive.fromJSON(s.archiveJson);
		const ed = new TextEncoder().encode(this.state.editorText);
		const next: string[] = [];
		for (const p of a.entriesView().keys()) {
			if (await this.tracker.isPathDirty(a, p, ed, this.state.selectedPath)) {
				next.push(p);
			}
		}
		if (run !== this.dirtyRun) return;
		this.state.dirtyPaths = next;
	}

	private async syncWindowTitle(): Promise<void> {
		const s = this.state.session;
		if (!s) {
			await api.setWindowTitle({ title: "0vault" });
			return;
		}
		const a = VaultArchive.fromJSON(s.archiveJson);
		const dirty =
			this.state.dirtyPaths.length > 0 || this.tracker.hasDeletedPaths(a);
		await api.setWindowTitle({ title: s.titleBase + (dirty ? " *" : "") });
	}

	async decryptSubmit(): Promise<void> {
		const modal = this.state.decryptModal;
		if (!modal) return;
		const path = modal.path;
		const st = await api.fileStat({ path });
		const pass = this.state.decryptPass;
		const r = await this.withIo("Расшифровка…", () =>
			api.decryptAgeFile({ path, passphrase: pass }),
		);
		if (!r.ok || !r.plainBase64) {
			const retry = await api.showMessageBoxReq({
				type: "question",
				title: "0vault",
				message:
					"Неверный пароль или контейнер не с паролем (scrypt). Попробовать ещё раз?",
				buttons: ["Да", "Нет"],
				defaultId: 0,
				cancelId: 1,
			});
			if (retry.response !== 0) {
				this.state.decryptModal = null;
			} else {
				this.state.decryptModal = { path, hint: r.error };
				this.state.decryptPass = "";
			}
			return;
		}
		const plain = base64ToU8(r.plainBase64);
		if (plain.length === 0 && st.ok && st.size > 0) {
			await api.showMessageBoxReq({
				type: "error",
				title: "Ошибка",
				message:
					"Расшифровка дала пустой результат (неверный пароль или повреждённый контейнер).",
			});
			this.state.decryptModal = null;
			this.state.decryptPass = "";
			return;
		}
		this.state.decryptModal = null;
		this.state.decryptPass = "";
		await this.withIo("Разбор содержимого…", async () => {
			const a = VaultArchive.fromDecryptedPayload(plain);
			await this.applyArchiveSession(a, path, path, fileNameOf(path));
		});
	}

	decryptCancel(): void {
		this.state.decryptModal = null;
		this.state.decryptPass = "";
	}

	private async runSave(targetPath: string, passphrase: string): Promise<void> {
		const s = this.state.session;
		if (!s) return;
		const a = VaultArchive.fromJSON(s.archiveJson);
		this.flushEditor(a);
		const plain = a.toAgePlaintextBytes();
		if (plain.length === 0) {
			await api.showMessageBoxReq({
				type: "warning",
				title: "0vault",
				message: "Данные пусты, сохранение отменено.",
			});
			return;
		}
		await this.withIo("Шифрование и запись…", async () => {
			const r = await api.encryptAgeFile({
				targetPath,
				passphrase,
				plainBase64: u8ToBase64(plain),
			});
			if (r.ok) {
				await this.tracker.captureBaseline(a);
				this.state.session = {
					archiveJson: a.toJSON(),
					vaultFilePath: targetPath,
					openedPath: targetPath,
					titleBase: `VaultEditor — ${fileNameOf(targetPath)}`,
				};
				await api.showMessageBoxReq({
					type: "info",
					title: "Готово",
					message: `Изменения сохранены в:\n${targetPath}`,
				});
				await this.syncDirty();
				await this.syncWindowTitle();
				return;
			}

			const retry = await api.showMessageBoxReq({
				type: "question",
				title: "Сохранение",
				message: `Ошибка: ${r.error ?? ""}\nПовторить ввод пароля?`,
				buttons: ["Да", "Нет"],
				defaultId: 0,
				cancelId: 1,
			});
			if (retry.response === 0) {
				this.state.pwModal = {
					title: "Сохранение",
					mode: "save",
					targetPath,
				};
				this.state.pw1 = "";
				this.state.pw2 = "";
			}
		});
	}

	async save(): Promise<void> {
		const s = this.state.session;
		if (!s || this.state.ioLoading) return;
		const a = VaultArchive.fromJSON(s.archiveJson);
		this.flushEditor(a);

		const plain = a.toAgePlaintextBytes();
		if (plain.length === 0) {
			await api.showMessageBoxReq({
				type: "warning",
				title: "0vault",
				message: "Данные пусты, сохранение отменено.",
			});
			return;
		}

		const dirty = await this.tracker.isAnythingDirty(
			a,
			new TextEncoder().encode(this.state.editorText),
			this.state.selectedPath,
		);
		if (!dirty) {
			await api.showMessageBoxReq({
				type: "info",
				title: "0vault",
				message: "Изменений нет. Файл контейнера не перезаписывался.",
			});
			return;
		}

		this.state.pwModal = {
			title: "Сохранение — пароль для перезаписи контейнера",
			mode: "save",
			targetPath: s.vaultFilePath,
		};
		this.state.pw1 = "";
		this.state.pw2 = "";
	}

	async saveAs(): Promise<void> {
		const s = this.state.session;
		if (!s || this.state.ioLoading) return;
		const a = VaultArchive.fromJSON(s.archiveJson);
		this.flushEditor(a);

		const plain = a.toAgePlaintextBytes();
		if (plain.length === 0) {
			await api.showMessageBoxReq({
				type: "warning",
				title: "0vault",
				message: "Данные пусты, сохранение отменено.",
			});
			return;
		}

		const { paths } = await api.pickFolder();
		if (!paths[0]) return;
		const curName = fileNameOf(s.vaultFilePath) || "vault.age";
		const name = window.prompt("Имя файла (.age)", curName);
		if (!name) return;
		const targetPath = ensureAgeExtension(joinDirFile(paths[0], name.trim()));

		this.state.pwModal = {
			title: "Сохранить как — пароль для нового контейнера",
			mode: "saveAs",
			targetPath,
		};
		this.state.pw1 = "";
		this.state.pw2 = "";
	}

	async exportZipAge(): Promise<void> {
		const s = this.state.session;
		if (!s || this.state.ioLoading) return;
		const a = VaultArchive.fromJSON(s.archiveJson);
		this.flushEditor(a);

		const zipPlain = a.toZipBytes();
		const suggest = defaultZipAgeExportSavePath(s.openedPath);
		const suggestName = fileNameOf(suggest) || "export.zip.age";
		const { paths } = await api.pickFolder();
		if (!paths[0]) return;
		const name = window.prompt("Имя .age файла", suggestName);
		if (!name) return;
		const exportDest = ensureAgeExtension(joinDirFile(paths[0], name.trim()));

		// stash plaintext zip in editorText temporarily? no: just re-derive during pwSubmit
		// Store desired target and mode; recompute zip in pwSubmit
		this.state.pwModal = {
			title: "Экспорт ZIP → age — пароль",
			mode: "exportZipAge",
			targetPath: exportDest,
		};
		this.state.pw1 = "";
		this.state.pw2 = "";
		// cache zipPlain as base64 in session? keep it simple: stash to session? not allowed.
		// We'll store in editorText? unsafe. Keep private field.
		this._pendingZipPlain = zipPlain;
	}

	private _pendingZipPlain: Uint8Array | null = null;

	async pwSubmit(): Promise<void> {
		const modal = this.state.pwModal;
		if (!modal) return;
		if (this.state.pw1 !== this.state.pw2) {
			await api.showMessageBoxReq({
				type: "warning",
				title: modal.title,
				message: "Пароли не совпадают.",
			});
			return;
		}
		const pass = this.state.pw1;
		const target = modal.targetPath;
		const mode = modal.mode;
		this.state.pwModal = null;
		this.state.pw1 = "";
		this.state.pw2 = "";

		if (mode === "exportZipAge") {
			if (!this._pendingZipPlain) return;
			const zipPlain = this._pendingZipPlain;
			this._pendingZipPlain = null;
			await this.withIo("Шифрование ZIP…", async () => {
				const r = await api.encryptAgeFile({
					targetPath: target,
					passphrase: pass,
					plainBase64: u8ToBase64(zipPlain),
				});
				if (r.ok) {
					await api.showMessageBoxReq({
						type: "info",
						title: "Готово",
						message: `ZIP зашифрован и сохранён в:\n${target}`,
					});
				} else {
					await api.showMessageBoxReq({
						type: "error",
						title: "Ошибка",
						message: r.error ?? "Ошибка шифрования",
					});
				}
			});
			return;
		}

		await this.runSave(target, pass);
	}

	pwCancel(): void {
		this.state.pwModal = null;
		this.state.pw1 = "";
		this.state.pw2 = "";
		this._pendingZipPlain = null;
	}

	async addFiles(): Promise<void> {
		const s = this.state.session;
		if (!s) return;
		const a = VaultArchive.fromJSON(s.archiveJson);
		this.flushEditor(a);

		const { paths } = await api.pickOpenMultiple();
		if (!paths.length) return;

		await this.withIo("Чтение файлов…", async () => {
			for (const p of paths) {
				const r = await api.readFileBase64({ path: p });
				if (!r.ok || typeof r.base64 !== "string") continue;
				const fn = fileNameOf(p) || "file.bin";
				const name = a.uniqueName(fn);
				a.putBytes(name, base64ToU8(r.base64));
			}
			this.setArchiveInState(a);
		});
		await this.syncDirty();
		await this.syncWindowTitle();
	}

	async newFile(): Promise<void> {
		const s = this.state.session;
		if (!s) return;
		const a = VaultArchive.fromJSON(s.archiveJson);
		this.flushEditor(a);
		const prefix = folderPrefixForTreeSelection(this.state.treeSelection);
		const input = window.prompt(
			"Имя файла относительно выбранной папки (можно подпуть):",
			"новый.txt",
		);
		if (!input) return;
		const trimmed = input.trim().replace(/\\/g, "/");
		if (!trimmed) return;
		const norm = VaultArchive.normalizeEntryName(trimmed);
		const fullPath = norm.includes("/") ? norm : prefix + norm;
		const key = a.uniqueName(VaultArchive.normalizeEntryName(fullPath));
		a.putBytes(key, new Uint8Array(0));
		this.setArchiveInState(a);
		this.selectFile(key);
	}

	async newDir(): Promise<void> {
		const s = this.state.session;
		if (!s) return;
		const a = VaultArchive.fromJSON(s.archiveJson);
		this.flushEditor(a);
		const prefix = folderPrefixForTreeSelection(this.state.treeSelection);
		const input = window.prompt(
			"Имя каталога (вложенный путь допустим):",
			"Новая папка",
		);
		if (!input) return;
		let trimmed = input.trim().replace(/\\/g, "/");
		if (!trimmed) return;
		let norm = VaultArchive.normalizeEntryName(trimmed);
		while (norm.endsWith("/")) norm = norm.slice(0, -1);
		if (!norm) return;
		const dirPath = VaultArchive.normalizeEntryName(
			norm.includes("/") ? norm : prefix + norm,
		);
		const keeper = VaultArchive.normalizeEntryName(`${dirPath}/.keep`);
		const key = a.uniqueName(keeper);
		a.putBytes(key, new Uint8Array(0));
		this.setArchiveInState(a);
		this.selectFile(key);
	}

	async renameSelected(): Promise<void> {
		if (this.state.selectedPath) await this.renameAt(this.state.selectedPath);
	}

	async renameAt(fromPath: string): Promise<void> {
		const s = this.state.session;
		if (!s) return;
		const a = VaultArchive.fromJSON(s.archiveJson);
		this.flushEditor(a);
		const norm = fromPath.replace(/\\/g, "/");
		const leaf = norm.includes("/") ? norm.slice(norm.lastIndexOf("/") + 1) : norm;
		const input = window.prompt("Новое имя или путь с «/» внутри архива:", leaf);
		if (!input) return;
		const newPath = VaultArchive.resolveRenameTargetPath(fromPath, input);
		if (!newPath || newPath === fromPath) return;
		try {
			a.renameEntry(fromPath, newPath);
		} catch (e) {
			await api.showMessageBoxReq({
				type: "warning",
				title: "Переименование",
				message: e instanceof Error ? e.message : String(e),
			});
			return;
		}
		this.setArchiveInState(a);
		const cur = this.state.selectedPath;
		const prefer =
			fromPath === cur
				? newPath
				: cur && a.entriesView().has(cur)
					? cur
					: newPath;
		this.selectFile(prefer);
	}

	async deleteSelected(): Promise<void> {
		const s = this.state.session;
		const victim = this.state.selectedPath;
		if (!s || !victim) return;
		const a = VaultArchive.fromJSON(s.archiveJson);
		this.flushEditor(a);
		if (a.entriesView().size <= 1) {
			await api.showMessageBoxReq({
				type: "info",
				title: "Удаление",
				message: "Нельзя удалить последний файл в архиве.",
			});
			return;
		}
		const conf = await api.showMessageBoxReq({
			type: "question",
			title: "Удаление",
			message: `Удалить файл «${victim}»?`,
			buttons: ["Да", "Нет"],
			defaultId: 1,
			cancelId: 1,
		});
		if (conf.response !== 0) return;
		a.removePath(victim);
		this.setArchiveInState(a);
		const prefer = firstFilePath(buildArchiveTree(a));
		if (prefer) this.selectFile(prefer);
		else {
			this.state.selectedPath = null;
			this.state.treeSelection = null;
			this.state.editorText = "";
		}
		await this.syncDirty();
		await this.syncWindowTitle();
	}
}

