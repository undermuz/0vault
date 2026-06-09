/** Path helpers mirroring Java VaultEncryptAndSave / VaultOpenCoordinator. */

export function baseName(filePath: string): string {
	const n = filePath.replace(/^[\\/]+/, "").split(/[/\\]/).pop() ?? "";
	const dot = n.lastIndexOf(".");
	return dot > 0 ? n.slice(0, dot) : n;
}

export function ensureAgeExtension(dest: string): string {
	const low = dest.toLowerCase();
	if (low.endsWith(".age")) return dest;
	const parts = dest.replace(/\\/g, "/").split("/");
	const fn = parts.pop() ?? dest;
	const parent = parts.length ? parts.join("/") : "";
	const outName = `${fn}.age`;
	return parent ? `${parent}/${outName}` : outName;
}

export function defaultZipAgeExportSavePath(openedPath: string): string {
	const norm = openedPath.replace(/\\/g, "/");
	const lastSlash = norm.lastIndexOf("/");
	const dir = lastSlash >= 0 ? norm.slice(0, lastSlash) : ".";
	const name = lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
	const low = name.toLowerCase();
	if (low.endsWith(".age")) {
		return `${dir}/${name.slice(0, -4)}.zip.age`;
	}
	if (low.endsWith(".zip")) {
		return `${dir}/${name}.age`;
	}
	const dot = name.lastIndexOf(".");
	const stem = dot > 0 ? name.slice(0, dot) : name;
	return `${dir}/${stem}.zip.age`;
}
