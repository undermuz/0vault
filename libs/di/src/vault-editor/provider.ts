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
} from "@libs/utils/vault/editTracker";
import {
	buildArchiveTree,
	firstFilePath,
	folderPrefixForTreeSelection,
	parentDirectoryPrefixOfPath,
} from "@libs/utils/vault/tree";
import {
	baseName,
	defaultZipAgeExportSavePath,
	ensureAgeExtension,
} from "@libs/utils/vault/paths";
import { base64ToU8, u8ToBase64 } from "@libs/utils/bytes";
import {
	VaultPlatformApiToken,
	type IVaultPlatformApi,
} from "../platform/types";
import { I18nProvider, type I18nService } from "../i18n/types";
import {
	RecentFilesProviderToken,
	type IRecentFilesProvider,
} from "../recent-files/types";
import type { IVaultEditorProvider, TextPromptMode, VaultTab } from "./types";

function joinDirFile(dir: string, file: string): string {
	const d = dir.replace(/\\/g, "/").replace(/\/+$/, "");
	const f = file.replace(/^\/+/, "");
	return d ? `${d}/${f}` : f;
}

function fileNameOf(p: string): string {
	const norm = p.replace(/\\/g, "/");
	return norm.split("/").pop() ?? norm;
}

function newTabId(): string {
	return crypto.randomUUID();
}

@injectable()
export class VaultEditorProvider implements IVaultEditorProvider {
	constructor(
		@inject(I18nProvider) private readonly i18n: I18nService,
		@inject(VaultArchiveFactoryToken)
		private readonly archives: IVaultArchiveFactory,
		@inject(RecentFilesProviderToken)
		private readonly recentFiles: IRecentFilesProvider,
		@inject(VaultPlatformApiToken)
		private readonly platformApi: IVaultPlatformApi,
	) {}

	private trackers = new Map<string, ArchiveEntryEditTracker>();
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
		tabs: [],
		activeTabId: null,
		ioLoading: false,
		ioLoadingMessage: "",
		decryptModal: null,
		decryptPass: "",
		pwModal: null,
		pw1: "",
		pw2: "",
		textPromptModal: null,
		promptInput: "",
	});

	private getActiveTab(): VaultTab | null {
		const id = this.state.activeTabId;
		if (!id) return null;
		return this.state.tabs.find((tab) => tab.id === id) ?? null;
	}

	private getTracker(tabId: string): ArchiveEntryEditTracker {
		let tracker = this.trackers.get(tabId);
		if (!tracker) {
			tracker = new ArchiveEntryEditTracker();
			this.trackers.set(tabId, tracker);
		}
		return tracker;
	}

	private tabLabel(
		vaultFilePath: string,
		titleSuffix: string,
		isNew: boolean,
	): string {
		if (isNew) return this.t("document.untitled");
		return fileNameOf(vaultFilePath) || titleSuffix;
	}

	private getTabArchive(tab: VaultTab): IVaultArchive {
		return this.archives.fromJSON(tab.session.archiveJson);
	}

	private setTabArchiveInState(tab: VaultTab, a: IVaultArchive): void {
		tab.session.archiveJson = a.toJSON();
	}

	private flushTabEditor(tab: VaultTab): void {
		const a = this.getTabArchive(tab);
		flushEditorToArchive(a, tab.editorText, tab.selectedPath);
		this.setTabArchiveInState(tab, a);
	}

	private openTextPrompt(
		mode: TextPromptMode,
		titleKey: string,
		defaultValue: string,
		extra: { folderPath?: string; renameFromPath?: string } = {},
	): void {
		this.state.textPromptModal = { mode, titleKey, ...extra };
		this.state.promptInput = defaultValue;
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

	private tabHasUnsaved(tab: VaultTab): boolean {
		const tracker = this.trackers.get(tab.id);
		if (!tracker) return tab.session.isNew || tab.dirtyPaths.length > 0;
		const a = this.getTabArchive(tab);
		return (
			tab.session.isNew ||
			tab.dirtyPaths.length > 0 ||
			tracker.hasDeletedPaths(a)
		);
	}

	private updateGlobalUnsavedFlag(): void {
		this.unsavedFlag = this.state.tabs.some((tab) => this.tabHasUnsaved(tab));
		this.syncUnsavedToBun();
	}

	private syncUnsavedToBun(): void {
		void this.platformApi.setUnsavedFlag({ hasUnsaved: this.unsavedFlag });
	}

	private async syncDirtyForTab(tab: VaultTab): Promise<void> {
		const run = ++this.dirtyRun;
		const tracker = this.getTracker(tab.id);
		const a = this.getTabArchive(tab);
		const ed = new TextEncoder().encode(tab.editorText);
		const next: string[] = [];
		for (const p of a.entriesView().keys()) {
			if (await tracker.isPathDirty(a, p, ed, tab.selectedPath)) {
				next.push(p);
			}
		}
		if (run !== this.dirtyRun) return;
		tab.dirtyPaths = next;
		this.updateGlobalUnsavedFlag();
	}

	private async flushAndSyncActiveTab(): Promise<void> {
		const tab = this.getActiveTab();
		if (!tab) return;
		this.flushTabEditor(tab);
		await this.syncDirtyForTab(tab);
	}

	private async syncWindowTitle(): Promise<void> {
		const tab = this.getActiveTab();
		if (!tab) {
			this.updateGlobalUnsavedFlag();
			await this.platformApi.setWindowTitle({ title: this.t("app.name") });
			return;
		}
		await this.syncDirtyForTab(tab);
		const dirty = this.tabHasUnsaved(tab);
		await this.platformApi.setWindowTitle({
			title: tab.session.titleBase + (dirty ? " *" : ""),
		});
	}

	private async confirmDiscardTab(tab: VaultTab): Promise<boolean> {
		this.flushTabEditor(tab);
		await this.syncDirtyForTab(tab);
		if (!this.tabHasUnsaved(tab)) return true;
		const r = await this.platformApi.showMessageBoxReq({
			type: "question",
			title: this.t("dialogs.unsaved.title"),
			message: this.t("dialogs.unsaved.tabMessage", { name: tab.label }),
			buttons: [this.t("dialogs.unsaved.discard"), this.t("common.cancel")],
			defaultId: 1,
			cancelId: 1,
		});
		return r.response === 0;
	}

	private async createTabFromArchive(
		a: IVaultArchive,
		vaultFilePath: string,
		openedPath: string,
		titleSuffix: string,
		isNew = false,
	): Promise<string> {
		const id = newTabId();
		const tracker = new ArchiveEntryEditTracker();
		await tracker.captureBaseline(a);
		this.trackers.set(id, tracker);

		const first = firstFilePath(buildArchiveTree(a));
		const tab: VaultTab = {
			id,
			label: this.tabLabel(vaultFilePath, titleSuffix, isNew),
			session: {
				archiveJson: a.toJSON(),
				vaultFilePath,
				openedPath,
				titleBase: this.t("window.title", {
					name: this.t("app.name"),
					suffix: titleSuffix,
				}),
				isNew,
			},
			selectedPath: first,
			treeSelection: first ? { kind: "file", path: first } : null,
			editorText: textFromBytes(first ? a.getBytes(first) : null),
			dirtyPaths: [],
		};

		await this.flushAndSyncActiveTab();
		this.state.tabs = [...this.state.tabs, tab];
		this.state.activeTabId = id;
		if (openedPath.trim()) {
			void this.recentFiles.recordOpen(openedPath);
		}
		await this.syncWindowTitle();
		return id;
	}

	async init(): Promise<void> {
		const { path } = await this.platformApi.startupArgPath();
		if (path && path.trim()) {
			await this.openPath(path.trim());
		}
	}

	hasUnsaved(): boolean {
		return this.unsavedFlag;
	}

	async newDocument(): Promise<void> {
		const a = this.archives.empty();
		await this.createTabFromArchive(
			a,
			"",
			"",
			this.t("document.untitled"),
			true,
		);
	}

	async pickAndOpen(): Promise<void> {
		const { paths } = await this.platformApi.pickOpenFile();
		if (paths[0]) await this.openPath(paths[0]);
	}

	async openPath(inputPath: string): Promise<void> {
		const norm = inputPath.replace(/\\/g, "/");
		const lower = norm.toLowerCase();
		const fileName = fileNameOf(norm);

		if (lower.endsWith(".zip")) {
			await this.withIo(this.t("io.readingZip"), async () => {
				const r = await this.platformApi.readFileBase64({ path: inputPath });
				if (!r.ok || typeof r.base64 !== "string") {
					await this.platformApi.showMessageBoxReq({
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
				await this.createTabFromArchive(
					a,
					vaultSibling,
					inputPath,
					`${fileName} → ${zipBase}.age`,
				);
			});
			return;
		}

		if (lower.endsWith(".age")) {
			const st = await this.platformApi.fileStat({ path: inputPath });
			if (st.ok && (!st.exists || !st.isFile || st.size === 0)) {
				await this.withIo(this.t("io.preparingContainer"), async () => {
					await this.createTabFromArchive(
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
			const st = await this.platformApi.fileStat({ path: inputPath });
			if (!st.ok || !st.exists || !st.isFile) {
				await this.platformApi.showMessageBoxReq({
					type: "error",
					title: this.t("common.error"),
					message: this.t("errors.fileNotFound", { path: inputPath }),
				});
				return;
			}
			const r = await this.platformApi.readFileBase64({ path: inputPath });
			if (!r.ok || typeof r.base64 !== "string") {
				await this.platformApi.showMessageBoxReq({
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
			await this.createTabFromArchive(
				a,
				vaultSibling,
				inputPath,
				`${fileName} → ${plainBase}.age`,
			);
		});
	}

	async activateTab(tabId: string): Promise<void> {
		if (tabId === this.state.activeTabId) return;
		if (!this.state.tabs.some((tab) => tab.id === tabId)) return;
		await this.flushAndSyncActiveTab();
		this.state.activeTabId = tabId;
		await this.syncWindowTitle();
	}

	async closeTab(tabId: string): Promise<void> {
		const tab = this.state.tabs.find((t) => t.id === tabId);
		if (!tab) return;

		if (tabId === this.state.activeTabId) {
			await this.flushAndSyncActiveTab();
		} else {
			this.flushTabEditor(tab);
			await this.syncDirtyForTab(tab);
		}

		if (!(await this.confirmDiscardTab(tab))) return;

		const idx = this.state.tabs.findIndex((t) => t.id === tabId);
		this.trackers.delete(tabId);
		const nextTabs = this.state.tabs.filter((t) => t.id !== tabId);
		this.state.tabs = nextTabs;

		if (this.state.activeTabId === tabId) {
			const next = nextTabs[idx] ?? nextTabs[idx - 1] ?? null;
			this.state.activeTabId = next?.id ?? null;
		}

		await this.syncWindowTitle();
	}

	selectFile(path: string): void {
		const tab = this.getActiveTab();
		if (!tab) return;
		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);
		tab.selectedPath = path;
		tab.treeSelection = { kind: "file", path };
		tab.editorText = textFromBytes(a.getBytes(path));
		void this.syncDirtyForTab(tab);
		void this.syncWindowTitle();
	}

	selectDir(segments: string[]): void {
		const tab = this.getActiveTab();
		if (!tab) return;
		tab.treeSelection = { kind: "dir", segments };
	}

	setEditorText(text: string): void {
		const tab = this.getActiveTab();
		if (!tab) return;
		tab.editorText = text;
		void this.syncDirtyForTab(tab);
		void this.syncWindowTitle();
	}

	async decryptSubmit(): Promise<void> {
		const modal = this.state.decryptModal;
		if (!modal) return;
		const path = modal.path;
		const st = await this.platformApi.fileStat({ path });
		const pass = this.state.decryptPass;
		const r = await this.withIo(this.t("io.decrypting"), () =>
			this.platformApi.decryptAgeFile({ path, passphrase: pass }),
		);
		if (!r.ok || !r.plainBase64) {
			const retry = await this.platformApi.showMessageBoxReq({
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
			await this.platformApi.showMessageBoxReq({
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
			await this.createTabFromArchive(a, path, path, fileNameOf(path));
		});
	}

	decryptCancel(): void {
		this.state.decryptModal = null;
		this.state.decryptPass = "";
	}

	private async runSave(targetPath: string, passphrase: string): Promise<void> {
		const tab = this.getActiveTab();
		if (!tab) return;
		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);
		const plain = a.toAgePlaintextBytes();
		if (plain.length === 0) {
			await this.platformApi.showMessageBoxReq({
				type: "warning",
				title: this.t("app.name"),
				message: this.t("dialogs.save.emptyData"),
			});
			return;
		}
		await this.withIo(this.t("io.encryptingAndWriting"), async () => {
			const r = await this.platformApi.encryptAgeFile({
				targetPath,
				passphrase,
				plainBase64: u8ToBase64(plain),
			});
			if (r.ok) {
				const tracker = this.getTracker(tab.id);
				await tracker.captureBaseline(a);
				tab.session = {
					archiveJson: a.toJSON(),
					vaultFilePath: targetPath,
					openedPath: targetPath,
					titleBase: this.t("window.title", {
						name: this.t("app.name"),
						suffix: fileNameOf(targetPath),
					}),
					isNew: false,
				};
				tab.label = this.tabLabel(targetPath, fileNameOf(targetPath), false);
				void this.recentFiles.recordOpen(targetPath);
				await this.platformApi.showMessageBoxReq({
					type: "info",
					title: this.t("common.done"),
					message: this.t("dialogs.save.savedTo", { path: targetPath }),
				});
				await this.syncDirtyForTab(tab);
				await this.syncWindowTitle();
				return;
			}

			const retry = await this.platformApi.showMessageBoxReq({
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
		const tab = this.getActiveTab();
		if (!tab || this.state.ioLoading) return;

		if (tab.session.isNew) {
			await this.saveAs();
			return;
		}

		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);
		const tracker = this.getTracker(tab.id);

		const plain = a.toAgePlaintextBytes();
		if (plain.length === 0) {
			await this.platformApi.showMessageBoxReq({
				type: "warning",
				title: this.t("app.name"),
				message: this.t("dialogs.save.emptyData"),
			});
			return;
		}

		const dirty = await tracker.isAnythingDirty(
			a,
			new TextEncoder().encode(tab.editorText),
			tab.selectedPath,
		);
		if (!dirty) {
			await this.platformApi.showMessageBoxReq({
				type: "info",
				title: this.t("app.name"),
				message: this.t("dialogs.save.noChanges"),
			});
			return;
		}

		this.state.pwModal = {
			titleKey: "dialogs.save.overwritePassphrase",
			mode: "save",
			targetPath: tab.session.vaultFilePath,
		};
		this.state.pw1 = "";
		this.state.pw2 = "";
	}

	async saveAs(): Promise<void> {
		const tab = this.getActiveTab();
		if (!tab || this.state.ioLoading) return;
		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);

		const plain = a.toAgePlaintextBytes();
		if (plain.length === 0) {
			await this.platformApi.showMessageBoxReq({
				type: "warning",
				title: this.t("app.name"),
				message: this.t("dialogs.save.emptyData"),
			});
			return;
		}

		const { paths } = await this.platformApi.pickFolder();
		if (!paths[0]) return;
		const curName =
			fileNameOf(tab.session.vaultFilePath) ||
			(tab.session.isNew ? this.t("document.untitledFile") : "vault.age");
		this.openTextPrompt("saveAs", "dialogs.prompts.ageFileName", curName, {
			folderPath: paths[0],
		});
	}

	async exportZipAge(): Promise<void> {
		const tab = this.getActiveTab();
		if (!tab || this.state.ioLoading) return;
		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);

		const zipPlain = a.toZipBytes();
		const suggest = defaultZipAgeExportSavePath(tab.session.openedPath);
		const suggestName = fileNameOf(suggest) || "export.zip.age";
		const { paths } = await this.platformApi.pickFolder();
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
			await this.platformApi.showMessageBoxReq({
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
				const r = await this.platformApi.encryptAgeFile({
					targetPath: target,
					passphrase: pass,
					plainBase64: u8ToBase64(zipPlain),
				});
				if (r.ok) {
					await this.platformApi.showMessageBoxReq({
						type: "info",
						title: this.t("common.done"),
						message: this.t("dialogs.save.zipSavedTo", { path: target }),
					});
				} else {
					await this.platformApi.showMessageBoxReq({
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

		const tab = this.getActiveTab();
		if (!tab) return;
		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);

		if (mode === "newFile") {
			const prefix = folderPrefixForTreeSelection(tab.treeSelection);
			const trimmed = input.replace(/\\/g, "/");
			const norm = this.archives.normalizeEntryName(trimmed);
			const fullPath = norm.includes("/") ? norm : prefix + norm;
			const key = a.uniqueName(this.archives.normalizeEntryName(fullPath));
			a.putBytes(key, new Uint8Array(0));
			this.setTabArchiveInState(tab, a);
			this.selectFile(key);
			return;
		}

		if (mode === "newDir") {
			const prefix = folderPrefixForTreeSelection(tab.treeSelection);
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
			this.setTabArchiveInState(tab, a);
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
				await this.platformApi.showMessageBoxReq({
					type: "warning",
					title: this.t("dialogs.rename.title"),
					message,
				});
				return;
			}
			this.setTabArchiveInState(tab, a);
			const cur = tab.selectedPath;
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
		const tab = this.getActiveTab();
		if (!tab) return;
		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);

		const { paths } = await this.platformApi.pickOpenMultiple();
		if (!paths.length) return;

		await this.withIo(this.t("io.readingFiles"), async () => {
			for (const p of paths) {
				const r = await this.platformApi.readFileBase64({ path: p });
				if (!r.ok || typeof r.base64 !== "string") continue;
				const fn = fileNameOf(p) || "file.bin";
				const name = a.uniqueName(fn);
				a.putBytes(name, base64ToU8(r.base64));
			}
			this.setTabArchiveInState(tab, a);
		});
		await this.syncDirtyForTab(tab);
		await this.syncWindowTitle();
	}

	async newFile(): Promise<void> {
		const tab = this.getActiveTab();
		if (!tab) return;
		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);
		this.setTabArchiveInState(tab, a);
		this.openTextPrompt(
			"newFile",
			"dialogs.prompts.newFileName",
			this.t("dialogs.prompts.newFileDefault"),
		);
	}

	async newDir(): Promise<void> {
		const tab = this.getActiveTab();
		if (!tab) return;
		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);
		this.setTabArchiveInState(tab, a);
		this.openTextPrompt(
			"newDir",
			"dialogs.prompts.newDirName",
			this.t("dialogs.prompts.newDirDefault"),
		);
	}

	async renameSelected(): Promise<void> {
		const tab = this.getActiveTab();
		if (tab?.selectedPath) await this.renameAt(tab.selectedPath);
	}

	async renameAt(fromPath: string): Promise<void> {
		const tab = this.getActiveTab();
		if (!tab) return;
		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);
		this.setTabArchiveInState(tab, a);
		const norm = fromPath.replace(/\\/g, "/");
		const leaf = norm.includes("/") ? norm.slice(norm.lastIndexOf("/") + 1) : norm;
		this.openTextPrompt("rename", "dialogs.prompts.rename", leaf, {
			renameFromPath: fromPath,
		});
	}

	async deleteSelected(): Promise<void> {
		const tab = this.getActiveTab();
		const victim = tab?.selectedPath;
		if (!tab || !victim) return;
		const a = this.getTabArchive(tab);
		this.flushTabEditor(tab);
		if (a.entriesView().size <= 1) {
			await this.platformApi.showMessageBoxReq({
				type: "info",
				title: this.t("dialogs.delete.title"),
				message: this.t("dialogs.delete.lastFile"),
			});
			return;
		}
		const conf = await this.platformApi.showMessageBoxReq({
			type: "question",
			title: this.t("dialogs.delete.title"),
			message: this.t("dialogs.delete.confirm", { name: victim }),
			buttons: this.yesNoButtons(),
			defaultId: 1,
			cancelId: 1,
		});
		if (conf.response !== 0) return;
		a.removePath(victim);
		this.setTabArchiveInState(tab, a);
		const prefer = firstFilePath(buildArchiveTree(a));
		if (prefer) this.selectFile(prefer);
		else {
			tab.selectedPath = null;
			tab.treeSelection = null;
			tab.editorText = "";
		}
		await this.syncDirtyForTab(tab);
		await this.syncWindowTitle();
	}
}
