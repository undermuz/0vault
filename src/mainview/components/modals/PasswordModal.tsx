import type { FormEvent } from "react";
import { ValtioVaultTextInput } from "../valtio-fields";

export function PasswordModal(props: {
	visible: boolean;
	title: string;
	ioLoading: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}): JSX.Element | null {
	const { visible, title, ioLoading, onConfirm, onCancel } = props;
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
				<h2 className="font-semibold mb-2 text-sm">{title}</h2>
				<ValtioVaultTextInput
					field="pw1"
					type="password"
					placeholder="Пароль"
					autoFocus
					className="w-full rounded bg-zinc-900 border border-zinc-600 px-2 py-1 mb-2"
				/>
				<ValtioVaultTextInput
					field="pw2"
					type="password"
					placeholder="Повтор пароля"
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
