import { Button } from "@heroui/react";
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
		<ul className={level === 0 ? "tree-root" : "pl-3 border-l border-separator ml-1"}>
			{branches.map((br, i) => {
				if (br.node.kind === "dir") {
					const segs = [...parentSegments, br.node.name];
					return (
						<li key={`d-${segs.join("/")}-${i}`} className="py-0.5">
							<Button
								variant="ghost"
								size="sm"
								className="w-full justify-start h-auto min-h-0 py-1 px-2 text-muted"
								onPress={() => onSelectDir(segs)}
							>
								{br.node.name}/
							</Button>
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
						<Button
							variant="ghost"
							size="sm"
							className={`w-full justify-start h-auto min-h-0 py-1 px-2 font-mono text-sm rounded-md ${
								sel ? "list-item-selected" : ""
							}`}
							onPress={() => onSelectFile(path)}
						>
							{leaf}
							{dirty ? <span className="text-warning"> *</span> : null}
						</Button>
					</li>
				);
			})}
		</ul>
	);
}
