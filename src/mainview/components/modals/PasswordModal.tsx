import type { FormEvent } from "react";
import { I18nProvider } from "../../../di/i18n/types";
import { useT } from "../../../di/react/hooks/useT";
import { ValtioVaultTextInput } from "../valtio-fields";

export function PasswordModal(props: {
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
		<div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
			<form
				className="bg-white border border-zinc-300 rounded-lg p-4 w-96 shadow-xl dark:bg-zinc-800 dark:border-zinc-600"
				onSubmit={(e: FormEvent) => {
					e.preventDefault();
					onConfirm();
				}}
			>
				<h2 className="font-semibold mb-2 text-sm">{t(titleKey)}</h2>
				<ValtioVaultTextInput
					field="pw1"
					type="password"
					placeholder={t("passwordModal.passphrase")}
					autoFocus
					className="w-full rounded bg-white border border-zinc-300 px-2 py-1 mb-2 dark:bg-zinc-900 dark:border-zinc-600"
				/>
				<ValtioVaultTextInput
					field="pw2"
					type="password"
					placeholder={t("passwordModal.passphraseConfirm")}
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
