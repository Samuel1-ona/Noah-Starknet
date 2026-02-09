import { Contract, Account, RpcProvider, Abi, uint256, CallData } from 'starknet';

export class NoahRegistry {
    private contract: Contract;
    private account?: Account;

    constructor(
        address: string,
        abi: Abi,
        provider: RpcProvider,
        account?: Account
    ) {
        console.log('[NoahRegistry] Initializing with:', {
            address,
            isAbiArray: Array.isArray(abi),
            abiLength: Array.isArray(abi) ? abi.length : 0
        });

        // Ensure abi is a clean array and use the object-based constructor for v9
        const cleanAbi = Array.isArray(abi) ? [...abi] : abi;

        this.contract = new Contract({
            abi: cleanAbi,
            address,
            providerOrAccount: account || provider
        });
        this.account = account;
    }

    /**
     * Verifies a credential on-chain
     * @param proof The Garaga proof calldata (Span<felt252>)
     * @param currentYear Current year as u256
     * @param currentMonth Current month as u256
     * @param currentDay Current day as u256
     * @param minAge Minimum age required as u256
     */
    async verifyCredential(
        proof: string[],
        currentYear: string | bigint | number,
        currentMonth: string | bigint | number,
        currentDay: string | bigint | number,
        minAge: string | bigint | number
    ) {
        if (!this.account) {
            throw new Error('Account is required for write operations');
        }

        console.log('[NoahRegistry] verifyCredential called with args:', {
            proof_len: proof.length,
            currentYear,
            currentMonth,
            currentDay,
            minAge
        });

        try {
            console.log('[NoahRegistry] Executing this.contract.verify_credential...');
            // Starknet.js v6 handles Cairo u256 if passed as BigInt.
            // Explicitly converting to BigInt ensures correct encoding.
            const res = await this.contract.verify_credential(
                proof,
                BigInt(currentYear),
                BigInt(currentMonth),
                BigInt(currentDay),
                BigInt(minAge)
            );
            console.log('[NoahRegistry] this.contract.verify_credential result:', res);
            return res;
        } catch (error: any) {
            console.error('[NoahRegistry] CRITICAL ERROR in verify_credential execute:', error);
            if (error && typeof error === 'object') {
                console.error('[NoahRegistry] Error details:', {
                    message: error.message,
                    name: error.name,
                    ...error
                });
            }
            throw error;
        }
    }

    /**
     * Adds a jurisdiction root (Admin only)
     */
    async addJurisdictionRoot(root: bigint | string) {
        if (!this.account) throw new Error('Account required');
        return await this.contract.add_jurisdiction_root(root);
    }

    /**
     * Adds a membership root (Admin only)
     */
    async addMembershipRoot(root: bigint | string) {
        if (!this.account) throw new Error('Account required');
        return await this.contract.add_membership_root(root);
    }
}
