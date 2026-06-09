import { inject, injectable } from "inversify";
import { proxy } from "valtio";
import { ArchiveError } from "../vault/archive";
import {
	VaultArchiveFactoryToken,
	type IVaultArchive,
	type IVaultArchiveFactory,
} from "../vault/archive";
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
import { I18nProvider, type I18nService } from "../i18n/types";
import type { IVaultEditorProvider, TextPromptMode } from "./types";

function joinDirFile(dir: string, file: string): string {
	const d = dir.replace(/\\/g, "/").replace(/\/+$/, "");
	const f = file.replace(/^\/+/, "");
	return d ? `${d}/${f}` : f;
}

function fileNameOf(p: string): string {
	const norm = p.replace(/\\/g, "/");
	return norm.split("/").pop() ?? norm;
}

@injectable()
export class VaultEditorProvider implements IVaultEditorProvider {
	constructor(
		@inject(I18nProvider) private readonly i18n: I18nService,
		@inject(VaultArchiveFactoryToken)
		private readonly archives: IVaultArchiveFactory,
	) {}

	private tracker = new ArchiveEntryEditTracker();
	private dirtyRun = 0;
	private ioDepth = 0;
	private unsavedFlag = false;

	private t(key: string, options?: Record<string, unknown>): string {
		return this.i18n.t(key, options);
	}

	private yesNoButtons(): [string, string] {
		return [this.t("common.yes"), this.t("common.no")];
	}

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
		textPromptModal: null,
		promptInput: "",
	});

	private openTextPrompt(
		mode: TextPromptMode,
		titleKey: string,
		defaultValue: string,
		extra: { folderPath?: string; renameFromPath?: string } = {},
	): void {
		this.state.textPromptModal = { mode, titleKey, ...extra };
		this.state.promptInput = defaultValue;
	}

	private getArchive(): IVaultArchive | null {
		const s = this.state.session;
		if (!s) return null;
		return this.archives.fromJSON(s.archiveJson);
	}

	private setArchiveInState(a: IVaultArchive): void {
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
			await this.openPath(path.trim(), { skipUnsavedCheck: true });
		}
	}

	hasUnsaved(): boolean {
		return this.unsavedFlag;
	}

	private async confirmDiscardUnsaved(): Promise<boolean> {
		await this.syncDirty();
		if (!this.unsavedFlag) return true;
		const r = await api.showMessageBoxReq({
			type: "question",
			title: this.t("dialogs.unsaved.title"),
			message: this.t("dialogs.unsaved.message"),
			buttons: [this.t("dialogs.unsaved.discard"), this.t("common.cancel")],
			defaultId: 1,
			cancelId: 1,
		});
		return r.response === 0;
	}

	private updateUnsavedFlag(): void {
		const s = this.state.session;
		if (!s) {
			this.unsavedFlag = false;
			return;
		}
		const a = this.archives.fromJSON(s.archiveJson);
		this.unsavedFlag =
			s.isNew ||
			this.state.dirtyPaths.length > 0 ||
			this.tracker.hasDeletedPaths(a);
	}

	private syncUnsavedToBun(): void {
		void api.setUnsavedFlag({ hasUnsaved: this.unsavedFlag });
	}

	async newDocument(): Promise<void> {
		if (!(await this.confirmDiscardUnsaved())) return;
		const a = this.archives.empty();
		await this.applyArchiveSession(
			a,
			"",
			"",
			this.t("document.untitled"),
			true,
		);
	}

	async pickAndOpen(): Promise<void> {
		if (!(await this.confirmDiscardUnsaved())) return;
		const { paths } = await api.pickOpenFile();
		if (paths[0]) await this.openPath(paths[0], { skipUnsavedCheck: true });
	}

	private async applyArchiveSession(
		a: IVaultArchive,
		vaultFilePath: string,
		openedPath: string,
		titleSuffix: string,
		isNew = false,
	): Promise<void> {
		await this.tracker.captureBaseline(a);
		this.state.session = {
			archiveJson: a.toJSON(),
			vaultFilePath,
			openedPath,
			titleBase: this.t("window.title", {
				name: this.t("app.name"),
				suffix: titleSuffix,
			}),
			isNew,
		};
		const first = firstFilePath(buildArchiveTree(a));
		this.state.selectedPath = first;
		this.state.treeSelection = first ? { kind: "file", path: first } : null;
		this.state.editorText = textFromBytes(first ? a.getBytes(first) : null);
		await this.syncDirty();
		await this.syncWindowTitle();
	}

	async openPath(
		inputPath: string,
		opts: { skipUnsavedCheck?: boolean } = {},
	): Promise<void> {
		if (!opts.skipUnsavedCheck && !(await this.confirmDiscardUnsaved())) return;
		const norm = inputPath.replace(/\\/g, "/");
		const lower = norm.toLowerCase();
		const fileName = fileNameOf(norm);

		if (lower.endsWith(".zip")) {
			await this.withIo(this.t("io.readingZip"), async () => {
				const r = await api.readFileBase64({ path: inputPath });
				if (!r.ok || typeof r.base64 !== "string") {
					await api.showMessageBoxReq({
						type: "error",
						title: this.t("common.error"),
						message: r.error ?? this.t("errors.readZipFailed"),
					});
					return;
				}
				const bytes = base64ToU8(r.base64);
				const zipBase = baseName(norm);
				const vaultSibling = joinDirFile(
					parentDirectoryPrefixOfPath(norm) || ".",
					`${zipBase}.age`,
				);
				const a = this.archives.fromZipBytes(bytes, true);
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
				await this.withIo(this.t("io.preparingContainer"), async () => {
					await this.applyArchiveSession(
						this.archives.empty(),
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

		await this.withIo(this.t("io.readingFile"), async () => {
			const st = await api.fileStat({ path: inputPath });
			if (!st.ok || !st.exists || !st.isFile) {
				await api.showMessageBoxReq({
					type: "error",
					title: this.t("common.error"),
					message: this.t("errors.fileNotFound", { path: inputPath }),
				});
				return;
			}
			const r = await api.readFileBase64({ path: inputPath });
			if (!r.ok || typeof r.base64 !== "string") {
				await api.showMessageBoxReq({
					type: "error",
					title: this.t("common.error"),
					message: r.error ?? this.t("errors.readFailed"),
				});
				return;
			}
			const bytes = base64ToU8(r.base64);
			const plainBase = baseName(norm);
			const vaultSibling = joinDirFile(
				parentDirectoryPrefixOfPath(norm) || ".",
				`${plainBase}.age`,
			);
			const a = this.archives.fromPlainFile(fileName, bytes);
			await this.applyArchiveSession(
				a,
				vaultSibling,
				inputPath,
				`${fileName} → ${plainBase}.age`,
			);
		});
	}

	private flushEditor(a: IVaultArchive): void {
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
		const a = this.archives.fromJSON(s.archiveJson);
		const ed = new TextEncoder().encode(this.state.editorText);
		const next: string[] = [];
		for (const p of a.entriesView().keys()) {
			if (await this.tracker.isPathDirty(a, p, ed, this.state.selectedPath)) {
				next.push(p);
			}
		}
		if (run !== this.dirtyRun) return;
		this.state.dirtyPaths = next;
		this.updateUnsavedFlag();
		this.syncUnsavedToBun();
	}

	private async syncWindowTitle(): Promise<void> {
		const s = this.state.session;
		if (!s) {
			this.unsavedFlag = false;
			this.syncUnsavedToBun();
			await api.setWindowTitle({ title: this.t("app.name") });
			return;
		}
		this.updateUnsavedFlag();
		this.syncUnsavedToBun();
		await api.setWindowTitle({
			title: s.titleBase + (this.unsavedFlag ? " *" : ""),
		});
	}

	async decryptSubmit(): Promise<void> {
		const modal = this.state.decryptModal;
		if (!modal) return;
		const path = modal.path;
		const st = await api.fileStat({ path });
		const pass = this.state.decryptPass;
		const r = await this.withIo(this.t("io.decrypting"), () =>
			api.decryptAgeFile({ path, passphrase: pass }),
		);
		if (!r.ok || !r.plainBase64) {
			const retry = await api.showMessageBoxReq({
				type: "question",
				title: this.t("app.name"),
				message: this.t("dialogs.decryptRetry.message"),
				buttons: this.yesNoButtons(),
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
				title: this.t("common.error"),
				message: this.t("errors.decryptEmpty"),
			});
			this.state.decryptModal = null;
			this.state.decryptPass = "";
			return;
		}
		this.state.decryptModal = null;
		this.state.decryptPass = "";
		await this.withIo(this.t("io.parsingContent"), async () => {
			const a = this.archives.fromDecryptedPayload(plain);
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
		const a = this.archives.fromJSON(s.archiveJson);
		this.flushEditor(a);
		const plain = a.toAgePlaintextBytes();
		if (plain.length === 0) {
			await api.showMessageBoxReq({
				type: "warning",
				title: this.t("app.name"),
				message: this.t("dialogs.save.emptyData"),
			});
			return;
		}
		await this.withIo(this.t("io.encryptingAndWriting"), async () => {
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
					titleBase: this.t("window.title", {
						name: this.t("app.name"),
						suffix: fileNameOf(targetPath),
					}),
					isNew: false,
				};
				await api.showMessageBoxReq({
					type: "info",
					title: this.t("common.done"),
					message: this.t("dialogs.save.savedTo", { path: targetPath }),
				});
				await this.syncDirty();
				await this.syncWindowTitle();
				return;
			}

			const retry = await api.showMessageBoxReq({
				type: "question",
				title: this.t("dialogs.save.title"),
				message: this.t("dialogs.save.errorRetry", { error: r.error ?? "" }),
				buttons: this.yesNoButtons(),
				defaultId: 0,
				cancelId: 1,
			});
			if (retry.response === 0) {
				this.state.pwModal = {
					titleKey: "dialogs.save.title",
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

		if (s.isNew) {
			await this.saveAs();
			return;
		}

		const a = this.archives.fromJSON(s.archiveJson);
		this.flushEditor(a);

		const plain = a.toAgePlaintextBytes();
		if (plain.length === 0) {
			await api.showMessageBoxReq({
				type: "warning",
				title: this.t("app.name"),
				message: this.t("dialogs.save.emptyData"),
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
				title: this.t("app.name"),
				message: this.t("dialogs.save.noChanges"),
			});
			return;
		}

		this.state.pwModal = {
			titleKey: "dialogs.save.overwritePassphrase",
			mode: "save",
			targetPath: s.vaultFilePath,
		};
		this.state.pw1 = "";
		this.state.pw2 = "";
	}

	async saveAs(): Promise<void> {
		const s = this.state.session;
		if (!s || this.state.ioLoading) return;
		const a = this.archives.fromJSON(s.archiveJson);
		this.flushEditor(a);

		const plain = a.toAgePlaintextBytes();
		if (plain.length === 0) {
			await api.showMessageBoxReq({
				type: "warning",
				title: this.t("app.name"),
				message: this.t("dialogs.save.emptyData"),
			});
			return;
		}

		const { paths } = await api.pickFolder();
		if (!paths[0]) return;
		const curName =
			fileNameOf(s.vaultFilePath) ||
			(s.isNew ? this.t("document.untitledFile") : "vault.age");
		this.openTextPrompt("saveAs", "dialogs.prompts.ageFileName", curName, {
			folderPath: paths[0],
		});
	}

	async exportZipAge(): Promise<void> {
		const s = this.state.session;
		if (!s || this.state.ioLoading) return;
		const a = this.archives.fromJSON(s.archiveJson);
		this.flushEditor(a);

		const zipPlain = a.toZipBytes();
		const suggest = defaultZipAgeExportSavePath(s.openedPath);
		const suggestName = fileNameOf(suggest) || "export.zip.age";
		const { paths } = await api.pickFolder();
		if (!paths[0]) return;
		this._pendingZipPlain = zipPlain;
		this.openTextPrompt(
			"exportZipAge",
			"dialogs.prompts.ageExportFileName",
			suggestName,
			{ folderPath: paths[0] },
		);
	}

	private _pendingZipPlain: Uint8Array | null = null;

	async pwSubmit(): Promise<void> {
		const modal = this.state.pwModal;
		if (!modal) return;
		if (this.state.pw1 !== this.state.pw2) {
			await api.showMessageBoxReq({
				type: "warning",
				title: this.t(modal.titleKey),
				message: this.t("errors.passwordMismatch"),
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
			await this.withIo(this.t("io.encryptingZip"), async () => {
				const r = await api.encryptAgeFile({
					targetPath: target,
					passphrase: pass,
					plainBase64: u8ToBase64(zipPlain),
				});
				if (r.ok) {
					await api.showMessageBoxReq({
						type: "info",
						title: this.t("common.done"),
						message: this.t("dialogs.save.zipSavedTo", { path: target }),
					});
				} else {
					await api.showMessageBoxReq({
						type: "error",
						title: this.t("common.error"),
						message: r.error ?? this.t("errors.encryptFailed"),
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

	async textPromptSubmit(): Promise<void> {
		const modal = this.state.textPromptModal;
		if (!modal) return;
		const input = this.state.promptInput.trim();
		if (!input) return;

		const mode = modal.mode;
		this.state.textPromptModal = null;
		this.state.promptInput = "";

		if (mode === "saveAs") {
			if (!modal.folderPath) return;
			const targetPath = ensureAgeExtension(
				joinDirFile(modal.folderPath, input),
			);
			this.state.pwModal = {
				titleKey: "dialogs.save.saveAsPassphrase",
				mode: "saveAs",
				targetPath,
			};
			this.state.pw1 = "";
			this.state.pw2 = "";
			return;
		}

		if (mode === "exportZipAge") {
			if (!modal.folderPath) return;
			const exportDest = ensureAgeExtension(joinDirFile(modal.folderPath, input));
			this.state.pwModal = {
				titleKey: "dialogs.save.exportZipPassphrase",
				mode: "exportZipAge",
				targetPath: exportDest,
			};
			this.state.pw1 = "";
			this.state.pw2 = "";
			return;
		}

		const s = this.state.session;
		if (!s) return;
		const a = this.archives.fromJSON(s.archiveJson);
		this.flushEditor(a);

		if (mode === "newFile") {
			const prefix = folderPrefixForTreeSelection(this.state.treeSelection);
			const trimmed = input.replace(/\\/g, "/");
			const norm = this.archives.normalizeEntryName(trimmed);
			const fullPath = norm.includes("/") ? norm : prefix + norm;
			const key = a.uniqueName(this.archives.normalizeEntryName(fullPath));
			a.putBytes(key, new Uint8Array(0));
			this.setArchiveInState(a);
			this.selectFile(key);
			return;
		}

		if (mode === "newDir") {
			const prefix = folderPrefixForTreeSelection(this.state.treeSelection);
			let trimmed = input.replace(/\\/g, "/");
			let norm = this.archives.normalizeEntryName(trimmed);
			while (norm.endsWith("/")) norm = norm.slice(0, -1);
			if (!norm) return;
			const dirPath = this.archives.normalizeEntryName(
				norm.includes("/") ? norm : prefix + norm,
			);
			const keeper = this.archives.normalizeEntryName(`${dirPath}/.keep`);
			const key = a.uniqueName(keeper);
			a.putBytes(key, new Uint8Array(0));
			this.setArchiveInState(a);
			this.selectFile(key);
			return;
		}

		if (mode === "rename") {
			const fromPath = modal.renameFromPath;
			if (!fromPath) return;
			const newPath = this.archives.resolveRenameTargetPath(fromPath, input);
			if (!newPath || newPath === fromPath) return;
			try {
				a.renameEntry(fromPath, newPath);
			} catch (e) {
				const message =
					e instanceof ArchiveError
						? this.t(e.key, e.params)
						: e instanceof Error
							? e.message
							: String(e);
				await api.showMessageBoxReq({
					type: "warning",
					title: this.t("dialogs.rename.title"),
					message,
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
	}

	textPromptCancel(): void {
		const wasExport = this.state.textPromptModal?.mode === "exportZipAge";
		this.state.textPromptModal = null;
		this.state.promptInput = "";
		if (wasExport) {
			this._pendingZipPlain = null;
		}
	}

	async addFiles(): Promise<void> {
		const s = this.state.session;
		if (!s) return;
		const a = this.archives.fromJSON(s.archiveJson);
		this.flushEditor(a);

		const { paths } = await api.pickOpenMultiple();
		if (!paths.length) return;

		await this.withIo(this.t("io.readingFiles"), async () => {
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
		const a = this.archives.fromJSON(s.archiveJson);
		this.flushEditor(a);
		this.setArchiveInState(a);
		this.openTextPrompt(
			"newFile",
			"dialogs.prompts.newFileName",
			this.t("dialogs.prompts.newFileDefault"),
		);
	}

	async newDir(): Promise<void> {
		const s = this.state.session;
		if (!s) return;
		const a = this.archives.fromJSON(s.archiveJson);
		this.flushEditor(a);
		this.setArchiveInState(a);
		this.openTextPrompt(
			"newDir",
			"dialogs.prompts.newDirName",
			this.t("dialogs.prompts.newDirDefault"),
		);
	}

	async renameSelected(): Promise<void> {
		if (this.state.selectedPath) await this.renameAt(this.state.selectedPath);
	}

	async renameAt(fromPath: string): Promise<void> {
		const s = this.state.session;
		if (!s) return;
		const a = this.archives.fromJSON(s.archiveJson);
		this.flushEditor(a);
		this.setArchiveInState(a);
		const norm = fromPath.replace(/\\/g, "/");
		const leaf = norm.includes("/") ? norm.slice(norm.lastIndexOf("/") + 1) : norm;
		this.openTextPrompt("rename", "dialogs.prompts.rename", leaf, {
			renameFromPath: fromPath,
		});
	}

	async deleteSelected(): Promise<void> {
		const s = this.state.session;
		const victim = this.state.selectedPath;
		if (!s || !victim) return;
		const a = this.archives.fromJSON(s.archiveJson);
		this.flushEditor(a);
		if (a.entriesView().size <= 1) {
			await api.showMessageBoxReq({
				type: "info",
				title: this.t("dialogs.delete.title"),
				message: this.t("dialogs.delete.lastFile"),
			});
			return;
		}
		const conf = await api.showMessageBoxReq({
			type: "question",
			title: this.t("dialogs.delete.title"),
			message: this.t("dialogs.delete.confirm", { name: victim }),
			buttons: this.yesNoButtons(),
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

