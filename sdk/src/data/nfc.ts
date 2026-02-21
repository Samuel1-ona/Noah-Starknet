import { NoahProverInputs } from '../circuit/prover.js';

export interface NFCPassportData {
    mrz: string; // The 88-char MRZ string read from the chip
    signature: Uint8Array | string; // The ECDSA signature (64 bytes)
    publicKeyX: Uint8Array | string; // 32 bytes
    publicKeyY: Uint8Array | string; // 32 bytes
    hashedMRZ: Uint8Array | string; // SHA256 of the MRZ
}

export class NoahNFCParser {
    /**
     * Maps raw NFC data to the format required by the NoahProver.
     * This handles hex string to number array conversions.
     */
    static createProverInputs(
        data: NFCPassportData,
        additional: {
            jurisdictionRoot: string | bigint;
            jurisdictionIndex: number | bigint;
            jurisdictionHashPath: string[] | bigint[];
            membershipRoot: string | bigint;
            membershipIndex: number | bigint;
            membershipHashPath: string[] | bigint[];
            actionId: string | bigint;
            nullifier: string | bigint;
            userSecret: string | bigint;
            currentDate: { year: number; month: number; day: number };
            minAge: number;
        }
    ): NoahProverInputs {
        return {
            mrz: this.toArray(data.mrz),
            pub_key_x: this.toUint8Array(data.publicKeyX),
            pub_key_y: this.toUint8Array(data.publicKeyY),
            signature: this.toUint8Array(data.signature),
            hashed_mrz: this.toUint8Array(data.hashedMRZ),
            jurisdiction_root: additional.jurisdictionRoot,
            jurisdiction_index: additional.jurisdictionIndex,
            jurisdiction_hash_path: additional.jurisdictionHashPath as any,
            membership_root: additional.membershipRoot,
            membership_index: additional.membershipIndex,
            membership_hash_path: additional.membershipHashPath as any,
            action_id: additional.actionId,
            nullifier: additional.nullifier,
            user_secret: additional.userSecret,
            current_year: additional.currentDate.year,
            current_month: additional.currentDate.month,
            current_day: additional.currentDate.day,
            min_age: additional.minAge,
        };
    }

    private static toArray(mrz: string): number[] {
        return Array.from(mrz).map(c => c.charCodeAt(0));
    }

    private static toUint8Array(data: Uint8Array | string): any {
        if (data instanceof Uint8Array) {
            return Array.from(data);
        }
        // Handle hex string
        const hex = data.startsWith('0x') ? data.slice(2) : data;
        const result = [];
        for (let i = 0; i < hex.length; i += 2) {
            result.push(parseInt(hex.slice(i, i + 2), 16));
        }
        return result;
    }
}
