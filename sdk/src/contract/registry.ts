import { Contract, RpcProvider, Abi, AccountInterface } from 'starknet';
import { NoahVerificationPublicInputs } from '../circuit/prover.js';
import { parseStarknetError } from '../utils/starknet.js';
import { NoahContractRevertError } from '../utils/errors.js';

export class NoahRegistry {
    private contract: Contract;
    private readContract: Contract;
    private account?: AccountInterface;
    private issuerManagerAccount?: AccountInterface;
    private configuredVerifierAddress?: string;

    constructor(
        address: string,
        abi: Abi,
        provider: RpcProvider,
        account?: AccountInterface,
        issuerManagerAccount?: AccountInterface,
        configuredVerifierAddress?: string
    ) {
        // Ensure abi is a clean array and use the object-based constructor for v9
        const cleanAbi = Array.isArray(abi) ? [...abi] : abi;

        this.contract = new Contract({
            abi: cleanAbi,
            address,
            providerOrAccount: issuerManagerAccount || provider
        });

        // Create a separate contract instance for read-only calls using the provider directly.
        this.readContract = new Contract({
            abi: cleanAbi,
            address,
            providerOrAccount: provider
        });

        this.account = account;
        this.issuerManagerAccount = issuerManagerAccount;
        this.configuredVerifierAddress = configuredVerifierAddress;
    }

    /**
     * Verifies a credential on-chain.
     * This write is role-gated on-chain and must be signed by an issuer manager.
     * @param proof The Garaga proof calldata (Span<felt252>)
     * @param publicInputs The six public outputs emitted by the Noir circuit
     * @param targetUser The address to verify
     */
    async verifyCredential(
        proof: string[],
        publicInputs: NoahVerificationPublicInputs,
        targetUser?: string
    ) {
        if (!this.issuerManagerAccount) {
            throw new Error(
                'verify_credential requires an issuer manager signer. Configure issuerManagerAddress/issuerManagerPrivateKey or NOAH_ISSUER_MANAGER_ADDRESS/NOAH_ISSUER_MANAGER_PRIVATE_KEY.'
            );
        }

        const userToVerify = targetUser || (this.account ? this.account.address : undefined);
        if (!userToVerify) {
            throw new Error('Target user address is required for verification');
        }

        try {
            const call = this.contract.populate("verify_credential", [
                userToVerify,
                proof,
                toU256(publicInputs.passportRoot),
                toU256(publicInputs.nullifier),
                toU256(publicInputs.nameHash),
                toU256(publicInputs.docNumHash),
                toU32(publicInputs.birthYear),
                toU32(publicInputs.expiryDate)
            ]);

            // @ts-ignore
            return await this.issuerManagerAccount.execute(call);
        } catch (error: any) {
            const friendlyMessage = parseStarknetError(error);
            console.error('[Noah] Verify Credential Failed:', friendlyMessage, error);
            throw new NoahContractRevertError(friendlyMessage, error);
        }
    }

    /**
     * Administrative: Role Management
     */
    async grantIssuerManager(account: string) {
        return this.executePrivilegedCall("grant_issuer_manager", [account]);
    }

    async revokeIssuerManager(account: string) {
        return this.executePrivilegedCall("revoke_issuer_manager", [account]);
    }

    async grantAdmin(account: string) {
        return this.executePrivilegedCall("grant_admin", [account]);
    }

    async revokeAdmin(account: string) {
        return this.executePrivilegedCall("revoke_admin", [account]);
    }

    /**
     * Administrative: Protocol State
     */
    async pause() {
        return this.executePrivilegedCall("pause", []);
    }

    async unpause() {
        return this.executePrivilegedCall("unpause", []);
    }

    async updateVerifier(newVerifier?: string) {
        const verifierToUse = newVerifier || this.configuredVerifierAddress;
        if (!verifierToUse) {
            throw new Error('Verifier address is required to call update_verifier');
        }

        return this.executePrivilegedCall("update_verifier", [verifierToUse]);
    }

    async revokeCredential(user: string) {
        return this.executePrivilegedCall("revoke_credential", [user]);
    }

    /**
     * Helper to execute privileged calls using the issuer-manager signer.
     */
    private async executePrivilegedCall(method: string, args: any[]) {
        if (!this.issuerManagerAccount) {
            throw new Error(`Issuer manager signer is required to call ${method}`);
        }
        try {
            const call = this.contract.populate(method, args);
            return await this.issuerManagerAccount.execute(call);
        } catch (error: any) {
            const friendlyMessage = parseStarknetError(error);
            console.error(`[Noah] Privileged call failed (${method}):`, friendlyMessage, error);
            throw new NoahContractRevertError(friendlyMessage, error);
        }
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

function toU256(value: string | bigint | number): { low: string, high: string } {
    const bn = BigInt(value);
    const low = bn & ((1n << 128n) - 1n);
    const high = bn >> 128n;
    return {
        low: `0x${low.toString(16)}`,
        high: `0x${high.toString(16)}`
    };
}
