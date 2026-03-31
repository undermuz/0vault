import { Encrypter, Decrypter } from "age-encryption";

/** Match Java VaultAge.DEFAULT_SCRYPT_LOG_N and age -p defaults. */
export const DEFAULT_SCRYPT_LOG_N = 18;

export async function decryptToMemory(
	cipherBytes: Uint8Array,
	passphrase: string,
): Promise<Uint8Array> {
	const d = new Decrypter();
	d.addPassphrase(passphrase);
	return d.decrypt(cipherBytes);
}

export async function encryptBytes(
	plainBytes: Uint8Array,
	passphrase: string,
	scryptLogN: number = DEFAULT_SCRYPT_LOG_N,
): Promise<Uint8Array> {
	const e = new Encrypter();
	e.setPassphrase(passphrase);
	e.setScryptWorkFactor(scryptLogN);
	return e.encrypt(plainBytes);
}
