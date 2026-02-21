import { NoahMRZScanner } from './mrz.js';
import { NFCPassportData, NoahNFCParser } from './nfc.js';
import { NoahProverInputs } from '../circuit/prover.js';

export type DataAcquisitionMethod = 'NFC' | 'OCR';

export class NoahDataProvider {
    public scanner: NoahMRZScanner;

    constructor() {
        this.scanner = new NoahMRZScanner();
    }

    /**
     * High-level entry point for developers to get ZK inputs from a passport image (OCR).
     * Note: This only provides the MRZ part. Authenticity fields like signature 
     * must still be provided by the developer or a certification authority.
     */
    async fromImage(
        imageSource: string | Uint8Array,
        authenticity: Omit<NFCPassportData, 'mrz'>,
        additional: any
    ): Promise<NoahProverInputs> {
        const mrz = await this.scanner.scanImage(imageSource);
        return NoahNFCParser.createProverInputs(
            { ...authenticity, mrz },
            additional
        );
    }

    /**
     * High-level entry point for developers to get ZK inputs from NFC chip data.
     */
    fromNFC(data: NFCPassportData, additional: any): NoahProverInputs {
        return NoahNFCParser.createProverInputs(data, additional);
    }

    async destroy() {
        await this.scanner.destroy();
    }
}
