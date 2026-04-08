import { NoahDocumentData, NoahCircuitInputOptions, NoahNFCParser } from './nfc.js';
import { NoahMRZScanner, NoahMRZScanOptions } from './mrz.js';
import type { NoahProverInputs } from '../circuit/prover.js';
import type { NoahPreparedInputOptions } from '../circuit/inputs.js';
import { prepareProverInputs } from '../circuit/inputs.js';

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

    /**
     * Builds circuit-ready prover inputs from an image, including the derived public inputs
     * required by the current Noir circuit.
     */
    async prepareFromImage(
        imageSource: string | Uint8Array,
        additional: NoahPreparedInputOptions,
        options: NoahMRZScanOptions = {}
    ): Promise<NoahProverInputs> {
        const document = await this.scanner.scanDocument(imageSource, options);
        return prepareProverInputs(document, additional);
    }

    /**
     * Builds circuit-ready prover inputs from normalized NFC or MRZ data, including
     * the derived public inputs required by the current Noir circuit.
     */
    async prepareFromNFC(
        data: NoahDocumentData,
        additional: NoahPreparedInputOptions
    ): Promise<NoahProverInputs> {
        return prepareProverInputs(data, additional);
    }

    async destroy() {
        await this.scanner.destroy();
    }
}
