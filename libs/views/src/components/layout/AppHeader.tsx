import {
	Archive,
	CopyArrowRight,
	FloppyDisk,
	FolderOpen,
	Plus,
} from "@gravity-ui/icons";
import { Button, ButtonGroup, Separator, Surface } from "@heroui/react";
import type { IVaultEditorProvider } from "@libs/di/vault-editor/types";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";
import { ThemeSelect } from "./ThemeSelect";

const iconClass = "size-4 shrink-0";

export function AppHeader(props: {
	vault: IVaultEditorProvider;
	hasSession: boolean;
	showExportZip: boolean;
	ioLoading: boolean;
}): JSX.Element {
	const { vault, hasSession, showExportZip, ioLoading } = props;
	const t = useT(I18nProvider);
	return (
		<Surface
			variant="default"
			className="shrink-0 z-10 border-b border-separator px-4 py-2.5 flex items-center gap-4"
		>
			<div className="flex items-center gap-3 shrink-0 pr-4 border-r border-separator">
				<span className="text-sm font-semibold tracking-tight text-foreground">
					{t("app.name")}
				</span>
			</div>

			<div className="flex flex-1 items-center gap-3 min-w-0 overflow-x-auto">
				<ButtonGroup variant="tertiary">
					<Button
						size="sm"
						isDisabled={ioLoading}
						onPress={() => void vault.newDocument()}
					>
						<Plus className={iconClass} />
						{t("header.new")}
					</Button>
					<ButtonGroup.Separator />
					<Button
						size="sm"
						isDisabled={ioLoading}
						onPress={() => void vault.pickAndOpen()}
					>
						<FolderOpen className={iconClass} />
						{t("header.open")}
					</Button>
				</ButtonGroup>

				{hasSession && (
					<>
						<Separator orientation="vertical" className="h-5" />
						<Button
							size="sm"
							isDisabled={ioLoading}
							onPress={() => void vault.save()}
						>
							<FloppyDisk className={iconClass} />
							{t("header.save")}
						</Button>
						<Button
							size="sm"
							variant="tertiary"
							isDisabled={ioLoading}
							onPress={() => void vault.saveAs()}
						>
							<CopyArrowRight className={iconClass} />
							{t("header.saveAs")}
						</Button>
						{showExportZip && (
							<Button
								size="sm"
								variant="tertiary"
								isDisabled={ioLoading}
								onPress={() => void vault.exportZipAge()}
							>
								<Archive className={iconClass} />
								{t("header.exportZipAge")}
							</Button>
						)}
					</>
				)}
			</div>

			<ThemeSelect />
		</Surface>
	);
}
