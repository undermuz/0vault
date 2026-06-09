import type { TextareaHTMLAttributes } from "react";
import { useSnapshot } from "valtio";
import { useDi } from "@libs/di/react/hooks/useDi";
import {
	VaultEditorProviderToken,
	type IVaultEditorProvider,
} from "@libs/di/vault-editor/types";

type Props = Omit<
	TextareaHTMLAttributes<HTMLTextAreaElement>,
	"value" | "onChange" | "defaultValue"
>;

/** Editor textarea bound to the active vault tab with sync snapshot (caret-safe). */
export function ValtioVaultTextarea(props: Props) {
	const vault = useDi<IVaultEditorProvider>(VaultEditorProviderToken);
	const snap = useSnapshot(vault.state, { sync: true });
	const activeTab =
		snap.tabs.find((tab) => tab.id === snap.activeTabId) ?? null;
	return (
		<textarea
			{...props}
			value={activeTab?.editorText ?? ""}
			onChange={(e) => {
				vault.setEditorText(e.target.value);
			}}
		/>
	);
}
