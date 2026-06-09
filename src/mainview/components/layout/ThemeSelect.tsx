import { useSnapshot } from "valtio";
import { I18nProvider } from "../../../di/i18n/types";
import { useT } from "../../../di/react/hooks/useT";
import { useDi } from "../../../di/react/hooks/useDi";
import { ThemeProvider, type ThemeMode, type ThemeService } from "../../../di/theme/types";

export function ThemeSelect(): JSX.Element {
	const theme = useDi<ThemeService>(ThemeProvider);
	const snap = useSnapshot(theme.state);
	const t = useT(I18nProvider);

	return (
		<label className="ml-auto flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
			<span className="sr-only">{t("theme.label")}</span>
			<select
				value={snap.mode}
				onChange={(e) => void theme.setMode(e.target.value as ThemeMode)}
				className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
				aria-label={t("theme.label")}
			>
				<option value="light">{t("theme.light")}</option>
				<option value="dark">{t("theme.dark")}</option>
				<option value="system">{t("theme.system")}</option>
			</select>
		</label>
	);
}
