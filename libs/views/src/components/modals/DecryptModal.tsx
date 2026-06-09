import type { FormEvent } from "react";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";
import { ValtioVaultTextInput } from "../valtio-fields";

export function DecryptModal(props: {
	visible: boolean;
	hint: string | null;
	ioLoading: boolean;
	onDecrypt: () => void;
	onCancel: () => void;
}): JSX.Element | null {
	const { visible, hint, ioLoading, onDecrypt, onCancel } = props;
	const t = useT(I18nProvider);
	if (!visible) return null;
	return (
		<div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
			<form
				className="bg-white border border-zinc-300 rounded-lg p-4 w-96 shadow-xl dark:bg-zinc-800 dark:border-zinc-600"
				onSubmit={(e: FormEvent) => {
					e.preventDefault();
					onDecrypt();
				}}
			>
				<h2 className="font-semibold mb-2">{t("decryptModal.title")}</h2>
				<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{t("decryptModal.passphraseLabel")}</p>
				{hint && <p className="text-xs text-red-400 mb-2">{hint}</p>}
				<ValtioVaultTextInput
					field="decryptPass"
					type="password"
					autoFocus
					className="w-full rounded bg-white border border-zinc-300 px-2 py-1 mb-3 dark:bg-zinc-900 dark:border-zinc-600"
				/>
				<div className="flex justify-end gap-2">
					<button
						type="button"
						className="px-3 py-1 rounded bg-zinc-200 dark:bg-zinc-700"
						onClick={onCancel}
						disabled={ioLoading}
					>
						{t("common.cancel")}
					</button>
					<button type="submit" className="px-3 py-1 rounded bg-emerald-600 text-white dark:bg-emerald-700" disabled={ioLoading}>
						{t("common.ok")}
					</button>
				</div>
			</form>
		</div>
	);
}
