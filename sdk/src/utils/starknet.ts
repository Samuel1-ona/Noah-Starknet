import { shortString } from 'starknet';
import { NOAH_DEFAULT_ADMIN_ROLE, NOAH_ISSUER_MANAGER_ROLE } from '../constants.js';

/**
 * Known contract error messages from Cairo contracts, mapped to user-friendly descriptions.
 */
const ERROR_MAPPINGS: Record<string, string> = {
    'User already verified': 'This address already has a valid verified credential.',
    'Invalid Proof': 'The ZK proof failed verification on-chain. This usually indicates a corrupted proof or mismatched public inputs.',
    'Document already used': 'This passport has already been used to verify a different address.',
    'Document expired': 'The passport provided is expired and cannot be used for verification.',
    'Paused': 'The system is temporarily paused for maintenance.',
    'Registry paused': 'The system is temporarily paused for maintenance.',
    'Root Mismatch': 'The proof\'s passport root does not match the on-chain registry.',
    'Nullifier Mismatch': 'The proof\'s nullifier does not match the inputs.',
    'NameHash Mismatch': 'The name hash in the proof does not match the inputs.',
    'DocNumHash Mismatch': 'The document number hash in the proof does not match the inputs.',
    'BirthYear Mismatch': 'The birth year in the proof does not match the inputs.',
    'Expiry Mismatch': 'The expiry date in the proof does not match the inputs.',
    'User failed global KYC': 'The user must complete the global verification process first.',
    'No credential': 'No active credential found for this address.',
    'Zero verifier': 'Invalid verifier address provided.',
    'Zero account': 'Invalid account address provided.',
    'Same verifier': 'The new verifier address is the same as the current one.',
    'Not paused': 'The registry is not currently paused.',
    'Not issuer': 'The account does not have the Issuer Manager role.',
    'Not admin': 'The account does not have the Admin role.',
    'Last admin': 'Cannot revoke the last remaining administrator.',
    'User does not have access': 'The user has not been granted access to this protocol.',
};

/**
 * Common role selectors mapped to their names.
 */
const ROLE_MAPPINGS: Record<string, string> = {
    [NOAH_DEFAULT_ADMIN_ROLE]: 'DEFAULT_ADMIN_ROLE',
    [NOAH_ISSUER_MANAGER_ROLE]: 'ISSUER_MANAGER_ROLE',
};

/**
 * Parses a Starknet error (contract revert, RPC failure, etc.) into a human-readable string.
 * @param error The raw error object or message
 * @returns A descriptive error message
 */
export function parseStarknetError(error: any): string {
    const rawMessage = extractRawErrorMessage(error);
    
    // 1. Try to find and decode hex short strings (common in Starknet reverts)
    const hexMatch = rawMessage.match(/0x[0-9a-fA-F]+/g);
    if (hexMatch) {
        for (const hex of hexMatch) {
            try {
                // Normalize hex for comparison
                const normalizedHex = BigInt(hex).toString(16);

                // Attempt to decode as a Cairo short string
                const decoded = shortString.decodeShortString(hex).trim();
                if (ERROR_MAPPINGS[decoded]) {
                    return ERROR_MAPPINGS[decoded];
                }
                
                // Special case for AccessControl: "Caller is missing role 0x..."
                if (rawMessage.toLowerCase().includes('missing role')) {
                    const foundRole = Object.entries(ROLE_MAPPINGS).find(([h, name]) => {
                        return h === hex || BigInt(h).toString(16) === normalizedHex;
                    });
                    
                    if (foundRole) {
                        return `Access Denied: Your account is missing the required role: ${foundRole[1]}.`;
                    }
                }
            } catch {
                // Not a valid short string, check if it's a known role hash directly
                const normalizedHex = BigInt(hex).toString(16);
                const foundRole = Object.entries(ROLE_MAPPINGS).find(([h, name]) => {
                    return h === hex || BigInt(h).toString(16) === normalizedHex;
                });

                if (foundRole && rawMessage.toLowerCase().includes('missing role')) {
                    return `Access Denied: Your account is missing the required role: ${foundRole[1]}.`;
                }
            }
        }
    }

    // 2. Try direct mapping of common short string patterns found in the message
    for (const [key, value] of Object.entries(ERROR_MAPPINGS)) {
        if (rawMessage.includes(key)) {
            return value;
        }
    }

    // 3. Clean up generic Starknet errors
    if (rawMessage.includes('Account validation failed')) {
        return 'Transaction signing failed. Please check your wallet and try again.';
    }
    
    if (rawMessage.includes('insufficient_fee') || rawMessage.includes('Insufficient max fee')) {
        return 'Insufficient funds for gas fees.';
    }

    // 4. Fallback to the cleanest version of the raw message
    return rawMessage;
}

function extractRawErrorMessage(error: any): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        // Prioritize detailed revert/execution errors over generic messages
        const detailedMsg = (error.data && (error.data.revert_error || error.data.execution_error));
        if (detailedMsg && typeof detailedMsg === 'string') return detailedMsg;

        const msg = error.message || error.details || error.code || JSON.stringify(error);
        return typeof msg === 'string' ? msg : JSON.stringify(msg);
    }
    return 'Unknown contract error';
}
