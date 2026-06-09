import type { FormEvent } from "react";
import { Button, Modal } from "@heroui/react";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";
import { ValtioVaultTextInput } from "../valtio-fields";

export function TextPromptModal(props: {
	visible: boolean;
	titleKey: string;
	ioLoading: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}): JSX.Element {
	const { visible, titleKey, ioLoading, onConfirm, onCancel } = props;
	const t = useT(I18nProvider);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		onConfirm();
	};

	return (
		<Modal>
			<Modal.Backdrop
				isOpen={visible}
				isDismissable={!ioLoading}
				onOpenChange={(open) => {
					if (!open) onCancel();
				}}
			>
				<Modal.Container size="sm">
					<Modal.Dialog>
						<Modal.Header>
							<Modal.Heading>{t(titleKey)}</Modal.Heading>
						</Modal.Header>
						<Modal.Body>
							<form id="text-prompt-form" onSubmit={handleSubmit}>
								<ValtioVaultTextInput
									field="promptInput"
									className="w-full"
									autoFocus
								/>
							</form>
						</Modal.Body>
						<Modal.Footer>
							<Button
								variant="secondary"
								isDisabled={ioLoading}
								onPress={onCancel}
							>
								{t("common.cancel")}
							</Button>
							<Button
								isDisabled={ioLoading}
								onPress={onConfirm}
							>
								{t("common.ok")}
							</Button>
						</Modal.Footer>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</Modal>
	);
}
