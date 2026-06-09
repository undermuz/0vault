import { Decrypter, Encrypter } from "age-encryption";

/** Match desktop VaultAge.DEFAULT_SCRYPT_LOG_N. */
const DEFAULT_SCRYPT_LOG_N = 18;

export async function decryptAgeBytes(
	cipherBytes: Uint8Array,
	passphrase: string,
): Promise<Uint8Array> {
	const d = new Decrypter();
	d.addPassphrase(passphrase);
	return d.decrypt(cipherBytes);
}

export async function encryptAgeBytes(
	plainBytes: Uint8Array,
	passphrase: string,
	scryptLogN: number = DEFAULT_SCRYPT_LOG_N,
): Promise<Uint8Array> {
	const e = new Encrypter();
	e.setPassphrase(passphrase);
	e.setScryptWorkFactor(scryptLogN);
	return e.encrypt(plainBytes);
}
