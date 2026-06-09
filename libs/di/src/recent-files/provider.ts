import { inject, injectable } from "inversify";
import { proxy } from "valtio";
import {
	LocalStorageProvider,
	type ILocalStorage,
} from "../utils/local-storage/types";
import {
	RECENT_FILES_MAX,
	RECENT_FILES_STORAGE_KEY,
	type IRecentFilesProvider,
	type RecentFileEntry,
} from "./types";

function normalizePath(p: string): string {
	return p.replace(/\\/g, "/");
}

function fileNameOf(p: string): string {
	const norm = normalizePath(p);
	return norm.split("/").pop() ?? norm;
}

function parseEntries(raw: string | null): RecentFileEntry[] {
	if (!raw) return [];
	try {
		const data = JSON.parse(raw) as unknown;
		if (!Array.isArray(data)) return [];
		return data
			.filter(
				(item): item is RecentFileEntry =>
					typeof item === "object" &&
					item !== null &&
					typeof (item as RecentFileEntry).path === "string" &&
					typeof (item as RecentFileEntry).label === "string" &&
					typeof (item as RecentFileEntry).openedAt === "number",
			)
			.slice(0, RECENT_FILES_MAX);
	} catch {
		return [];
	}
}

@injectable()
export class RecentFilesProvider implements IRecentFilesProvider {
	constructor(
		@inject(LocalStorageProvider)
		private readonly storage: ILocalStorage,
	) {}

	state = proxy<IRecentFilesProvider["state"]>({
		entries: [],
	});

	async initialize(): Promise<void> {
		const raw = await this.storage.getItem(RECENT_FILES_STORAGE_KEY);
		this.state.entries = parseEntries(raw);
	}

	async recordOpen(path: string): Promise<void> {
		const trimmed = path.trim();
		if (!trimmed) return;

		const norm = normalizePath(trimmed);
		const next: RecentFileEntry = {
			path: trimmed,
			label: fileNameOf(trimmed),
			openedAt: Date.now(),
		};

		const rest = this.state.entries.filter(
			(entry) => normalizePath(entry.path) !== norm,
		);
		this.state.entries = [next, ...rest].slice(0, RECENT_FILES_MAX);
		await this.persist();
	}

	async remove(path: string): Promise<void> {
		const norm = normalizePath(path);
		this.state.entries = this.state.entries.filter(
			(entry) => normalizePath(entry.path) !== norm,
		);
		await this.persist();
	}

	private async persist(): Promise<void> {
		await this.storage.setItem(
			RECENT_FILES_STORAGE_KEY,
			JSON.stringify(this.state.entries),
		);
	}
}
