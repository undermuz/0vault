import { describe, expect, test } from "bun:test";
import { decryptToMemory, encryptBytes } from "./vaultAge";

describe("vaultAge", () => {
	test("passphrase roundtrip matches default scrypt factor", async () => {
		const plain = new TextEncoder().encode("vault-age interoperability");
		const pass = "test-passphrase-roundtrip";
		const ct = await encryptBytes(plain, pass);
		const out = await decryptToMemory(ct, pass);
		expect(out).toEqual(plain);
	});
});
