import { NoahStorage } from '../storage/base.js';
import { num } from 'starknet';

/**
 * Manages the user secret (salt) for nullifier privacy.
 * In a production app, this should ideally be integrated with a secure enclave or passkey.
 */
export class NoahBlindedDataManager {
    private readonly SECRET_KEY = 'user_secret';

    constructor(private storage: NoahStorage) { }

    /**
     * Gets or generates a stable user secret
     */
    async getOrCreateSecret(): Promise<bigint> {
        const existing = await this.storage.getItem(this.SECRET_KEY);
        if (existing) {
            return BigInt(existing);
        }

        // Generate a new 256-bit secret
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
        return BigInt('0x' + hex);
    }
}
