import { afterAll, describe, expect, it } from 'vitest';
import { Barretenberg } from '@aztec/bb.js';
import { NoahDocumentType, NoahMRZScanner } from '../src/data/mrz';
import { NoahNFCParser } from '../src/data/nfc';
import { derivePublicInputs, prepareProverInputs } from '../src/circuit/inputs';

const TD3_SAMPLE =
    'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<<10';
const TD1_SAMPLE =
    'I<UTOD231458907<<<<<<<<<<<<<<<6408125F1204159UTO<<<<<<<<<<<2ERIKSSON<<ANNA<MARIA<<<<<<<<<<';
const TD2_SAMPLE =
    'I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<D231458907UTO6408125F1204159<<<<<<<2';

afterAll(async () => {
    await Barretenberg.destroySingleton();
});

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

describe('prepareProverInputs', () => {
    it('derives the public signals expected by the current TD3 circuit', async () => {
        const document = NoahMRZScanner.normalizeDocument(TD3_SAMPLE, NoahDocumentType.TD3);
        const options = {
            merklePath: Array.from({ length: 20 }, () => '0'),
            isLeft: Array.from({ length: 20 }, () => false),
            userSecret: '0'
        };

        const publicInputs = await derivePublicInputs(document, options);
        const inputs = await prepareProverInputs(document, options);

        expect(publicInputs).toMatchObject({
            passportRoot: '0x0bed2e5e2b712311da2c01058d69555d3ac3952801164cbb934d67bf78440d7b',
            nullifier: '0x014e80702291cd67ce006ba5d0b87e684d5c60672b16141931467916b39ac37b',
            nameHash: '0x0e1cdb47b5f1a2bc364c96660017ef77b88daabb0167b8b0f9341b96cf3cf169',
            docNumHash: '0x2eacd6dd87aed021537654eca1c04c8d1f36f9b7578fb85a03c426a2159ca2e8',
            birthYear: BigInt(1974),
            expiryDate: BigInt(120415)
        });

        expect(inputs).toMatchObject({
            doc_type: NoahDocumentType.TD3,
            user_secret: '0',
            passport_root: publicInputs.passportRoot,
            nullifier: publicInputs.nullifier,
            name_hash: publicInputs.nameHash,
            doc_num_hash: publicInputs.docNumHash,
            birth_year: BigInt(1974),
            expiry_date: BigInt(120415)
        });
        expect(inputs.mrz).toHaveLength(90);
        expect(inputs.merkle_path).toHaveLength(20);
        expect(inputs.is_left).toHaveLength(20);
    });
});
