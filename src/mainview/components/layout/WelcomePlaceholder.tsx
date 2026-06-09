import { I18nProvider } from "../../../di/i18n/types";
import { useT } from "../../../di/react/hooks/useT";

export function WelcomePlaceholder(): JSX.Element {
	const t = useT(I18nProvider);
	return (
		<div className="flex-1 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
			{t("welcome.hint")}
		</div>
	);
}
