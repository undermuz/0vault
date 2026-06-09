import { Button, Description, Surface } from "@heroui/react";
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
		<Surface variant="secondary" className="side-rail">
			<div className="panel-section-title">{t("recentFiles.title")}</div>
			<div className="flex-1 min-h-0 overflow-y-auto p-2">
				{entries.length === 0 ? (
					<Description className="px-2 py-4 text-sm leading-relaxed">
						{t("recentFiles.empty")}
					</Description>
				) : (
					<ul className="flex flex-col gap-0.5">
						{entries.map((entry) => {
							const norm = normalizePath(entry.path);
							const isOpen = openPaths.has(norm);
							const hint = parentHint(entry.path);
							return (
								<li key={norm} className="group relative">
									<Button
										variant="ghost"
										className={`w-full h-auto flex-col items-start rounded-lg py-2.5 px-3 pr-9 ${
											isOpen ? "list-item-selected" : ""
										}`}
										title={entry.path}
										isDisabled={ioLoading}
										onPress={() => onOpen(entry.path)}
									>
										<span className="truncate text-sm font-medium w-full text-left">
											{entry.label}
										</span>
										{hint ? (
											<span className="truncate text-xs text-muted w-full text-left">
												{hint}
											</span>
										) : null}
									</Button>
									<Button
										size="sm"
										variant="ghost"
										isIconOnly
										className="absolute right-1 top-1.5 size-6 min-w-6 opacity-0 group-hover:opacity-100"
										aria-label={t("recentFiles.remove", { name: entry.label })}
										isDisabled={ioLoading}
										onPress={() => onRemove(entry.path)}
									>
										×
									</Button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</Surface>
	);
}
