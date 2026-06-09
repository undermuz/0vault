import { Modal, Spinner, Surface } from "@heroui/react";
import { I18nProvider } from "@libs/di/i18n/types";
import { useT } from "@libs/di/react/hooks/useT";

export function IoLoadingOverlay(props: {
	visible: boolean;
	message: string;
}): JSX.Element {
	const { visible, message } = props;
	const t = useT(I18nProvider);
	return (
		<Modal>
			<Modal.Backdrop
				isOpen={visible}
				isDismissable={false}
				variant="blur"
			>
				<Modal.Container className="bg-transparent shadow-none">
					<Modal.Dialog
						className="bg-transparent shadow-none border-0 p-0"
						aria-busy="true"
						aria-live="polite"
					>
						<Surface className="flex flex-col items-center gap-4 rounded-xl border border-border px-10 py-8 shadow-overlay">
							<Spinner size="lg" color="accent" aria-hidden />
							<p className="max-w-sm text-center text-sm text-foreground">
								{message || t("common.loading")}
							</p>
						</Surface>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</Modal>
	);
}
