import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";

export type VaultTabView = {
	id: string;
	label: string;
	session: { isNew: boolean };
	dirtyPaths: readonly string[];
};

export function VaultTabs(props: {
	tabs: readonly VaultTabView[];
	activeTabId: string | null;
	ioLoading: boolean;
	onActivate: (tabId: string) => void;
	onClose: (tabId: string) => void;
	onNew: () => void;
}): JSX.Element {
	const { tabs, activeTabId, ioLoading, onActivate, onClose, onNew } = props;
	const t = useT(I18nProvider);

	return (
		<div
			className="flex shrink-0 overflow-x-auto border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/60"
			role="tablist"
		>
			{tabs.map((tab) => {
				const active = activeTabId === tab.id;
				const dirty =
					tab.session.isNew ||
					tab.dirtyPaths.length > 0;
				return (
					<div
						key={tab.id}
						role="tab"
						aria-selected={active}
						className={`group flex shrink-0 items-center gap-1 border-r border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 ${
							active
								? "bg-white text-emerald-900 dark:bg-zinc-900 dark:text-emerald-100"
								: "bg-zinc-100/80 text-zinc-700 hover:bg-zinc-200/80 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-700/80"
						}`}
					>
						<button
							type="button"
							className="max-w-[14rem] truncate text-left"
							title={tab.label}
							disabled={ioLoading}
							onClick={() => onActivate(tab.id)}
						>
							{tab.label}
							{dirty ? " *" : ""}
						</button>
						<button
							type="button"
							className="rounded px-1 text-zinc-500 opacity-60 hover:bg-zinc-300/80 hover:opacity-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-600/80 group-hover:opacity-100"
							aria-label={t("tabs.close", { name: tab.label })}
							disabled={ioLoading}
							onClick={(e) => {
								e.stopPropagation();
								onClose(tab.id);
							}}
						>
							×
						</button>
					</div>
				);
			})}
			<button
				type="button"
				className="shrink-0 px-3 py-1.5 text-zinc-600 hover:bg-zinc-200/80 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-700/80"
				aria-label={t("tabs.new")}
				title={t("tabs.new")}
				disabled={ioLoading}
				onClick={onNew}
			>
				+
			</button>
		</div>
	);
}
