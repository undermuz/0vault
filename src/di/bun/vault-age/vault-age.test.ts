import { describe, expect, test } from "bun:test";
import { VaultAgeService } from "./provider";

describe("VaultAgeService", () => {
	test("passphrase roundtrip matches default scrypt factor", async () => {
		const vaultAge = new VaultAgeService();
		const plain = new TextEncoder().encode("vault-age interoperability");
		const pass = "test-passphrase-roundtrip";
		const ct = await vaultAge.encryptBytes(plain, pass);
		const out = await vaultAge.decryptToMemory(ct, pass);
		expect(out).toEqual(plain);
	});
});
