import { NoahProverInputs } from '../circuit/prover.js';
import { NoahDocumentType, NoahMRZDocument, NoahMRZScanner } from './mrz.js';
import { NoahScanError } from '../utils/errors.js';

export interface NoahDocumentData {
    mrz: string;
    docType: NoahDocumentType;
}

export interface NoahCircuitInputOptions {
    passportRoot: string | bigint | number;
    merklePath: Array<string | bigint | number>;
    isLeft: boolean[];
    nullifier: string | bigint | number;
    nameHash: string | bigint | number;
    docNumHash: string | bigint | number;
    userSecret: string | bigint | number;
    birthYear?: string | bigint | number;
    expiryDate?: string | bigint | number;
    userAddress?: string;
}

export class NoahNFCParser {
    /**
     * Builds circuit-ready prover inputs from normalized MRZ data.
     * The current circuit only consumes MRZ + Merkle/public inputs, so the same
     * builder works for OCR flows and NFC readers that expose MRZ text.
     */
    static createProverInputs(
        data: NoahDocumentData | NoahMRZDocument,
        additional: NoahCircuitInputOptions
    ): NoahProverInputs {
        const normalized = NoahMRZScanner.normalizeDocument(data.mrz, data.docType);

        if (additional.merklePath.length !== 20) {
            throw new NoahScanError(`Expected merklePath to contain 20 siblings, received ${additional.merklePath.length}`);
        }

        if (additional.isLeft.length !== 20) {
            throw new NoahScanError(`Expected isLeft to contain 20 direction flags, received ${additional.isLeft.length}`);
        }

        const birthYear = additional.birthYear !== undefined ? BigInt(additional.birthYear) : BigInt(normalized.birthYear);
        const expiryDate = additional.expiryDate !== undefined ? BigInt(additional.expiryDate) : BigInt(normalized.expiryDate);

        if (birthYear !== BigInt(normalized.birthYear)) {
            throw new NoahScanError(`birthYear does not match the normalized ${normalized.format} MRZ payload`);
        }

        if (expiryDate !== BigInt(normalized.expiryDate)) {
            throw new NoahScanError(`expiryDate does not match the normalized ${normalized.format} MRZ payload`);
        }

        return {
            mrz: this.toArray(normalized.circuitMrz),
            doc_type: normalized.docType,
            user_secret: additional.userSecret,
            merkle_path: additional.merklePath as any,
            is_left: additional.isLeft,
            passport_root: additional.passportRoot,
            nullifier: additional.nullifier,
            name_hash: additional.nameHash,
            doc_num_hash: additional.docNumHash,
            birth_year: birthYear,
            expiry_date: expiryDate,
            user_address: additional.userAddress
        };
    }

    private static toArray(mrz: string): number[] {
        return Array.from(mrz).map(c => c.charCodeAt(0));
    }
}

export type NFCPassportData = NoahDocumentData;
