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
        // Look for two lines of 44 characters starting with P<
        // This is a naive implementation and can be improved with regex
        const lines = text.split('\n')
            .map(l => l.replace(/\s/g, '')) // Remove all whitespace
            .filter(l => l.length >= 44);

        // Find the line starting with P followed by < or a country code
        const line1Index = lines.findIndex(l => l.startsWith('P'));
        if (line1Index === -1 || lines.length < 2) {
            throw new Error('Could not detect valid MRZ lines in image');
        }

        const line1 = lines[line1Index].substring(0, 44);
        const line2 = lines[line1Index + 1].substring(0, 44);

        if (line1.length !== 44 || line2.length !== 44) {
            throw new Error('Detected MRZ lines have invalid length');
        }

        return line1 + line2;
    }
}
