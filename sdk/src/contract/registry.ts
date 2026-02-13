import { Contract, Account, RpcProvider, Abi, uint256, CallData } from 'starknet';

export class NoahRegistry {
    private contract: Contract;
    private readContract: Contract;
    private provider: RpcProvider;
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

        this.provider = provider;
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

        console.log('[Noah] Verifying credential...');

        try {
            const call = this.contract.populate("verify_credential", [
                proof,
                BigInt(currentYear),
                BigInt(currentMonth),
                BigInt(currentDay),
                BigInt(minAge)
            ]);

            let feeDetails: any = undefined;

            try {
                // Try standard estimation (handles healthy RPCs)
                await (this.account as any).estimateFee(call);
            } catch (e) {
                // Fallback for network/CORS issues: fetch nonce manually and use zero fee
                try {
                    const nonce = await this.provider.getNonceForAddress(this.account.address).catch(err => {
                        if (err.message.toLowerCase().includes('contract not found')) return BigInt(0);
                        throw err;
                    });
                    feeDetails = { maxFee: 0, nonce };
                } catch (nonceErr) {
                    feeDetails = { maxFee: 0 };
                }
            }

            // @ts-ignore
            return await (this.account).execute(call, undefined, feeDetails);
        } catch (error: any) {
            console.error('[Noah] Verify Credential Failed:', error?.message || error);
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
