import { NoahStorage } from '../storage/base.js';

/**
 * BN254 Prime Modulus used by Noir/Barretenberg.
 * Values passed as "Field" to the circuit MUST be less than this constant.
 */
export const BN254_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Manages the user secret (salt) for nullifier privacy.
 * In a production app, this should ideally be integrated with a secure enclave or passkey.
 */
export class NoahBlindedDataManager {
    private readonly SECRET_KEY = 'user_secret';

    constructor(private storage: NoahStorage) { }

    /**
     * Gets or generates a stable user secret.
     * Automatically reduces existing secrets if they exceed the field modulus.
     */
    async getOrCreateSecret(): Promise<bigint> {
        const existing = await this.storage.getItem(this.SECRET_KEY);
        if (existing) {
            let secret = BigInt(existing);
            // Ensure the secret is field-safe
            if (secret >= BN254_MODULUS) {
                secret = secret % BN254_MODULUS;
                await this.storage.setItem(this.SECRET_KEY, secret.toString());
            }
            return secret;
        }

        // Generate a new field-safe secret
        const secret = this.generateRandomSecret();
        await this.storage.setItem(this.SECRET_KEY, secret.toString());
        return secret;
    }

    /**
     * Resets the secret (Caution: this will change all future nullifiers for this user)
     */
    async resetSecret(): Promise<void> {
        await this.storage.removeItem(this.SECRET_KEY);
    }

    private generateRandomSecret(): bigint {
        const entropy = crypto.getRandomValues(new Uint8Array(32));
        const hex = Array.from(entropy).map(b => b.toString(16).padStart(2, '0')).join('');
        const raw = BigInt('0x' + hex);
        // Reduce modulo BN254 prime to ensure it fits in a Noir Field
        return raw % BN254_MODULUS;
    }
}
