import type { RecentFileEntry } from "@libs/di/recent-files/types";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";

function normalizePath(p: string): string {
	return p.replace(/\\/g, "/");
}

function parentHint(path: string): string {
	const norm = normalizePath(path);
	const idx = norm.lastIndexOf("/");
	if (idx <= 0) return "";
	return norm.slice(0, idx);
}

export function RecentFilesSidebar(props: {
	entries: readonly RecentFileEntry[];
	openPaths: ReadonlySet<string>;
	ioLoading: boolean;
	onOpen: (path: string) => void;
	onRemove: (path: string) => void;
}): JSX.Element {
	const { entries, openPaths, ioLoading, onOpen, onRemove } = props;
	const t = useT(I18nProvider);

	return (
		<aside className="w-56 shrink-0 flex flex-col border-r border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950">
			<div className="px-3 py-2 border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
				{t("recentFiles.title")}
			</div>
			<div className="flex-1 min-h-0 overflow-y-auto p-2">
				{entries.length === 0 ? (
					<p className="px-1 text-sm text-zinc-500 dark:text-zinc-400">
						{t("recentFiles.empty")}
					</p>
				) : (
					<ul className="flex flex-col gap-0.5">
						{entries.map((entry) => {
							const norm = normalizePath(entry.path);
							const isOpen = openPaths.has(norm);
							const hint = parentHint(entry.path);
							return (
								<li key={norm} className="group flex items-start gap-0.5">
									<button
										type="button"
										className={`flex-1 min-w-0 rounded px-2 py-1.5 text-left ${
											isOpen
												? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
												: "hover:bg-zinc-200/80 text-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-200"
										}`}
										title={entry.path}
										disabled={ioLoading}
										onClick={() => onOpen(entry.path)}
									>
										<div className="truncate text-sm font-medium">
											{entry.label}
										</div>
										{hint ? (
											<div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
												{hint}
											</div>
										) : null}
									</button>
									<button
										type="button"
										className="shrink-0 rounded px-1 py-1.5 text-zinc-400 opacity-0 hover:bg-zinc-200/80 hover:text-zinc-700 group-hover:opacity-100 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
										aria-label={t("recentFiles.remove", { name: entry.label })}
										disabled={ioLoading}
										onClick={() => onRemove(entry.path)}
									>
										×
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</aside>
	);
}
