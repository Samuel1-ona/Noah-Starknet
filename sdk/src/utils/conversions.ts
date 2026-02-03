import { num } from 'starknet';

/**
 * Standardize input to BigInt
 */
export function toBigInt(value: string | number | bigint | any): bigint {
    return BigInt(num.toHex(value));
}

/**
 * Converts a string to an array of BigInts representing its character codes
 * Useful for MRZ parsing simulation or padding
 */
export function stringToBigInts(str: string, length?: number): bigint[] {
    const result = Array.from(str).map(char => BigInt(char.charCodeAt(0)));
    if (length && result.length < length) {
        while (result.length < length) {
            result.push(0n);
        }
    }
    return result;
}

/**
 * Packs small integers into larger field elements if needed (optional)
 */
export function packBytes(bytes: number[]): bigint[] {
    // Basic wrapper for now, can be expanded for specific circuit needs
    return bytes.map(b => BigInt(b));
}
