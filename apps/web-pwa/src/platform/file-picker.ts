function pickViaInput(multiple: boolean): Promise<File[]> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.multiple = multiple;
		input.onchange = () => resolve([...(input.files ?? [])]);
		input.click();
	});
}

export async function pickOpenFiles(multiple: boolean): Promise<File[]> {
	if ("showOpenFilePicker" in window) {
		try {
			const handles = await window.showOpenFilePicker({
				multiple,
				types: [
					{
						description: "Vault files",
						accept: {
							"application/octet-stream": [".age", ".zip"],
							"application/zip": [".zip"],
							"text/plain": [".txt", ".md", ".json"],
						},
					},
				],
			});
			const files: File[] = [];
			for (const handle of handles) {
				files.push(await handle.getFile());
			}
			return files;
		} catch (e) {
			if ((e as Error).name === "AbortError") return [];
		}
	}
	return pickViaInput(multiple);
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
	if (!("showDirectoryPicker" in window)) return null;
	try {
		return await window.showDirectoryPicker();
	} catch (e) {
		if ((e as Error).name === "AbortError") return null;
		throw e;
	}
}
