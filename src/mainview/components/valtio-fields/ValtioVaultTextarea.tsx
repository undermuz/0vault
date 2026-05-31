import type { TextareaHTMLAttributes } from "react";
import { useSnapshot } from "valtio";
import { useDi } from "../../../di/react/hooks/useDi";
import {
	VaultEditorProviderToken,
	type IVaultEditorProvider,
} from "../../../di/vault-editor/types";

type Props = Omit<
	TextareaHTMLAttributes<HTMLTextAreaElement>,
	"value" | "onChange" | "defaultValue"
>;

/** Editor textarea bound to `vault.state.editorText` with sync snapshot (caret-safe). */
export function ValtioVaultTextarea(props: Props) {
	const vault = useDi<IVaultEditorProvider>(VaultEditorProviderToken);
	const snap = useSnapshot(vault.state, { sync: true });
	return (
		<textarea
			{...props}
			value={snap.editorText}
			onChange={(e) => {
				vault.setEditorText(e.target.value);
			}}
		/>
	);
}
