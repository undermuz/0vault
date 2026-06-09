import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";

export function IoLoadingOverlay(props: {
	visible: boolean;
	message: string;
}): JSX.Element | null {
	const { visible, message } = props;
	const t = useT(I18nProvider);
	if (!visible) return null;
	return (
		<div
			className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-100/70 backdrop-blur-[2px] dark:bg-zinc-950/70"
			aria-busy="true"
			aria-live="polite"
		>
			<div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-300 bg-white px-10 py-8 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900">
				<div
					className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
					aria-hidden
				/>
				<p className="max-w-sm text-center text-sm text-zinc-700 dark:text-zinc-200">
					{message || t("common.loading")}
				</p>
			</div>
		</div>
	);
}
