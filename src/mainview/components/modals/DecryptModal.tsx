import type { FormEvent } from "react";
import { ValtioVaultTextInput } from "../valtio-fields";

export function DecryptModal(props: {
	visible: boolean;
	hint: string | null;
	ioLoading: boolean;
	onDecrypt: () => void;
	onCancel: () => void;
}): JSX.Element | null {
	const { visible, hint, ioLoading, onDecrypt, onCancel } = props;
	if (!visible) return null;
	return (
		<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
			<form
				className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 w-96 shadow-xl"
				onSubmit={(e: FormEvent) => {
					e.preventDefault();
					onDecrypt();
				}}
			>
				<h2 className="font-semibold mb-2">Расшифровка</h2>
				<p className="text-sm text-zinc-400 mb-2">Пароль контейнера:</p>
				{hint && <p className="text-xs text-red-400 mb-2">{hint}</p>}
				<ValtioVaultTextInput
					field="decryptPass"
					type="password"
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
						Отмена
					</button>
					<button type="submit" className="px-3 py-1 rounded bg-emerald-700" disabled={ioLoading}>
						OK
					</button>
				</div>
			</form>
		</div>
	);
}
