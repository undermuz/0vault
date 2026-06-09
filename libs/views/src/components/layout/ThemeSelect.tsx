import type { Key } from "@heroui/react";
import { Label, ListBox, Select } from "@heroui/react";
import { useSnapshot } from "valtio";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";
import { useDi } from "@libs/di/react/hooks/useDi";
import { ThemeProvider, type ThemeMode, type ThemeService } from "@libs/di/theme/types";

const THEME_OPTIONS: ThemeMode[] = ["light", "dark", "system"];

export function ThemeSelect(): JSX.Element {
	const theme = useDi<ThemeService>(ThemeProvider);
	const snap = useSnapshot(theme.state);
	const t = useT(I18nProvider);

	return (
		<Select
			className="w-40"
			variant="secondary"
			aria-label={t("theme.label")}
			value={snap.mode}
			onChange={(value: Key | null) => void theme.setMode(value as ThemeMode)}
		>
			<Label className="sr-only">{t("theme.label")}</Label>
			<Select.Trigger>
				<Select.Value />
				<Select.Indicator />
			</Select.Trigger>
			<Select.Popover>
				<ListBox>
					{THEME_OPTIONS.map((mode) => (
						<ListBox.Item key={mode} id={mode} textValue={t(`theme.${mode}`)}>
							{t(`theme.${mode}`)}
							<ListBox.ItemIndicator />
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
		</Select>
	);
}
