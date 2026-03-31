import { describe, expect, test } from "bun:test";
import { VaultArchive } from "./archive";
import { textFromBytes } from "./editTracker";

describe("VaultArchive", () => {
	test("legacy single blob uses content.txt", () => {
		const plain = new TextEncoder().encode("hello");
		const a = VaultArchive.fromDecryptedPayload(plain);
		expect(textFromBytes(a.getBytes("content.txt"))).toBe("hello");
		expect(a.isZipSource).toBe(false);
	});

	test("zip roundtrip preserves entry", () => {
		const a = VaultArchive.fromZipBytes(
			VaultArchive.fromPlainFile("x.txt", new TextEncoder().encode("z")).toZipBytes(),
			true,
		);
		expect(textFromBytes(a.getBytes("x.txt"))).toBe("z");
	});

	test("normalizeEntryName strips leading slashes", () => {
		expect(VaultArchive.normalizeEntryName("/a//b")).toBe("a//b");
	});

	test("JSON snapshot preserves order and zipSource", () => {
		const a = VaultArchive.empty();
		a.putBytes("b.txt", new Uint8Array([1]));
		a.putBytes("a.txt", new Uint8Array([2]));
		const b = VaultArchive.fromJSON(a.toJSON());
		expect([...b.entriesView().keys()]).toEqual([...a.entriesView().keys()]);
	});
});
