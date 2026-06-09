export const FileReplaceServiceToken = Symbol.for("FileReplaceService");

export interface IFileReplaceService {
	moveReplacingWithRetry(source: string, target: string): Promise<void>;
	encryptBytesReplaceInParent(
		parentDir: string,
		tempPrefix: string,
		plainBytes: Uint8Array,
		passphrase: string,
		targetAgePath: string,
		encrypt: (plain: Uint8Array, pass: string) => Promise<Uint8Array>,
	): Promise<void>;
	parentOf(filePath: string): string;
}
