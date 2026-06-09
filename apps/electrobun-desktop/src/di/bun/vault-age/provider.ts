import { injectable } from "inversify";
import { Encrypter, Decrypter } from "age-encryption";
import type { IVaultAgeService } from "./types";

/** Match Java VaultAge.DEFAULT_SCRYPT_LOG_N and age -p defaults. */
export const DEFAULT_SCRYPT_LOG_N = 18;

@injectable()
export class VaultAgeService implements IVaultAgeService {
	async decryptToMemory(
		cipherBytes: Uint8Array,
		passphrase: string,
	): Promise<Uint8Array> {
		const d = new Decrypter();
		d.addPassphrase(passphrase);
		return d.decrypt(cipherBytes);
	}

	async encryptBytes(
		plainBytes: Uint8Array,
		passphrase: string,
		scryptLogN: number = DEFAULT_SCRYPT_LOG_N,
	): Promise<Uint8Array> {
		const e = new Encrypter();
		e.setPassphrase(passphrase);
		e.setScryptWorkFactor(scryptLogN);
		return e.encrypt(plainBytes);
	}
}
