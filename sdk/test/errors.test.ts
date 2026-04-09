import { describe, it, expect } from 'vitest';
import { parseStarknetError } from '../src/utils/starknet';
import { shortString } from 'starknet';
import { NOAH_ISSUER_MANAGER_ROLE } from '../src/constants';

describe('Starknet Error Parsing', () => {
    it('decodes hex-encoded Cairo short strings', () => {
        const errorMessage = 'Execution failed. [Reason: ' + shortString.encodeShortString('Document already used') + ']';
        const parsed = parseStarknetError(errorMessage);
        expect(parsed).toBe('This passport has already been used to verify a different address.');
    });

    it('decodes role-missing errors with known role hashes', () => {
        const errorMessage = `An error occurred: Caller is missing role ${NOAH_ISSUER_MANAGER_ROLE}`;
        const parsed = parseStarknetError(errorMessage);
        expect(parsed).toContain('ISSUER_MANAGER_ROLE');
    });

    it('maps literal error strings found in messages', () => {
        const errorMessage = 'Something went wrong: Root Mismatch';
        const parsed = parseStarknetError(errorMessage);
        expect(parsed).toBe("The proof's passport root does not match the on-chain registry.");
    });

    it('handles generic Starknet.js error objects', () => {
        const errorObj = {
            message: 'Transaction failed',
            data: {
                revert_error: shortString.encodeShortString('User already verified')
            }
        };
        const parsed = parseStarknetError(errorObj);
        expect(parsed).toBe('This address already has a valid verified credential.');
    });

    it('provides a clean fallback for unknown errors', () => {
        const errorMessage = 'Some weird network error';
        const parsed = parseStarknetError(errorMessage);
        expect(parsed).toBe('Some weird network error');
    });

    it('handles fee-related errors', () => {
        const errorMessage = 'insufficient_fee: max_fee is too low';
        const parsed = parseStarknetError(errorMessage);
        expect(parsed).toBe('Insufficient funds for gas fees.');
    });
});
