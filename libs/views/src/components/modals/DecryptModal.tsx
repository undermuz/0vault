import type { FormEvent } from "react";
import { Button, Modal } from "@heroui/react";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";
import { ValtioVaultTextInput } from "../valtio-fields";

export function DecryptModal(props: {
	visible: boolean;
	hint: string | null;
	ioLoading: boolean;
	onDecrypt: () => void;
	onCancel: () => void;
}): JSX.Element {
	const { visible, hint, ioLoading, onDecrypt, onCancel } = props;
	const t = useT(I18nProvider);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		onDecrypt();
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
							<Modal.Heading>{t("decryptModal.title")}</Modal.Heading>
						</Modal.Header>
						<Modal.Body>
							<form id="decrypt-form" onSubmit={handleSubmit}>
								<p className="text-sm text-muted mb-2">
									{t("decryptModal.passphraseLabel")}
								</p>
								{hint && (
									<p className="text-xs text-danger mb-2">{hint}</p>
								)}
								<ValtioVaultTextInput
									field="decryptPass"
									type="password"
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
								onPress={onDecrypt}
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
