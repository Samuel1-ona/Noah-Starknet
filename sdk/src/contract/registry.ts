import { Contract, Account, RpcProvider, Abi, uint256, CallData } from 'starknet';

export class NoahRegistry {
    private contract: Contract;
    private readContract: Contract;
    private account?: Account;

    constructor(
        address: string,
        abi: Abi,
        provider: RpcProvider,
        account?: Account
    ) {
        // Ensure abi is a clean array and use the object-based constructor for v9
        const cleanAbi = Array.isArray(abi) ? [...abi] : abi;

        this.contract = new Contract({
            abi: cleanAbi,
            address,
            providerOrAccount: account || provider
        });

        // Create a separate contract instance for read-only calls using the provider directly.
        // This avoids issues where the wallet's provider (account) might be using a node 
        // with strict CORS policies (like blastapi) that block client-side calls.
        this.readContract = new Contract({
            abi: cleanAbi,
            address,
            providerOrAccount: provider
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

        try {
            const res = await this.contract.invoke(
                "verify_credential",
                [
                    proof,
                    BigInt(currentYear),
                    BigInt(currentMonth),
                    BigInt(currentDay),
                    BigInt(minAge)
                ],
                {
                    resourceBounds: {
                        l2_gas: { max_amount: BigInt('0x47000000'), max_price_per_unit: BigInt('0x500000000') },
                        l1_gas: { max_amount: BigInt('0x10000'), max_price_per_unit: BigInt('0x1000000000000') },
                        l1_data_gas: { max_amount: BigInt('0x1000'), max_price_per_unit: BigInt('0x10000000000') }
                    }
                }
            );
            return res;
        } catch (error: any) {
            console.error('[Noah] Transaction failed:', error?.message || error);
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

    /**
     * Checks if an address is already verified
     */
    async isAddressVerified(user: string): Promise<boolean> {
        try {
            const result = await this.readContract.is_address_verified(user);
            return Boolean(result);
        } catch (error: any) {
            console.error('[Noah] Error checking verification status:', error?.message || error);
            return false;
        }
    }
}
