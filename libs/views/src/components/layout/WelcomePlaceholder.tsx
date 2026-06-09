import { Description, Surface } from "@heroui/react";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";

export function WelcomePlaceholder(): JSX.Element {
	const t = useT(I18nProvider);
	return (
		<div className="flex-1 flex items-center justify-center p-8">
			<Surface
				variant="default"
				className="max-w-md w-full rounded-2xl border border-border px-8 py-10 text-center"
			>
				<h2 className="text-lg font-semibold text-foreground mb-3">
					{t("welcome.title")}
				</h2>
				<Description className="text-sm leading-relaxed">
					{t("welcome.hint")}
				</Description>
			</Surface>
		</div>
	);
}
