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

        // Starknet.js handles u256 if passed as BigInt
        return await this.contract.verify_credential(
            proof,
            currentYear,
            currentMonth,
            currentDay,
            minAge
        );
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
