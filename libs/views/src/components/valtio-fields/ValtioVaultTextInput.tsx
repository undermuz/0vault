import { Input, TextField } from "@heroui/react";
import { useSnapshot } from "valtio";
import { useDi } from "@libs/di/react/hooks/useDi";
import {
	VaultEditorProviderToken,
	type IVaultEditorProvider,
} from "@libs/di/vault-editor/types";

export type ValtioVaultTextFieldKey = "decryptPass" | "pw1" | "pw2" | "promptInput";

type Props = {
	field: ValtioVaultTextFieldKey;
	className?: string;
	type?: "text" | "password" | "email" | "tel" | "url" | "search";
	placeholder?: string;
	autoFocus?: boolean;
	isDisabled?: boolean;
};

/** Controlled input bound to `vault.state[field]` with sync snapshot (caret-safe). */
export function ValtioVaultTextInput({
	field,
	className,
	type,
	placeholder,
	autoFocus,
	isDisabled,
}: Props) {
	const vault = useDi<IVaultEditorProvider>(VaultEditorProviderToken);
	const snap = useSnapshot(vault.state, { sync: true });
	return (
		<TextField
			className={className}
			type={type}
			value={snap[field]}
			onChange={(value: string) => {
				vault.state[field] = value;
			}}
			isDisabled={isDisabled}
		>
			<Input placeholder={placeholder} autoFocus={autoFocus} />
		</TextField>
	);
}
