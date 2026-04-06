import { describe, expect, it } from 'vitest';
import { NoahDocumentType, NoahMRZScanner } from '../src/data/mrz';
import { NoahNFCParser } from '../src/data/nfc';

const TD3_SAMPLE =
    'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<<10';
const TD1_SAMPLE =
    'I<UTOD231458907<<<<<<<<<<<<<<<6408125F1204159UTO<<<<<<<<<<<2ERIKSSON<<ANNA<MARIA<<<<<<<<<<';
const TD2_SAMPLE =
    'I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<D231458907UTO6408125F1204159<<<<<<<2';

describe('NoahMRZScanner', () => {
    it('normalizes a TD3 document and pads it for the circuit', () => {
        const document = NoahMRZScanner.normalizeDocument(TD3_SAMPLE, NoahDocumentType.TD3);

        expect(document.docType).toBe(NoahDocumentType.TD3);
        expect(document.mrz).toHaveLength(88);
        expect(document.circuitMrz).toHaveLength(90);
        expect(document.birthYear).toBe(1974);
        expect(document.expiryDate).toBe(120415);
    });

    it('normalizes a TD1 document', () => {
        const document = NoahMRZScanner.normalizeDocument(TD1_SAMPLE, NoahDocumentType.TD1);

        expect(document.docType).toBe(NoahDocumentType.TD1);
        expect(document.mrz).toHaveLength(90);
        expect(document.lines).toHaveLength(3);
        expect(document.birthYear).toBe(1964);
        expect(document.expiryDate).toBe(120415);
    });

    it('normalizes a TD2 document and pads it for the circuit', () => {
        const document = NoahMRZScanner.normalizeDocument(TD2_SAMPLE, NoahDocumentType.TD2);

        expect(document.docType).toBe(NoahDocumentType.TD2);
        expect(document.mrz).toHaveLength(72);
        expect(document.circuitMrz).toHaveLength(90);
        expect(document.birthYear).toBe(1964);
        expect(document.expiryDate).toBe(120415);
    });

    it('repairs common OCR confusions before validating check digits', () => {
        const noisyTd3 =
            'P<UT0ERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L8989O2C36UTO74O8I22F1204159ZE184226B<<<<<10';

        const document = NoahMRZScanner.normalizeDocument(noisyTd3, NoahDocumentType.TD3);

        expect(document.mrz).toBe(TD3_SAMPLE);
    });
});

describe('NoahNFCParser', () => {
    it('builds prover inputs that match the current circuit shape', () => {
        const inputs = NoahNFCParser.createProverInputs(
            {
                mrz: TD2_SAMPLE,
                docType: NoahDocumentType.TD2
            },
            {
                passportRoot: '1234',
                merklePath: Array.from({ length: 20 }, (_, index) => `${index + 1}`),
                isLeft: Array.from({ length: 20 }, (_, index) => index % 2 === 0),
                nullifier: '55',
                nameHash: '66',
                docNumHash: '77',
                userSecret: '88'
            }
        );

        expect(inputs.doc_type).toBe(NoahDocumentType.TD2);
        expect(inputs.mrz).toHaveLength(90);
        expect(inputs.merkle_path).toHaveLength(20);
        expect(inputs.is_left).toHaveLength(20);
        expect(inputs.birth_year).toBe(BigInt(1964));
        expect(inputs.expiry_date).toBe(BigInt(120415));
    });
});
