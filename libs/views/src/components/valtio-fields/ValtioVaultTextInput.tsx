import type { InputHTMLAttributes } from "react";
import { useSnapshot } from "valtio";
import { useDi } from "@libs/di/react/hooks/useDi";
import {
	VaultEditorProviderToken,
	type IVaultEditorProvider,
} from "@libs/di/vault-editor/types";

export type ValtioVaultTextFieldKey = "decryptPass" | "pw1" | "pw2" | "promptInput";

type Props = {
	field: ValtioVaultTextFieldKey;
} & Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"value" | "onChange" | "defaultValue"
>;

/** Controlled input bound to `vault.state[field]` with sync snapshot (caret-safe). */
export function ValtioVaultTextInput({ field, ...rest }: Props) {
	const vault = useDi<IVaultEditorProvider>(VaultEditorProviderToken);
	const snap = useSnapshot(vault.state, { sync: true });
	return (
		<input
			{...rest}
			value={snap[field]}
			onChange={(e) => {
				vault.state[field] = e.target.value;
			}}
		/>
	);
}
