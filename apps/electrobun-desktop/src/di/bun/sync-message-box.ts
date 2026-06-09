import type { MessageBoxOptions } from "electrobun/bun";
import { ffi } from "../../../../../node_modules/electrobun/dist/api/bun/proc/native.ts";

/** Native message box; blocks until the user picks a button (for sync quit guards). */
export function showMessageBoxSync(opts: MessageBoxOptions = {}): number {
	const {
		type = "info",
		title = "",
		message = "",
		detail = "",
		buttons = ["OK"],
		defaultId = 0,
		cancelId = -1,
	} = opts;

	return ffi.request.showMessageBox({
		type,
		title,
		message,
		detail,
		buttons,
		defaultId,
		cancelId,
	});
}
