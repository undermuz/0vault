import {
	copyFile,
	unlink,
	writeFile,
} from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { randomBytes } from "node:crypto";

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/** Java VaultAge.moveReplacingWithRetry — copy+delete with retries for Windows file locks. */
export async function moveReplacingWithRetry(
	source: string,
	target: string,
): Promise<void> {
	await sleep(300);
	const maxAttempts = 25;
	let last: Error | null = null;
	for (let i = 0; i < maxAttempts; i++) {
		try {
			await copyFile(source, target);
			await unlink(source);
			return;
		} catch (copyEx) {
			last = copyEx instanceof Error ? copyEx : new Error(String(copyEx));
		}
		try {
			const { rename } = await import("node:fs/promises");
			await rename(source, target);
			return;
		} catch (moveEx) {
			last = moveEx instanceof Error ? moveEx : new Error(String(moveEx));
		}
		await sleep(Math.min(200 * (i + 1), 2000));
	}
	try {
		await unlink(source);
	} catch {
		/* ignore */
	}
	throw new Error(
		`Не удалось записать контейнер. Закройте в других программах файл: ${target}. ${
			last?.message ?? ""
		}`,
	);
}

export async function encryptBytesReplaceInParent(
	parentDir: string,
	tempPrefix: string,
	plainBytes: Uint8Array,
	passphrase: string,
	targetAgePath: string,
	encrypt: (
		plain: Uint8Array,
		pass: string,
	) => Promise<Uint8Array>,
): Promise<void> {
	const dir = resolve(parentDir || ".");
	const suffix = randomBytes(8).toString("hex");
	const partial = join(dir, `${tempPrefix}${suffix}.age.new`);
	try {
		const cipher = await encrypt(plainBytes, passphrase);
		await writeFile(partial, cipher);
		await moveReplacingWithRetry(partial, resolve(targetAgePath));
	} catch (e) {
		try {
			await unlink(partial);
		} catch {
			/* ignore */
		}
		throw e;
	}
}

export function parentOf(filePath: string): string {
	return dirname(resolve(filePath));
}
