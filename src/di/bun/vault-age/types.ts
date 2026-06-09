export const VaultAgeServiceToken = Symbol.for("VaultAgeService");

export interface IVaultAgeService {
	decryptToMemory(
		cipherBytes: Uint8Array,
		passphrase: string,
	): Promise<Uint8Array>;
	encryptBytes(
		plainBytes: Uint8Array,
		passphrase: string,
		scryptLogN?: number,
	): Promise<Uint8Array>;
}
