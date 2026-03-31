import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";
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
	type TreeBranch,
	type TreeSelection,
} from "@vault/tree";
import {
	baseName,
	defaultZipAgeExportSavePath,
	ensureAgeExtension,
} from "@vault/paths";
import { api } from "./electro";
import { base64ToU8, u8ToBase64 } from "./bytes";

type Session = {
	archive: VaultArchive;
	vaultFilePath: string;
	openedPath: string;
	titleBase: string;
};

function joinDirFile(dir: string, file: string): string {
	const d = dir.replace(/\\/g, "/").replace(/\/+$/, "");
	const f = file.replace(/^\/+/, "");
	return d ? `${d}/${f}` : f;
}

function TreeRow(props: {
	branches: TreeBranch[];
	level: number;
	selectedPath: string | null;
	dirtyPaths: Set<string>;
	onSelectFile: (path: string) => void;
	onSelectDir: (segments: string[]) => void;
	parentSegments: string[];
}): JSX.Element {
	const {
		branches,
		level,
		selectedPath,
		dirtyPaths,
		onSelectFile,
		onSelectDir,
		parentSegments,
	} = props;
	return (
		<ul className={level === 0 ? "tree-root" : "pl-3 border-l border-zinc-600/50"}>
			{branches.map((br, i) => {
				if (br.node.kind === "dir") {
					const segs = [...parentSegments, br.node.name];
					return (
						<li key={`d-${segs.join("/")}-${i}`} className="py-0.5">
							<button
								type="button"
								className="text-left w-full rounded px-1 hover:bg-zinc-700/80 text-zinc-300"
								onClick={() => onSelectDir(segs)}
							>
								{br.node.name}/
							</button>
							<TreeRow
								branches={br.children}
								level={level + 1}
								selectedPath={selectedPath}
								dirtyPaths={dirtyPaths}
								onSelectFile={onSelectFile}
								onSelectDir={onSelectDir}
								parentSegments={segs}
							/>
						</li>
					);
				}
				const path = br.node.path;
				const leaf = path.replace(/\\/g, "/").split("/").pop() ?? path;
				const dirty = dirtyPaths.has(path);
				const sel = selectedPath === path;
				return (
					<li key={path} className="py-0.5">
						<button
							type="button"
							className={`text-left w-full rounded px-1 font-mono text-sm ${
								sel
									? "bg-emerald-900/50 text-emerald-100"
									: "hover:bg-zinc-700/80 text-zinc-200"
							}`}
							onClick={() => onSelectFile(path)}
							onDoubleClick={() => {
								onSelectFile(path);
								renameFileRef.current?.(path);
							}}
						>
							{leaf}
							{dirty ? " *" : ""}
						</button>
					</li>
				);
			})}
		</ul>
	);
}

const renameFileRef = { current: null as null | ((path: string) => void) };

export default function App() {
	const [session, setSession] = useState<Session | null>(null);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [treeSelection, setTreeSelection] = useState<TreeSelection>(null);
	const [editorText, setEditorText] = useState("");
	const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set());
	const [busy, setBusy] = useState(false);

	const trackerRef = useRef(new ArchiveEntryEditTracker());
	const [decryptModal, setDecryptModal] = useState<{
		path: string;
		hint?: string;
	} | null>(null);
	const [decryptPass, setDecryptPass] = useState("");
	const [twoPartModal, setTwoPartModal] = useState<{
		title: string;
		onSubmit: (p: string) => void;
	} | null>(null);
	const [pw1, setPw1] = useState("");
	const [pw2, setPw2] = useState("");

	const archive = session?.archive ?? null;

	const syncDirty = useCallback(async () => {
		const a = session?.archive;
		if (!a) {
			setDirtyPaths(new Set());
			return;
		}
		const enc = new TextEncoder();
		const ed = enc.encode(editorText);
		const next = new Set<string>();
		for (const p of a.entriesView().keys()) {
			if (await trackerRef.current.isPathDirty(a, p, ed, selectedPath)) {
				next.add(p);
			}
		}
		setDirtyPaths(next);
	}, [session, editorText, selectedPath]);

	useEffect(() => {
		void syncDirty();
	}, [syncDirty]);

	const titleDirty = dirtyPaths.size > 0 || (archive && trackerRef.current.hasDeletedPaths(archive));

	useEffect(() => {
		if (!session) {
			void api.setWindowTitle({ title: "VaultEditor" });
			return;
		}
		const t = session.titleBase + (titleDirty ? " *" : "");
		void api.setWindowTitle({ title: t });
	}, [session, titleDirty]);

	const applyArchiveSession = useCallback(
		async (
			a: VaultArchive,
			vaultFilePath: string,
			openedPath: string,
			titleSuffix: string,
		) => {
			await trackerRef.current.captureBaseline(a);
			const titleBase = `VaultEditor — ${titleSuffix}`;
			setSession({ archive: a, vaultFilePath, openedPath, titleBase });
			const first = firstFilePath(buildArchiveTree(a));
			setSelectedPath(first);
			setTreeSelection(first ? { kind: "file", path: first } : null);
			setEditorText(textFromBytes(first ? a.getBytes(first) : null));
		},
		[],
	);

	const openPath = useCallback(
		async (inputPath: string) => {
			const norm = inputPath.replace(/\\/g, "/");
			const lower = norm.toLowerCase();
			const fileName = norm.split("/").pop() ?? norm;

			if (lower.endsWith(".zip")) {
				const r = await api.readFileBase64({ path: inputPath });
				if (!r.ok || !r.base64) {
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
				await applyArchiveSession(
					a,
					vaultSibling,
					inputPath,
					`${fileName} → ${zipBase}.age`,
				);
				return;
			}

			if (lower.endsWith(".age")) {
				const st = await api.fileStat({ path: inputPath });
				if (st.ok && (!st.exists || !st.isFile || st.size === 0)) {
					const empty = VaultArchive.empty();
					await applyArchiveSession(empty, inputPath, inputPath, fileName);
					return;
				}
				setDecryptModal({ path: inputPath });
				return;
			}

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
			if (!r.ok || !r.base64) {
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
			await applyArchiveSession(
				a,
				vaultSibling,
				inputPath,
				`${fileName} → ${plainBase}.age`,
			);
		},
		[applyArchiveSession],
	);

	const finishDecrypt = useCallback(
		async (pass: string) => {
			if (!decryptModal) return;
			const path = decryptModal.path;
			const st = await api.fileStat({ path });
			const r = await api.decryptAgeFile({ path, passphrase: pass });
			if (!r.ok || !r.plainBase64) {
				const retry = await api.showMessageBoxReq({
					type: "question",
					title: "VaultEditor",
					message: "Неверный пароль или контейнер не с паролем (scrypt). Попробовать ещё раз?",
					buttons: ["Да", "Нет"],
					defaultId: 0,
					cancelId: 1,
				});
				if (retry.response !== 0) setDecryptModal(null);
				else setDecryptModal({ path, hint: r.error });
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
				setDecryptModal(null);
				return;
			}
			setDecryptModal(null);
			const a = VaultArchive.fromDecryptedPayload(plain);
			const fileName = path.replace(/\\/g, "/").split("/").pop() ?? path;
			await applyArchiveSession(a, path, path, fileName);
		},
		[decryptModal, applyArchiveSession],
	);

	useEffect(() => {
		void (async () => {
			const { path } = await api.startupArgPath();
			if (path && path.trim()) await openPath(path.trim());
		})();
	}, [openPath]);

	const flushEditor = useCallback(() => {
		if (archive && selectedPath) {
			flushEditorToArchive(archive, editorText, selectedPath);
		}
	}, [archive, selectedPath, editorText]);

	const syncTree = useCallback(
		(prefer: string | null) => {
			if (!session) return;
			const a = session.archive;
			const tree = buildArchiveTree(a);
			let next = prefer;
			if (!next || !a.entriesView().has(next)) {
				next = firstFilePath(tree);
			}
			if (next) {
				setSelectedPath(next);
				setTreeSelection({ kind: "file", path: next });
				setEditorText(textFromBytes(a.getBytes(next)));
			} else {
				setSelectedPath(null);
				setTreeSelection(null);
				setEditorText("");
			}
			setSession({ ...session, archive: a.clone() });
		},
		[session],
	);

	const onSelectFile = useCallback(
		(path: string) => {
			flushEditor();
			if (!session) return;
			setSelectedPath(path);
			setTreeSelection({ kind: "file", path });
			setEditorText(textFromBytes(session.archive.getBytes(path)));
			setSession({ ...session, archive: session.archive.clone() });
		},
		[session, flushEditor],
	);

	const onSelectDir = useCallback((segments: string[]) => {
		setTreeSelection({ kind: "dir", segments });
	}, []);

	const pickAndOpen = async () => {
		const { paths } = await api.pickOpenFile();
		if (paths[0]) await openPath(paths[0]);
	};

	const runSave = async (targetPath: string, passphrase: string) => {
		if (!session) return;
		flushEditor();
		const plain = session.archive.toAgePlaintextBytes();
		if (plain.length === 0) {
			await api.showMessageBoxReq({
				type: "warning",
				title: "VaultEditor",
				message: "Данные пусты, сохранение отменено.",
			});
			return;
		}
		setBusy(true);
		try {
			const r = await api.encryptAgeFile({
				targetPath,
				passphrase,
				plainBase64: u8ToBase64(plain),
			});
			if (r.ok) {
				await trackerRef.current.captureBaseline(session.archive);
				setSession({
					...session,
					vaultFilePath: targetPath,
					openedPath: targetPath,
					titleBase: `VaultEditor — ${targetPath.replace(/\\/g, "/").split("/").pop()}`,
					archive: session.archive.clone(),
				});
				await api.showMessageBoxReq({
					type: "info",
					title: "Готово",
					message: `Изменения сохранены в:\n${targetPath}`,
				});
			} else {
				const retry = await api.showMessageBoxReq({
					type: "question",
					title: "Сохранение",
					message: `Ошибка: ${r.error ?? ""}\nПовторить ввод пароля?`,
					buttons: ["Да", "Нет"],
					defaultId: 0,
					cancelId: 1,
				});
				if (retry.response === 0) {
					setTwoPartModal({
						title: "Сохранение",
						onSubmit: (p) => void runSave(targetPath, p),
					});
				}
			}
		} finally {
			setBusy(false);
		}
	};

	const performSave = async () => {
		if (!session || busy) return;
		flushEditor();
		let plain: Uint8Array;
		try {
			plain = session.archive.toAgePlaintextBytes();
		} catch (e) {
			await api.showMessageBoxReq({
				type: "error",
				title: "Ошибка",
				message: e instanceof Error ? e.message : String(e),
			});
			return;
		}
		if (plain.length === 0) {
			await api.showMessageBoxReq({
				type: "warning",
				title: "VaultEditor",
				message: "Данные пусты, сохранение отменено.",
			});
			return;
		}
		const enc = new TextEncoder();
		const ed = enc.encode(editorText);
		const dirty = await trackerRef.current.isAnythingDirty(
			session.archive,
			ed,
			selectedPath,
		);
		if (!dirty) {
			await api.showMessageBoxReq({
				type: "info",
				title: "VaultEditor",
				message: "Изменений нет. Файл контейнера не перезаписывался.",
			});
			return;
		}
		setTwoPartModal({
			title: "Сохранение — пароль для перезаписи контейнера",
			onSubmit: (p) => void runSave(session.vaultFilePath, p),
		});
	};

	const performSaveAs = async () => {
		if (!session || busy) return;
		flushEditor();
		let plain: Uint8Array;
		try {
			plain = session.archive.toAgePlaintextBytes();
		} catch (e) {
			await api.showMessageBoxReq({
				type: "error",
				title: "Ошибка",
				message: e instanceof Error ? e.message : String(e),
			});
			return;
		}
		if (plain.length === 0) {
			await api.showMessageBoxReq({
				type: "warning",
				title: "VaultEditor",
				message: "Данные пусты, сохранение отменено.",
			});
			return;
		}
		const { paths } = await api.pickFolder();
		if (!paths[0]) return;
		const cur = session.vaultFilePath.replace(/\\/g, "/").split("/").pop() ?? "vault.age";
		const name =
			typeof window !== "undefined"
				? window.prompt("Имя файла (.age)", cur)
				: null;
		if (!name) return;
		const targetPath = ensureAgeExtension(joinDirFile(paths[0], name.trim()));
		setTwoPartModal({
			title: "Сохранить как — пароль для нового контейнера",
			onSubmit: (p) => void runSave(targetPath, p),
		});
	};

	const exportZipAge = async () => {
		if (!session || busy) return;
		flushEditor();
		const zipPlain = session.archive.toZipBytes();
		const suggest = defaultZipAgeExportSavePath(session.openedPath);
		const suggestName = suggest.replace(/\\/g, "/").split("/").pop() ?? "export.zip.age";
		const { paths } = await api.pickFolder();
		if (!paths[0]) return;
		const name =
			typeof window !== "undefined"
				? window.prompt("Имя .age файла", suggestName)
				: null;
		if (!name) return;
		const exportDest = ensureAgeExtension(joinDirFile(paths[0], name.trim()));
		setTwoPartModal({
			title: "Экспорт ZIP → age — пароль",
			onSubmit: async (p) => {
				setBusy(true);
				try {
					const r = await api.encryptAgeFile({
						targetPath: exportDest,
						passphrase: p,
						plainBase64: u8ToBase64(zipPlain),
					});
					if (r.ok) {
						await api.showMessageBoxReq({
							type: "info",
							title: "Готово",
							message: `ZIP зашифрован и сохранён в:\n${exportDest}`,
						});
					} else {
						await api.showMessageBoxReq({
							type: "error",
							title: "Ошибка",
							message: r.error ?? "Ошибка шифрования",
						});
					}
				} finally {
					setBusy(false);
				}
			},
		});
	};

	const addFiles = async () => {
		if (!session) return;
		flushEditor();
		const { paths } = await api.pickOpenMultiple();
		if (!paths.length) return;
		for (const p of paths) {
			const r = await api.readFileBase64({ path: p });
			if (!r.ok || !r.base64) continue;
			const fn = p.replace(/\\/g, "/").split("/").pop() ?? "file.bin";
			const name = session.archive.uniqueName(fn);
			session.archive.putBytes(name, base64ToU8(r.base64));
		}
		setSession({ ...session, archive: session.archive.clone() });
		syncTree(selectedPath);
	};

	const newFile = () => {
		if (!session) return;
		flushEditor();
		const prefix = folderPrefixForTreeSelection(treeSelection);
		const input =
			typeof window !== "undefined"
				? window.prompt(
						"Имя файла относительно выбранной папки (можно подпуть):",
						"новый.txt",
					)
				: null;
		if (!input) return;
		const trimmed = input.trim().replace(/\\/g, "/");
		if (!trimmed) return;
		let norm = VaultArchive.normalizeEntryName(trimmed);
		const fullPath = norm.includes("/") ? norm : prefix + norm;
		const key = session.archive.uniqueName(VaultArchive.normalizeEntryName(fullPath));
		session.archive.putBytes(key, new Uint8Array(0));
		setSession({ ...session, archive: session.archive.clone() });
		syncTree(key);
	};

	const newDir = () => {
		if (!session) return;
		flushEditor();
		const prefix = folderPrefixForTreeSelection(treeSelection);
		const input =
			typeof window !== "undefined"
				? window.prompt("Имя каталога (вложенный путь допустим):", "Новая папка")
				: null;
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
		const key = session.archive.uniqueName(keeper);
		session.archive.putBytes(key, new Uint8Array(0));
		setSession({ ...session, archive: session.archive.clone() });
		syncTree(key);
	};

	const renameAt = useCallback(
		(fromPath: string) => {
			if (!session) return;
			flushEditor();
			const norm = fromPath.replace(/\\/g, "/");
			const leaf = norm.includes("/") ? norm.slice(norm.lastIndexOf("/") + 1) : norm;
			const input =
				typeof window !== "undefined"
					? window.prompt("Новое имя или путь с «/» внутри архива:", leaf)
					: null;
			if (!input) return;
			const newPath = VaultArchive.resolveRenameTargetPath(fromPath, input);
			if (!newPath || newPath === fromPath) return;
			try {
				session.archive.renameEntry(fromPath, newPath);
			} catch (e) {
				void api.showMessageBoxReq({
					type: "warning",
					title: "Переименование",
					message: e instanceof Error ? e.message : String(e),
				});
				return;
			}
			const cur = selectedPath;
			const prefer =
				fromPath === cur
					? newPath
					: cur && session.archive.entriesView().has(cur)
						? cur
						: newPath;
			setSession({ ...session, archive: session.archive.clone() });
			syncTree(prefer);
		},
		[session, selectedPath, syncTree, flushEditor],
	);

	useEffect(() => {
		renameFileRef.current = renameAt;
	}, [renameAt]);

	const deleteSelected = () => {
		if (!session || !selectedPath) return;
		flushEditor();
		if (session.archive.entriesView().size <= 1) {
			void api.showMessageBoxReq({
				type: "info",
				title: "Удаление",
				message: "Нельзя удалить последний файл в архиве.",
			});
			return;
		}
		void (async () => {
			const conf = await api.showMessageBoxReq({
				type: "question",
				title: "Удаление",
				message: `Удалить файл «${selectedPath}»?`,
				buttons: ["Да", "Нет"],
				defaultId: 1,
				cancelId: 1,
			});
			if (conf.response !== 0) return;
			const victim = selectedPath;
			const cur = selectedPath;
			session.archive.removePath(victim);
			let prefer: string | null = victim === cur ? null : cur;
			if (prefer != null && !session.archive.entriesView().has(prefer)) {
				prefer = null;
			}
			syncTree(prefer);
		})();
	};

	const onTreeKeyDown = (e: KeyboardEvent) => {
		if (e.key === "F2" && selectedPath) renameAt(selectedPath);
		if (e.key === "Delete") deleteSelected();
	};

	const saveKeyRef = useRef<() => void>(() => {});
	const saveAsKeyRef = useRef<() => void>(() => {});
	saveKeyRef.current = () => void performSave();
	saveAsKeyRef.current = () => void performSaveAs();
	useEffect(() => {
		const onKey = (e: globalThis.KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				if (e.shiftKey) saveAsKeyRef.current();
				else saveKeyRef.current();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const tree = archive ? buildArchiveTree(archive) : [];

	return (
		<div className="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col">
			<header className="border-b border-zinc-700 px-3 py-2 flex flex-wrap gap-2 items-center bg-zinc-950/80">
				<button
					type="button"
					onClick={() => void pickAndOpen()}
					className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-sm"
				>
					Открыть…
				</button>
				{session && (
					<>
						<button
							type="button"
							disabled={busy}
							onClick={() => void performSave()}
							className="px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-sm"
						>
							Сохранить
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => void performSaveAs()}
							className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm"
						>
							Сохранить как…
						</button>
						{session.archive.showSaveAsZipSideButton() && (
							<button
								type="button"
								disabled={busy}
								onClick={() => void exportZipAge()}
								className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm"
							>
								Экспорт ZIP → .age
							</button>
						)}
					</>
				)}
			</header>

			{!session ? (
				<div className="flex-1 flex items-center justify-center text-zinc-500">
					Откройте .age, .zip или файл через кнопку «Открыть».
				</div>
			) : (
				<div className="flex-1 flex min-h-0">
					<div className="flex-1 flex flex-col min-w-0 border-r border-zinc-700">
						<textarea
							className="flex-1 w-full min-h-[320px] bg-zinc-900 text-zinc-100 p-3 font-mono text-sm resize-none outline-none focus:ring-1 focus:ring-emerald-600/50"
							spellCheck={false}
							value={editorText}
							onChange={(e) => setEditorText(e.target.value)}
							disabled={!selectedPath}
						/>
					</div>
					<div
						className="w-64 flex-shrink-0 flex flex-col bg-zinc-950 p-2 gap-2"
						tabIndex={0}
						onKeyDown={onTreeKeyDown}
					>
						<div className="flex flex-col gap-1">
							<button
								type="button"
								className="text-xs py-1 rounded bg-zinc-800 hover:bg-zinc-700"
								onClick={() => void addFiles()}
							>
								Добавить файлы
							</button>
							<button
								type="button"
								className="text-xs py-1 rounded bg-zinc-800 hover:bg-zinc-700"
								onClick={newFile}
							>
								Создать файл
							</button>
							<button
								type="button"
								className="text-xs py-1 rounded bg-zinc-800 hover:bg-zinc-700"
								onClick={newDir}
							>
								Создать каталог
							</button>
						</div>
						<div className="flex-1 overflow-auto text-sm border border-zinc-700 rounded-md p-1">
							<TreeRow
								branches={tree}
								level={0}
								selectedPath={selectedPath}
								dirtyPaths={dirtyPaths}
								onSelectFile={onSelectFile}
								onSelectDir={onSelectDir}
								parentSegments={[]}
							/>
						</div>
						<p className="text-[10px] text-zinc-500">
							Del — удалить, F2 — переименовать. Ctrl+S / Ctrl+Shift+S.
						</p>
					</div>
				</div>
			)}

			{decryptModal && (
				<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
					<form
						className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 w-96 shadow-xl"
						onSubmit={(e) => {
							e.preventDefault();
							void finishDecrypt(decryptPass);
							setDecryptPass("");
						}}
					>
						<h2 className="font-semibold mb-2">Расшифровка</h2>
						<p className="text-sm text-zinc-400 mb-2">Пароль контейнера:</p>
						{decryptModal.hint && (
							<p className="text-xs text-red-400 mb-2">{decryptModal.hint}</p>
						)}
						<input
							type="password"
							autoFocus
							className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 mb-3"
							value={decryptPass}
							onChange={(e) => setDecryptPass(e.target.value)}
						/>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								className="px-3 py-1 rounded bg-zinc-700"
								onClick={() => setDecryptModal(null)}
							>
								Отмена
							</button>
							<button
								type="submit"
								className="px-3 py-1 rounded bg-emerald-700"
							>
								OK
							</button>
						</div>
					</form>
				</div>
			)}

			{twoPartModal && (
				<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
					<form
						className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 w-96 shadow-xl"
						onSubmit={(e) => {
							e.preventDefault();
							if (pw1 !== pw2) {
								void api.showMessageBoxReq({
									type: "warning",
									title: twoPartModal.title,
									message: "Пароли не совпадают.",
								});
								return;
							}
							const pass = pw1;
							const fn = twoPartModal.onSubmit;
							setTwoPartModal(null);
							setPw1("");
							setPw2("");
							void fn(pass);
						}}
					>
						<h2 className="font-semibold mb-2 text-sm">{twoPartModal.title}</h2>
						<input
							type="password"
							placeholder="Пароль"
							autoFocus
							className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 mb-2"
							value={pw1}
							onChange={(e) => setPw1(e.target.value)}
						/>
						<input
							type="password"
							placeholder="Повтор пароля"
							className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 mb-3"
							value={pw2}
							onChange={(e) => setPw2(e.target.value)}
						/>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								className="px-3 py-1 rounded bg-zinc-700"
								onClick={() => {
									setTwoPartModal(null);
									setPw1("");
									setPw2("");
								}}
							>
								Отмена
							</button>
							<button type="submit" className="px-3 py-1 rounded bg-emerald-700">
								OK
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
