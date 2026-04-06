import { createWorker, Worker, PSM } from 'tesseract.js';
import { NoahScanError } from '../utils/errors.js';

export enum NoahDocumentType {
    TD3 = 0,
    TD1 = 1,
    TD2 = 2
}

export interface NoahMRZScanOptions {
    preferredDocType?: NoahDocumentType;
}

export interface NoahMRZDocument {
    docType: NoahDocumentType;
    format: 'TD3' | 'TD1' | 'TD2';
    mrz: string;
    circuitMrz: string;
    lines: string[];
    birthYear: number;
    expiryDate: number;
    rawText?: string;
}

type FieldKind = 'alpha' | 'alnum' | 'digit' | 'name' | 'sex';

interface Range {
    start: number;
    end: number;
}

interface CheckRange extends Range {
    checkDigitIndex: number;
    kind: 'alnum' | 'digit';
}

interface Layout {
    docType: NoahDocumentType;
    format: 'TD3' | 'TD1' | 'TD2';
    lineLength: number;
    lineCount: number;
    totalLength: number;
    fields: Array<Range & { kind: FieldKind }>;
    docNumber: CheckRange;
    birth: CheckRange;
    expiry: CheckRange;
    optional?: CheckRange;
    composite?: {
        ranges: Range[];
        checkDigitIndex: number;
    };
}

interface Candidate {
    layout: Layout;
    normalized: string;
    score: number;
}

const ALL_DOCUMENT_TYPES: NoahDocumentType[] = [
    NoahDocumentType.TD3,
    NoahDocumentType.TD1,
    NoahDocumentType.TD2
];

const LAYOUTS: Record<NoahDocumentType, Layout> = {
    [NoahDocumentType.TD3]: {
        docType: NoahDocumentType.TD3,
        format: 'TD3',
        lineLength: 44,
        lineCount: 2,
        totalLength: 88,
        fields: [
            { start: 0, end: 2, kind: 'alpha' },
            { start: 2, end: 5, kind: 'alpha' },
            { start: 5, end: 44, kind: 'name' },
            { start: 44, end: 53, kind: 'alnum' },
            { start: 53, end: 54, kind: 'digit' },
            { start: 54, end: 57, kind: 'alpha' },
            { start: 57, end: 63, kind: 'digit' },
            { start: 63, end: 64, kind: 'digit' },
            { start: 64, end: 65, kind: 'sex' },
            { start: 65, end: 71, kind: 'digit' },
            { start: 71, end: 72, kind: 'digit' },
            { start: 72, end: 86, kind: 'alnum' },
            { start: 86, end: 88, kind: 'digit' }
        ],
        docNumber: { start: 44, end: 53, checkDigitIndex: 53, kind: 'alnum' },
        birth: { start: 57, end: 63, checkDigitIndex: 63, kind: 'digit' },
        expiry: { start: 65, end: 71, checkDigitIndex: 71, kind: 'digit' },
        optional: { start: 72, end: 86, checkDigitIndex: 86, kind: 'alnum' },
        composite: {
            ranges: [
                { start: 44, end: 54 },
                { start: 57, end: 64 },
                { start: 65, end: 72 },
                { start: 72, end: 87 }
            ],
            checkDigitIndex: 87
        }
    },
    [NoahDocumentType.TD1]: {
        docType: NoahDocumentType.TD1,
        format: 'TD1',
        lineLength: 30,
        lineCount: 3,
        totalLength: 90,
        fields: [
            { start: 0, end: 2, kind: 'alpha' },
            { start: 2, end: 5, kind: 'alpha' },
            { start: 5, end: 14, kind: 'alnum' },
            { start: 14, end: 15, kind: 'digit' },
            { start: 15, end: 30, kind: 'alnum' },
            { start: 30, end: 36, kind: 'digit' },
            { start: 36, end: 37, kind: 'digit' },
            { start: 37, end: 38, kind: 'sex' },
            { start: 38, end: 44, kind: 'digit' },
            { start: 44, end: 45, kind: 'digit' },
            { start: 45, end: 48, kind: 'alpha' },
            { start: 48, end: 59, kind: 'alnum' },
            { start: 59, end: 60, kind: 'digit' },
            { start: 60, end: 90, kind: 'name' }
        ],
        docNumber: { start: 5, end: 14, checkDigitIndex: 14, kind: 'alnum' },
        birth: { start: 30, end: 36, checkDigitIndex: 36, kind: 'digit' },
        expiry: { start: 38, end: 44, checkDigitIndex: 44, kind: 'digit' },
        composite: {
            ranges: [
                { start: 5, end: 30 },
                { start: 30, end: 37 },
                { start: 38, end: 45 },
                { start: 48, end: 59 }
            ],
            checkDigitIndex: 59
        }
    },
    [NoahDocumentType.TD2]: {
        docType: NoahDocumentType.TD2,
        format: 'TD2',
        lineLength: 36,
        lineCount: 2,
        totalLength: 72,
        fields: [
            { start: 0, end: 2, kind: 'alpha' },
            { start: 2, end: 5, kind: 'alpha' },
            { start: 5, end: 36, kind: 'name' },
            { start: 36, end: 45, kind: 'alnum' },
            { start: 45, end: 46, kind: 'digit' },
            { start: 46, end: 49, kind: 'alpha' },
            { start: 49, end: 55, kind: 'digit' },
            { start: 55, end: 56, kind: 'digit' },
            { start: 56, end: 57, kind: 'sex' },
            { start: 57, end: 63, kind: 'digit' },
            { start: 63, end: 64, kind: 'digit' },
            { start: 64, end: 71, kind: 'alnum' },
            { start: 71, end: 72, kind: 'digit' }
        ],
        docNumber: { start: 36, end: 45, checkDigitIndex: 45, kind: 'alnum' },
        birth: { start: 49, end: 55, checkDigitIndex: 55, kind: 'digit' },
        expiry: { start: 57, end: 63, checkDigitIndex: 63, kind: 'digit' },
        composite: {
            ranges: [
                { start: 36, end: 46 },
                { start: 49, end: 56 },
                { start: 57, end: 64 },
                { start: 64, end: 71 }
            ],
            checkDigitIndex: 71
        }
    }
};

export class NoahMRZScanner {
    private worker: Worker | null = null;

    /**
     * Initializes the Tesseract worker. 
     * Developers can call this explicitly to warm up the OCR engine.
     */
    async init() {
        if (!this.worker) {
            this.worker = await createWorker('eng');
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
                tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
                preserve_interword_spaces: '1'
            });
        }
    }

    /**
     * Scans an image and extracts the normalized MRZ string.
     * @param imageSource Path to image, URL, or Uint8Array
     * @returns The normalized MRZ string without circuit padding
     */
    async scanImage(imageSource: string | Uint8Array, options: NoahMRZScanOptions = {}): Promise<string> {
        const document = await this.scanDocument(imageSource, options);
        return document.mrz;
    }

    async scanDocument(imageSource: string | Uint8Array, options: NoahMRZScanOptions = {}): Promise<NoahMRZDocument> {
        await this.init();
        if (!this.worker) throw new Error('Failed to initialize OCR worker');

        const attempts = [PSM.SINGLE_BLOCK, PSM.SPARSE_TEXT];
        let lastError: unknown;

        for (const pageSegMode of attempts) {
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
                tessedit_pageseg_mode: pageSegMode,
                preserve_interword_spaces: '1'
            });

            const { data: { text } } = await this.worker.recognize(imageSource as any);

            try {
                return {
                    ...NoahMRZScanner.normalizeDocument(text, options.preferredDocType),
                    rawText: text
                };
            } catch (error) {
                lastError = error;
            }
        }

        throw new NoahScanError(
            lastError instanceof Error
                ? lastError.message
                : 'Could not detect a valid TD3, TD1, or TD2 MRZ in the image'
        );
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

    parseMRZ(text: string, options: NoahMRZScanOptions = {}): NoahMRZDocument {
        return NoahMRZScanner.normalizeDocument(text, options.preferredDocType);
    }

    /**
     * Validates MRZ check digits according to ICAO 9303
     */
    public validateMRZ(mrz: string, docType?: NoahDocumentType): boolean {
        try {
            const document = NoahMRZScanner.normalizeDocument(mrz, docType);
            return validateCandidate(document.mrz, LAYOUTS[document.docType]);
        } catch {
            return false;
        }
    }

    static normalizeDocument(input: string, preferredDocType?: NoahDocumentType): NoahMRZDocument {
        const candidate = selectBestCandidate(input, preferredDocType);
        if (!candidate) {
            throw new NoahScanError('Could not detect a valid TD3, TD1, or TD2 MRZ');
        }

        if (!validateCandidate(candidate.normalized, candidate.layout)) {
            throw new NoahScanError('MRZ check-digit validation failed. Please try a clearer photo.');
        }

        return {
            docType: candidate.layout.docType,
            format: candidate.layout.format,
            mrz: candidate.normalized,
            circuitMrz: toCircuitMrz(candidate.normalized, candidate.layout),
            lines: splitLines(candidate.normalized, candidate.layout.lineLength),
            birthYear: parseBirthYear(candidate.normalized, candidate.layout),
            expiryDate: parseExpiryDate(candidate.normalized, candidate.layout)
        };
    }
}

function selectBestCandidate(input: string, preferredDocType?: NoahDocumentType): Candidate | null {
    const layouts = preferredDocType !== undefined ? [LAYOUTS[preferredDocType]] : ALL_DOCUMENT_TYPES.map(type => LAYOUTS[type]);
    const sanitizedLines = sanitizeLines(input);
    const collapsed = sanitizedLines.join('');
    const candidates: Candidate[] = [];

    for (const layout of layouts) {
        if (sanitizedLines.length >= layout.lineCount) {
            for (let index = 0; index <= sanitizedLines.length - layout.lineCount; index += 1) {
                const lines = sanitizedLines.slice(index, index + layout.lineCount);
                const raw = lines.map(line => line.padEnd(layout.lineLength, '<').slice(0, layout.lineLength)).join('');
                candidates.push(createCandidate(raw, layout));
            }
        }

        if (collapsed.length >= layout.totalLength) {
            for (let index = 0; index <= collapsed.length - layout.totalLength; index += 1) {
                const raw = collapsed.slice(index, index + layout.totalLength);
                candidates.push(createCandidate(raw, layout));

                if (collapsed.length > layout.totalLength) {
                    break;
                }
            }
        }
    }

    candidates.sort((left, right) => right.score - left.score);
    return candidates[0] || null;
}

function createCandidate(raw: string, layout: Layout): Candidate {
    const normalized = repairCheckDigitFields(normalizeByLayout(raw, layout), layout);
    return {
        layout,
        normalized,
        score: scoreCandidate(normalized, layout)
    };
}

function sanitizeLines(input: string): string[] {
    return input
        .toUpperCase()
        .replace(/\r/g, '')
        .replace(/[«‹⟨⟪⟫⟩]/g, '<')
        .replace(/[ \t]+/g, '<')
        .replace(/[_-]+/g, '<')
        .split('\n')
        .map(line => line.replace(/[^A-Z0-9<]/g, '').trim())
        .filter(Boolean);
}

function normalizeByLayout(raw: string, layout: Layout): string {
    const padded = raw.padEnd(layout.totalLength, '<').slice(0, layout.totalLength);
    const chars = padded.split('');

    for (const field of layout.fields) {
        for (let index = field.start; index < field.end; index += 1) {
            chars[index] = normalizeChar(chars[index], field.kind);
        }
    }

    return chars.join('');
}

function normalizeChar(char: string, kind: FieldKind): string {
    const input = char.toUpperCase();

    if (input === '<') {
        return '<';
    }

    if (kind === 'digit') {
        return DIGIT_REPAIRS[input] || input;
    }

    if (kind === 'sex') {
        if (input === 'M' || input === 'F' || input === 'X') {
            return input;
        }

        return '<';
    }

    if (kind === 'alpha' || kind === 'name') {
        if (/[A-Z<]/.test(input)) {
            return input;
        }

        return LETTER_REPAIRS[input] || '<';
    }

    return /[A-Z0-9<]/.test(input) ? input : '<';
}

function repairCheckDigitFields(mrz: string, layout: Layout): string {
    const chars = mrz.split('');
    const repairedRanges = [layout.docNumber, layout.birth, layout.expiry];

    for (const range of repairedRanges) {
        const current = chars.slice(range.start, range.end).join('');
        const expected = normalizeChar(chars[range.checkDigitIndex], 'digit');
        const repaired = repairFieldByCheckDigit(current, expected, range.kind);

        for (let index = 0; index < repaired.length; index += 1) {
            chars[range.start + index] = repaired[index];
        }

        chars[range.checkDigitIndex] = expected;
    }

    if (layout.optional) {
        chars[layout.optional.checkDigitIndex] = normalizeChar(chars[layout.optional.checkDigitIndex], 'digit');
    }

    if (layout.composite) {
        chars[layout.composite.checkDigitIndex] = normalizeChar(chars[layout.composite.checkDigitIndex], 'digit');
    }

    return chars.join('');
}

function repairFieldByCheckDigit(value: string, expectedDigit: string, kind: 'alnum' | 'digit'): string {
    if (!/[0-9]/.test(expectedDigit) || validateCheckDigit(value, expectedDigit)) {
        return value;
    }

    const options = value.split('').map(char => getRepairOptions(char, kind));
    const ambiguousCount = options.filter(option => option.length > 1).length;
    if (ambiguousCount > 8) {
        return value;
    }

    let bestCandidate = value;
    let bestCost = Number.POSITIVE_INFINITY;

    const search = (index: number, current: string[], cost: number) => {
        if (cost >= bestCost) {
            return;
        }

        if (index === options.length) {
            const candidate = current.join('');
            if (validateCheckDigit(candidate, expectedDigit)) {
                bestCandidate = candidate;
                bestCost = cost;
            }
            return;
        }

        for (const option of options[index]) {
            current.push(option.value);
            search(index + 1, current, cost + option.cost);
            current.pop();
        }
    };

    search(0, [], 0);
    return bestCandidate;
}

function getRepairOptions(char: string, kind: 'alnum' | 'digit'): Array<{ value: string; cost: number }> {
    const normalized = kind === 'digit' ? normalizeChar(char, 'digit') : normalizeChar(char, 'alnum');
    const candidates = new Set<string>();
    candidates.add(normalized);

    const alternate = AMBIGUOUS_REPAIRS[normalized] || AMBIGUOUS_REPAIRS[char] || [];
    for (const option of alternate) {
        if (kind === 'digit' && /[0-9]/.test(option)) {
            candidates.add(option);
        }

        if (kind === 'alnum' && /[A-Z0-9<]/.test(option)) {
            candidates.add(option);
        }
    }

    return Array.from(candidates).map(value => ({
        value,
        cost: value === normalized ? 0 : 1
    }));
}

function scoreCandidate(mrz: string, layout: Layout): number {
    let score = 0;

    if (validateRange(mrz, layout.docNumber)) score += 30;
    if (validateRange(mrz, layout.birth)) score += 30;
    if (validateRange(mrz, layout.expiry)) score += 30;
    if (layout.optional && validateRange(mrz, layout.optional)) score += 10;
    if (layout.composite && validateComposite(mrz, layout.composite)) score += 10;
    if (mrz.includes('<<')) score += 2;
    if (/[PICAV]/.test(mrz[0] || '')) score += 2;

    return score;
}

function validateCandidate(mrz: string, layout: Layout): boolean {
    const required = validateRange(mrz, layout.docNumber)
        && validateRange(mrz, layout.birth)
        && validateRange(mrz, layout.expiry);

    if (!required) {
        return false;
    }

    if (layout.optional && !validateRange(mrz, layout.optional)) {
        return false;
    }

    if (layout.composite && !validateComposite(mrz, layout.composite)) {
        return false;
    }

    return true;
}

function validateRange(mrz: string, range: CheckRange): boolean {
    const data = mrz.slice(range.start, range.end);
    const expected = mrz[range.checkDigitIndex];
    return validateCheckDigit(data, expected);
}

function validateComposite(mrz: string, composite: NonNullable<Layout['composite']>): boolean {
    const data = composite.ranges.map(range => mrz.slice(range.start, range.end)).join('');
    return validateCheckDigit(data, mrz[composite.checkDigitIndex]);
}

function validateCheckDigit(data: string, expected: string): boolean {
    if (!/[0-9]/.test(expected)) {
        return false;
    }

    const weights = [7, 3, 1];
    let sum = 0;

    for (let index = 0; index < data.length; index += 1) {
        sum += charToValue(data[index]) * weights[index % 3];
    }

    return (sum % 10).toString() === expected;
}

function charToValue(char: string): number {
    if (char === '<') {
        return 0;
    }

    if (/[0-9]/.test(char)) {
        return Number(char);
    }

    return char.charCodeAt(0) - 55;
}

function parseBirthYear(mrz: string, layout: Layout): number {
    const rawYear = parseInt(mrz.slice(layout.birth.start, layout.birth.start + 2), 10);
    return rawYear <= 26 ? 2000 + rawYear : 1900 + rawYear;
}

function parseExpiryDate(mrz: string, layout: Layout): number {
    return parseInt(mrz.slice(layout.expiry.start, layout.expiry.end), 10);
}

function toCircuitMrz(mrz: string, layout: Layout): string {
    if (layout.totalLength === 90) {
        return mrz;
    }

    return mrz.padEnd(90, '<');
}

function splitLines(mrz: string, lineLength: number): string[] {
    const lines: string[] = [];

    for (let index = 0; index < mrz.length; index += lineLength) {
        lines.push(mrz.slice(index, index + lineLength));
    }

    return lines;
}

const DIGIT_REPAIRS: Record<string, string> = {
    O: '0',
    Q: '0',
    D: '0',
    I: '1',
    L: '1',
    Z: '2',
    S: '5',
    G: '6',
    B: '8'
};

const LETTER_REPAIRS: Record<string, string> = {
    '0': 'O',
    '1': 'I',
    '2': 'Z',
    '5': 'S',
    '6': 'G',
    '8': 'B'
};

const AMBIGUOUS_REPAIRS: Record<string, string[]> = {
    O: ['0'],
    '0': ['O'],
    Q: ['0'],
    D: ['0'],
    I: ['1'],
    L: ['1'],
    '1': ['I', 'L'],
    Z: ['2'],
    '2': ['Z'],
    S: ['5'],
    '5': ['S'],
    G: ['6'],
    '6': ['G'],
    B: ['8'],
    '8': ['B']
};
