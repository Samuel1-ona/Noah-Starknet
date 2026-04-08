export const BN254_FIELD_MODULUS = BigInt(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

export function normalizeFieldElement(value: string | number | bigint): bigint {
    const normalized = BigInt(value) % BN254_FIELD_MODULUS;
    return normalized >= 0n ? normalized : normalized + BN254_FIELD_MODULUS;
}

export function isWithinField(value: string | number | bigint): boolean {
    const normalized = BigInt(value);
    return normalized >= 0n && normalized < BN254_FIELD_MODULUS;
}
