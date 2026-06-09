import { describe, expect, test } from "bun:test";
import { Container } from "inversify";
import "reflect-metadata";
import { textFromBytes } from "@vault/editTracker";
import { VaultArchiveModule } from "./module";
import {
	VaultArchiveFactoryToken,
	type IVaultArchiveFactory,
} from "./types";

function createFactory(): IVaultArchiveFactory {
	const di = new Container();
	di.load(VaultArchiveModule);
	return di.get<IVaultArchiveFactory>(VaultArchiveFactoryToken);
}

describe("VaultArchiveFactory", () => {
	test("legacy single blob uses content.txt", () => {
		const archives = createFactory();
		const plain = new TextEncoder().encode("hello");
		const a = archives.fromDecryptedPayload(plain);
		expect(textFromBytes(a.getBytes("content.txt"))).toBe("hello");
		expect(a.isZipSource).toBe(false);
	});

	test("zip roundtrip preserves entry", () => {
		const archives = createFactory();
		const a = archives.fromZipBytes(
			archives
				.fromPlainFile("x.txt", new TextEncoder().encode("z"))
				.toZipBytes(),
			true,
		);
		expect(textFromBytes(a.getBytes("x.txt"))).toBe("z");
	});

	test("normalizeEntryName strips leading slashes", () => {
		const archives = createFactory();
		expect(archives.normalizeEntryName("/a//b")).toBe("a//b");
	});

	test("JSON snapshot preserves order and zipSource", () => {
		const archives = createFactory();
		const a = archives.empty();
		a.putBytes("b.txt", new Uint8Array([1]));
		a.putBytes("a.txt", new Uint8Array([2]));
		const b = archives.fromJSON(a.toJSON());
		expect([...b.entriesView().keys()]).toEqual([...a.entriesView().keys()]);
	});
});
