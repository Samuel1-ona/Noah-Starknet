import { Contract, RpcProvider, Abi, AccountInterface } from 'starknet';
import { NoahVerificationPublicInputs } from '../circuit/prover.js';

export class NoahRegistry {
    private contract: Contract;
    private readContract: Contract;
    private provider: RpcProvider;
    private account?: AccountInterface;
    private adminAccount?: AccountInterface;
    private configuredVerifierAddress?: string;

    constructor(
        address: string,
        abi: Abi,
        provider: RpcProvider,
        account?: AccountInterface,
        adminAccount?: AccountInterface,
        configuredVerifierAddress?: string
    ) {
        // Ensure abi is a clean array and use the object-based constructor for v9
        const cleanAbi = Array.isArray(abi) ? [...abi] : abi;

        this.contract = new Contract({
            abi: cleanAbi,
            address,
            providerOrAccount: adminAccount || account || provider
        });

        // Create a separate contract instance for read-only calls using the provider directly.
        this.readContract = new Contract({
            abi: cleanAbi,
            address,
            providerOrAccount: provider
        });

        this.provider = provider;
        this.account = account;
        this.adminAccount = adminAccount;
        this.configuredVerifierAddress = configuredVerifierAddress;
    }

    /**
     * Verifies a credential on-chain.
     * Uses the adminAccount (sponsored) if available.
     * @param proof The Garaga proof calldata (Span<felt252>)
     * @param publicInputs The six public outputs emitted by the Noir circuit
     * @param targetUser The address to verify (usually this.account.address)
     */
    async verifyCredential(
        proof: string[],
        publicInputs: NoahVerificationPublicInputs,
        targetUser?: string
    ) {
        // If we have an admin account, it will sign and pay for the gas.
        // If not, we fall back to the user's account.
        const signer = this.adminAccount || this.account;
        
        if (!signer) {
            throw new Error('An account (User or Admin) is required for write operations');
        }

        // Use account address from config as target if not specified
        const userToVerify = targetUser || (this.account ? this.account.address : undefined);
        if (!userToVerify) {
            throw new Error('Target user address is required for verification');
        }

        try {
            const call = this.contract.populate("verify_credential", [
                userToVerify,
                proof,
                BigInt(publicInputs.passportRoot),
                BigInt(publicInputs.nullifier),
                BigInt(publicInputs.nameHash),
                BigInt(publicInputs.docNumHash),
                toU32(publicInputs.birthYear),
                toU32(publicInputs.expiryDate)
            ]);

            // @ts-ignore
            return await signer.execute(call);
        } catch (error: any) {
            console.error('[Noah] Verify Credential Failed:', error?.message || error);
            throw error;
        }
    }

    /**
     * Administrative: Role Management
     */
    async grantIssuerManager(account: string) {
        return this.executeAdminCall("grant_issuer_manager", [account]);
    }

    async revokeIssuerManager(account: string) {
        return this.executeAdminCall("revoke_issuer_manager", [account]);
    }

    async grantAdmin(account: string) {
        return this.executeAdminCall("grant_admin", [account]);
    }

    async revokeAdmin(account: string) {
        return this.executeAdminCall("revoke_admin", [account]);
    }

    /**
     * Administrative: Protocol State
     */
    async pause() {
        return this.executeAdminCall("pause", []);
    }

    async unpause() {
        return this.executeAdminCall("unpause", []);
    }

    async updateVerifier(newVerifier?: string) {
        const verifierToUse = newVerifier || this.configuredVerifierAddress;
        if (!verifierToUse) {
            throw new Error('Verifier address is required to call update_verifier');
        }

        return this.executeAdminCall("update_verifier", [verifierToUse]);
    }

    async revokeCredential(user: string) {
        return this.executeAdminCall("revoke_credential", [user]);
    }

    /**
     * Helper to execute administrative calls using the admin account
     */
    private async executeAdminCall(method: string, args: any[]) {
        if (!this.adminAccount) {
            throw new Error(`Admin account is required to call ${method}`);
        }
        const call = this.contract.populate(method, args);
        return await this.adminAccount.execute(call);
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

    /**
     * Gets the owner of a nullifier
     */
    async getNullifierOwner(nullifier: bigint | string): Promise<string> {
        return await this.readContract.get_nullifier_owner(nullifier);
    }

    async getVerifier(): Promise<string> {
        return await this.readContract.get_verifier();
    }

    async isPaused(): Promise<boolean> {
        const result = await this.readContract.is_paused();
        return Boolean(result);
    }
}

function toU32(value: string | bigint | number): number {
    const normalized = Number(BigInt(value));
    if (!Number.isInteger(normalized) || normalized < 0 || normalized > 0xffffffff) {
        throw new Error(`Invalid u32 value: ${value}`);
    }

    return normalized;
}
