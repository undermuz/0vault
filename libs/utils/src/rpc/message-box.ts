export type MessageBoxReq = {
	type?: "info" | "warning" | "error" | "question";
	title?: string;
	message?: string;
	detail?: string;
	buttons?: string[];
	defaultId?: number;
	cancelId?: number;
};
