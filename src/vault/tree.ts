import type { IVaultArchive } from "../di/vault/archive";

export type DirNode = { kind: "dir"; name: string };
export type FileNode = { kind: "file"; path: string };
export type TreeNode = DirNode | FileNode;

export type TreeBranch = {
	node: TreeNode;
	children: TreeBranch[];
};

/** `.keep` stubs — show as folders only, like Java ArchiveTreeUi. */
function directoryPathForKeeperEntry(fullPath: string): string | null {
	const n = fullPath.replace(/\\/g, "/");
	if (n.endsWith("/.keep")) {
		return n.slice(0, -"/.keep".length);
	}
	return null;
}

function findDirChild(nodes: TreeBranch[], segment: string): TreeBranch | null {
	for (const br of nodes) {
		if (br.node.kind === "dir" && br.node.name === segment) return br;
	}
	return null;
}

function addDirectoryChainOnly(root: TreeBranch[], dirPath: string): void {
	const parts = dirPath.replace(/\\/g, "/").split("/");
	let cur = root;
	for (const seg of parts) {
		if (!seg) continue;
		let next = findDirChild(cur, seg);
		if (!next) {
			next = { node: { kind: "dir", name: seg }, children: [] };
			cur.push(next);
		}
		cur = next.children;
	}
}

function findChildForSegment(
	parent: TreeBranch[],
	segment: string,
	lastSegment: boolean,
	fullPath: string,
): TreeBranch | null {
	for (const br of parent) {
		const u = br.node;
		if (lastSegment && u.kind === "file" && u.path === fullPath) return br;
		if (!lastSegment && u.kind === "dir" && u.name === segment) return br;
	}
	return null;
}

function addPathToTree(root: TreeBranch[], fullPath: string): void {
	const parts = fullPath.replace(/\\/g, "/").split("/");
	let cur = root;
	for (let i = 0; i < parts.length; i++) {
		const seg = parts[i];
		if (!seg) continue;
		const last = i === parts.length - 1;
		let next = findChildForSegment(cur, seg, last, fullPath);
		if (!next) {
			if (last) {
				next = { node: { kind: "file", path: fullPath }, children: [] };
			} else {
				next = { node: { kind: "dir", name: seg }, children: [] };
			}
			cur.push(next);
		}
		cur = next.children;
	}
}

/** Build hierarchical tree from archive paths (sorted). */
export function buildArchiveTree(archive: IVaultArchive): TreeBranch[] {
	const root: TreeBranch[] = [];
	for (const fullPath of archive.sortedPaths()) {
		const dirOnly = directoryPathForKeeperEntry(fullPath);
		if (dirOnly != null) {
			if (dirOnly.length > 0) addDirectoryChainOnly(root, dirOnly);
			continue;
		}
		addPathToTree(root, fullPath);
	}
	return root;
}

export function firstFilePath(branches: TreeBranch[]): string | null {
	for (const br of branches) {
		if (br.node.kind === "file") return br.node.path;
		const sub = firstFilePath(br.children);
		if (sub) return sub;
	}
	return null;
}

export function parentDirectoryPrefixOfPath(path: string): string {
	const norm = path.replace(/\\/g, "/");
	const slash = norm.lastIndexOf("/");
	return slash >= 0 ? norm.slice(0, slash + 1) : "";
}

export type TreeSelection =
	| { kind: "file"; path: string }
	| { kind: "dir"; segments: string[] }
	| null;

/** Java ArchiveTreeUi.selectedFolderPrefix */
export function folderPrefixForTreeSelection(sel: TreeSelection): string {
	if (sel == null) return "";
	if (sel.kind === "file") return parentDirectoryPrefixOfPath(sel.path);
	return sel.segments.length ? `${sel.segments.join("/")}/` : "";
}
