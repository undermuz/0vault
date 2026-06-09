export function looksLikeZip(b: Uint8Array | null | undefined): boolean {
	if (!b || b.length < 4) return false;
	return (
		b[0] === 0x50 &&
		b[1] === 0x4b &&
		(b[2] === 3 || b[2] === 5 || b[2] === 7) &&
		(b[3] === 4 || b[3] === 6 || b[3] === 8)
	);
}

export function normalizeEntryName(name: string | null): string {
	if (name == null) return "";
	let n = name.replace(/\\/g, "/").trim();
	while (n.startsWith("/")) n = n.slice(1);
	if (n.includes("..")) n = n.replace(/\.\./g, "_");
	return n;
}

export function safeEntryName(name: string): string {
	let n = name.replace(/\\/g, "/");
	const slash = n.lastIndexOf("/");
	if (slash >= 0) n = n.slice(slash + 1);
	if (n.trim().length === 0) return "file.bin";
	return normalizeEntryName(n);
}

export function resolveRenameTargetPath(
	fromPath: string,
	newNameInput: string | null,
): string | null {
	if (newNameInput == null) return null;
	const trimmed = newNameInput.trim();
	if (trimmed.length === 0) return null;
	const normIn = normalizeEntryName(trimmed.replace(/\\/g, "/"));
	if (normIn.includes("/")) return normIn;
	const fromNorm = fromPath.replace(/\\/g, "/");
	const slash = fromNorm.lastIndexOf("/");
	const parent = slash >= 0 ? fromNorm.slice(0, slash + 1) : "";
	return parent + normIn;
}
