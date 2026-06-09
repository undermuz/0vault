import type { FormEvent } from "react";
import { I18nProvider } from "../../../di/i18n/types";
import { useT } from "../../../di/react/hooks/useT";
import { ValtioVaultTextInput } from "../valtio-fields";

export function TextPromptModal(props: {
	visible: boolean;
	titleKey: string;
	ioLoading: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}): JSX.Element | null {
	const { visible, titleKey, ioLoading, onConfirm, onCancel } = props;
	const t = useT(I18nProvider);
	if (!visible) return null;
	return (
		<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
			<form
				className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 w-96 shadow-xl"
				onSubmit={(e: FormEvent) => {
					e.preventDefault();
					onConfirm();
				}}
			>
				<h2 className="font-semibold mb-2 text-sm">{t(titleKey)}</h2>
				<ValtioVaultTextInput
					field="promptInput"
					autoFocus
					className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 mb-3"
				/>
				<div className="flex justify-end gap-2">
					<button
						type="button"
						className="px-3 py-1 rounded bg-zinc-700"
						onClick={onCancel}
						disabled={ioLoading}
					>
						{t("common.cancel")}
					</button>
					<button type="submit" className="px-3 py-1 rounded bg-emerald-700" disabled={ioLoading}>
						{t("common.ok")}
					</button>
				</div>
			</form>
		</div>
	);
}
