export class ArchiveError extends Error {
	constructor(
		readonly key: string,
		readonly params?: Record<string, unknown>,
	) {
		super(key);
		this.name = "ArchiveError";
	}
}
