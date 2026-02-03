import { createWorker, Worker } from 'tesseract.js';

export class NoahMRZScanner {
    private worker: Worker | null = null;

    /**
     * Initializes the Tesseract worker. 
     * Developers can call this explicitly to warm up the OCR engine.
     */
    async init() {
        if (!this.worker) {
            this.worker = await createWorker('eng');
            // Passport MRZ uses OCR-B font, which is standard. 
            // We can further tune parameters here if needed.
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
            });
        }
    }

    /**
     * Scans an image and extracts the 88-character MRZ string.
     * @param imageSource Path to image, URL, or Buffer
     * @returns The combined 88-character MRZ string
     */
    async scanImage(imageSource: string | Buffer): Promise<string> {
        await this.init();
        if (!this.worker) throw new Error('Failed to initialize OCR worker');

        const { data: { text } } = await this.worker.recognize(imageSource);
        return this.parseMRZ(text);
    }

    /**
     * Cleans up the OCR worker to free resources.
     */
    async destroy() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }

    private parseMRZ(text: string): string {
        const lines = text.split('\n')
            .map(l => l.replace(/\s/g, ''))
            .filter(l => l.length >= 44);

        const line1Index = lines.findIndex(l => l.startsWith('P'));
        if (line1Index === -1 || lines.length < 2) {
            throw new Error('Could not detect valid MRZ lines in image');
        }

        const line1 = lines[line1Index].substring(0, 44);
        const line2 = lines[line1Index + 1].substring(0, 44);

        if (line1.length !== 44 || line2.length !== 44) {
            throw new Error('Detected MRZ lines have invalid length');
        }

        const mrz = line1 + line2;
        if (!this.validateMRZ(mrz)) {
            throw new Error('MRZ check-digit validation failed. Please try a clearer photo.');
        }

        return mrz;
    }

    /**
     * Validates MRZ check digits according to ICAO 9303
     */
    public validateMRZ(mrz: string): boolean {
        if (mrz.length !== 88) return false;

        // Document number check digit (pos 53)
        const docNumValid = this.validateCheckDigit(mrz.substring(44, 53), mrz[53]);
        // DOB check digit (pos 63)
        const dobValid = this.validateCheckDigit(mrz.substring(57, 63), mrz[63]);
        // Expiry check digit (pos 71)
        const expiryValid = this.validateCheckDigit(mrz.substring(65, 71), mrz[71]);
        // Composite check digit (pos 87)
        const compositeData = mrz.substring(44, 54) + mrz.substring(57, 64) + mrz.substring(65, 72) + mrz.substring(72, 87);
        const compositeValid = this.validateCheckDigit(compositeData, mrz[87]);

        return docNumValid && dobValid && expiryValid && compositeValid;
    }

    private validateCheckDigit(data: string, expected: string): boolean {
        const weights = [7, 3, 1];
        let sum = 0;

        for (let i = 0; i < data.length; i++) {
            const char = data[i];
            let val = 0;
            if (char === '<') {
                val = 0;
            } else if (/[0-9]/.test(char)) {
                val = parseInt(char);
            } else {
                val = char.charCodeAt(0) - 55; // A=10, B=11...
            }
            sum += val * weights[i % 3];
        }

        return (sum % 10).toString() === expected;
    }
}
