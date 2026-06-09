import type { Key } from "@heroui/react";
import { Button, Tabs } from "@heroui/react";
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

	if (tabs.length === 0) {
		return (
			<div className="shrink-0 flex items-center gap-2 border-b border-separator px-3 py-2 bg-surface-secondary">
				<Button
					size="sm"
					variant="ghost"
					isIconOnly
					aria-label={t("tabs.new")}
					title={t("tabs.new")}
					isDisabled={ioLoading}
					onPress={onNew}
				>
					+
				</Button>
			</div>
		);
	}

	return (
		<Tabs
			variant="secondary"
			className="shrink-0 border-b border-separator bg-surface-secondary"
			selectedKey={activeTabId ?? undefined}
			onSelectionChange={(key: Key) => onActivate(String(key))}
		>
			<Tabs.ListContainer>
				<Tabs.List
					aria-label={t("tabs.list")}
					className="px-2 gap-0 min-h-10 items-center"
				>
					{tabs.map((tab, index) => {
						const dirty =
							tab.session.isNew ||
							tab.dirtyPaths.length > 0;
						return (
							<Tabs.Tab
								key={tab.id}
								id={tab.id}
								isDisabled={ioLoading}
								className="group gap-1.5 pr-1 max-w-[15rem]"
							>
								{index > 0 ? <Tabs.Separator /> : null}
								<span className="truncate text-sm">{tab.label}</span>
								{dirty ? (
									<span className="text-warning text-xs leading-none">•</span>
								) : null}
								<Button
									size="sm"
									variant="ghost"
									isIconOnly
									className="size-5 min-w-5 opacity-60 hover:opacity-100"
									aria-label={t("tabs.close", { name: tab.label })}
									isDisabled={ioLoading}
									onPress={() => onClose(tab.id)}
								>
									×
								</Button>
								<Tabs.Indicator />
							</Tabs.Tab>
						);
					})}
					<Button
						size="sm"
						variant="ghost"
						isIconOnly
						className="ml-1 shrink-0"
						aria-label={t("tabs.new")}
						title={t("tabs.new")}
						isDisabled={ioLoading}
						onPress={onNew}
					>
						+
					</Button>
				</Tabs.List>
			</Tabs.ListContainer>
		</Tabs>
	);
}
