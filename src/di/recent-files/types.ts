export const RecentFilesProviderToken = Symbol.for("RecentFilesProvider");

export const RECENT_FILES_STORAGE_KEY = "recent-files";

export const RECENT_FILES_MAX = 20;

export type RecentFileEntry = {
	path: string;
	label: string;
	openedAt: number;
};

export interface IRecentFilesProvider {
	state: {
		entries: RecentFileEntry[];
	};

	initialize(): Promise<void>;
	recordOpen(path: string): Promise<void>;
	remove(path: string): Promise<void>;
}
