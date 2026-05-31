export function IoLoadingOverlay(props: {
	visible: boolean;
	message: string;
}): JSX.Element | null {
	const { visible, message } = props;
	if (!visible) return null;
	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 backdrop-blur-[2px]"
			aria-busy="true"
			aria-live="polite"
		>
			<div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-600 bg-zinc-900 px-10 py-8 shadow-2xl">
				<div
					className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
					aria-hidden
				/>
				<p className="max-w-sm text-center text-sm text-zinc-200">
					{message || "Загрузка…"}
				</p>
			</div>
		</div>
	);
}
