import { NoahDocumentData, NoahCircuitInputOptions, NoahNFCParser } from './nfc.js';
import { NoahMRZScanner, NoahMRZScanOptions } from './mrz.js';
import { NoahProverInputs } from '../circuit/prover.js';

export type DataAcquisitionMethod = 'NFC' | 'OCR';

export class NoahDataProvider {
    public scanner: NoahMRZScanner;

    constructor() {
        this.scanner = new NoahMRZScanner();
    }

    /**
     * High-level entry point for developers to turn an OCR image into circuit-ready inputs.
     */
    async fromImage(
        imageSource: string | Uint8Array,
        additional: NoahCircuitInputOptions,
        options: NoahMRZScanOptions = {}
    ): Promise<NoahProverInputs> {
        const document = await this.scanner.scanDocument(imageSource, options);
        return NoahNFCParser.createProverInputs(document, additional);
    }

    /**
     * High-level entry point for developers to turn MRZ data from an NFC reader into
     * circuit-ready inputs.
     */
    fromNFC(data: NoahDocumentData, additional: NoahCircuitInputOptions): NoahProverInputs {
        return NoahNFCParser.createProverInputs(data, additional);
    }

    async destroy() {
        await this.scanner.destroy();
    }
}
