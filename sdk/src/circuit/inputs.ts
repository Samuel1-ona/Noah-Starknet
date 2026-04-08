import { Barretenberg } from '@aztec/bb.js';
import type { NoahProverInputs, NoahVerificationPublicInputs } from './prover.js';
import type { NoahDocumentData } from '../data/nfc.js';
import { NoahDocumentType, NoahMRZDocument, NoahMRZScanner } from '../data/mrz.js';
import { NoahScanError } from '../utils/errors.js';

type NoahFieldValue = string | number | bigint;
type NoahInputDocument = NoahDocumentData | NoahMRZDocument;

export interface NoahPreparedInputOptions {
    merklePath: NoahFieldValue[];
    isLeft: boolean[];
    userSecret: NoahFieldValue;
    userAddress?: string;
}

export interface NoahDerivedPublicInputs extends NoahVerificationPublicInputs {
    leaf: string;
}

export async function derivePublicInputs(
    data: NoahInputDocument,
    options: NoahPreparedInputOptions
): Promise<NoahDerivedPublicInputs> {
    validateMerkleInputs(options);

    const document = normalizeDocument(data);
    const { nameBytes, documentNumberBytes } = extractCircuitFields(document);

    const nameHash = await pedersenHash([
        packBytes(nameBytes.slice(0, 20)),
        packBytes(nameBytes.slice(20, 38))
    ]);
    const docNumHash = await pedersenHash([packBytes(documentNumberBytes)]);
    const nullifier = await pedersenHash([normalizeField(options.userSecret), docNumHash]);

    let current = await pedersenHash([nameHash, docNumHash]);
    const leaf = current;

    for (let index = 0; index < options.merklePath.length; index += 1) {
        const sibling = normalizeField(options.merklePath[index]);
        current = options.isLeft[index]
            ? await pedersenHash([current, sibling])
            : await pedersenHash([sibling, current]);
    }

    return {
        passportRoot: toHex(current),
        nullifier: toHex(nullifier),
        nameHash: toHex(nameHash),
        docNumHash: toHex(docNumHash),
        birthYear: BigInt(document.birthYear),
        expiryDate: BigInt(document.expiryDate),
        leaf: toHex(leaf)
    };
}

export async function prepareProverInputs(
    data: NoahInputDocument,
    options: NoahPreparedInputOptions
): Promise<NoahProverInputs> {
    const document = normalizeDocument(data);
    const publicInputs = await derivePublicInputs(document, options);

    // Noir WASM (ACVM) is sensitive to types. 
    // Field elements MUST be hex strings. 
    // Integers (u8/u32) MUST be JS numbers.
    return {
        mrz: Array.from(document.circuitMrz).map(char => char.charCodeAt(0)),
        doc_type: Number(document.docType),
        user_secret: toHex(BigInt(options.userSecret)),
        merkle_path: options.merklePath.map(value => toHex(BigInt(value))),
        is_left: options.isLeft,
        passport_root: toHex(BigInt(publicInputs.passportRoot)),
        nullifier: toHex(BigInt(publicInputs.nullifier)),
        name_hash: toHex(BigInt(publicInputs.nameHash)),
        doc_num_hash: toHex(BigInt(publicInputs.docNumHash)),
        birth_year: Number(publicInputs.birthYear),
        expiry_date: Number(publicInputs.expiryDate),
        user_address: options.userAddress
    };
}

function normalizeDocument(data: NoahInputDocument): NoahMRZDocument {
    if ('circuitMrz' in data) {
        return data;
    }

    return NoahMRZScanner.normalizeDocument(data.mrz, data.docType);
}

function validateMerkleInputs(options: NoahPreparedInputOptions) {
    if (options.merklePath.length !== 20) {
        throw new NoahScanError(`Expected merklePath to contain 20 siblings, received ${options.merklePath.length}`);
    }

    if (options.isLeft.length !== 20) {
        throw new NoahScanError(`Expected isLeft to contain 20 direction flags, received ${options.isLeft.length}`);
    }
}

function extractCircuitFields(document: NoahMRZDocument): { nameBytes: number[]; documentNumberBytes: number[] } {
    const mrz = Array.from(document.circuitMrz).map(char => char.charCodeAt(0));

    switch (document.docType) {
        case NoahDocumentType.TD3:
            return {
                nameBytes: mrz.slice(6, 44),
                documentNumberBytes: mrz.slice(44, 53)
            };
        case NoahDocumentType.TD1: {
            const nameBytes = Array(38).fill(0);
            for (let index = 0; index < 30; index += 1) {
                nameBytes[index] = mrz[60 + index];
            }

            return {
                nameBytes,
                documentNumberBytes: mrz.slice(5, 14)
            };
        }
        case NoahDocumentType.TD2: {
            const nameBytes = Array(38).fill(0);
            for (let index = 0; index < 31; index += 1) {
                nameBytes[index] = mrz[5 + index];
            }

            return {
                nameBytes,
                documentNumberBytes: mrz.slice(36, 45)
            };
        }
        default:
            throw new NoahScanError(`Unsupported document type: ${document.docType}`);
    }
}

async function pedersenHash(values: bigint[]): Promise<bigint> {
    const api = await Barretenberg.initSingleton();
    const response = await api.pedersenHash({
        inputs: values.map(value => bigintToBytes(value)),
        hashIndex: 0
    });

    return bytesToBigint(response.hash);
}

function packBytes(bytes: number[]): bigint {
    let packed = 0n;

    for (const byte of bytes) {
        packed = (packed * 256n) + BigInt(byte);
    }

    return packed;
}

function normalizeField(value: NoahFieldValue): bigint {
    return BigInt(value);
}

function bigintToBytes(value: bigint): Uint8Array {
    const hex = value.toString(16).padStart(64, '0');
    const bytes = new Uint8Array(32);

    for (let index = 0; index < 32; index += 1) {
        bytes[index] = parseInt(hex.slice(index * 2, (index * 2) + 2), 16);
    }

    return bytes;
}

function bytesToBigint(value: Uint8Array): bigint {
    let hex = '';

    for (const byte of value) {
        hex += byte.toString(16).padStart(2, '0');
    }

    return BigInt(`0x${hex}`);
}

function toHex(value: bigint): string {
    return `0x${value.toString(16).padStart(64, '0')}`;
}
