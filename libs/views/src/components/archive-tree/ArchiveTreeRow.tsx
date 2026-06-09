import type { TreeBranch } from "@libs/utils/vault/tree";

export function ArchiveTreeRow(props: {
	branches: TreeBranch[];
	level: number;
	selectedPath: string | null;
	dirtyPaths: Set<string>;
	onSelectFile: (path: string) => void;
	onSelectDir: (segments: string[]) => void;
	parentSegments: string[];
}): JSX.Element {
	const {
		branches,
		level,
		selectedPath,
		dirtyPaths,
		onSelectFile,
		onSelectDir,
		parentSegments,
	} = props;
	return (
		<ul className={level === 0 ? "tree-root" : "pl-3 border-l border-zinc-300/80 dark:border-zinc-600/50"}>
			{branches.map((br, i) => {
				if (br.node.kind === "dir") {
					const segs = [...parentSegments, br.node.name];
					return (
						<li key={`d-${segs.join("/")}-${i}`} className="py-0.5">
							<button
								type="button"
								className="text-left w-full rounded px-1 hover:bg-zinc-200/80 text-zinc-700 dark:hover:bg-zinc-700/80 dark:text-zinc-300"
								onClick={() => onSelectDir(segs)}
							>
								{br.node.name}/
							</button>
							<ArchiveTreeRow
								branches={br.children}
								level={level + 1}
								selectedPath={selectedPath}
								dirtyPaths={dirtyPaths}
								onSelectFile={onSelectFile}
								onSelectDir={onSelectDir}
								parentSegments={segs}
							/>
						</li>
					);
				}
				const path = br.node.path;
				const leaf = path.replace(/\\/g, "/").split("/").pop() ?? path;
				const sel = selectedPath === path;
				const dirty = dirtyPaths.has(path);
				return (
					<li key={path} className="py-0.5">
						<button
							type="button"
							className={`text-left w-full rounded px-1 font-mono text-sm ${
								sel
									? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100"
									: "hover:bg-zinc-200/80 text-zinc-800 dark:hover:bg-zinc-700/80 dark:text-zinc-200"
							}`}
							onClick={() => onSelectFile(path)}
							onDoubleClick={() => onSelectFile(path)}
						>
							{leaf}
							{dirty ? " *" : ""}
						</button>
					</li>
				);
			})}
		</ul>
	);
}
